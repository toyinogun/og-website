import { describe, expect, it, vi } from 'vitest';
import type { ContactEnv, OutgoingEmail, OutboxStore } from './contact';
import type { VerifyResult } from './turnstile';
import { handleScheduled, PROBE_TOKEN, type WeeklyDeps } from './weekly';

const NOW = new Date('2026-10-19T08:00:00.000Z');
const WORKING: VerifyResult = {
	kind: 'rejected',
	reason: 'token_rejected',
	body: { success: false, 'error-codes': ['invalid-input-response'] },
};

const key = (receivedAt: string, emailStatus: string, name = 'Ada') => ({
	name: `msg:${receivedAt}:u`,
	metadata: { receivedAt, topic: 'role', name, emailStatus },
});

const setup = (
	options: {
		readonly env?: Partial<ContactEnv>;
		readonly verify?: VerifyResult | 'throws';
		readonly pages?: readonly { keys: ReturnType<typeof key>[]; cursor?: string }[] | 'throws';
		readonly sendFails?: boolean;
		readonly pingStatus?: number | 'throws';
	} = {},
) => {
	const sends: OutgoingEmail[] = [];
	const pings: string[] = [];
	const logs: { line: Readonly<Record<string, unknown>>; level: string }[] = [];
	const listCalls: unknown[] = [];
	const pages = options.pages ?? [{ keys: [] }];
	const outbox: OutboxStore = {
		put: async () => undefined,
		list: async (listOptions) => {
			listCalls.push(listOptions);
			if (pages === 'throws') throw new Error('kv down');
			const index = listOptions.cursor ? Number(listOptions.cursor) : 0;
			const page = pages[index];
			return { keys: page.keys, list_complete: page.cursor === undefined, cursor: page.cursor };
		},
	};
	const env: ContactEnv = {
		EMAIL: {
			send: async (message) => {
				sends.push(message);
				if (options.sendFails) throw new Error('send failed');
			},
		},
		CONTACT_OUTBOX: outbox,
		CONTACT_TO: 'you@example.com',
		TURNSTILE_SECRET_KEY: 'secret',
		TURNSTILE_EXPECTED_HOSTNAME: 'toyintest.org',
		HEALTHCHECK_URL: 'https://hc-ping.com/check',
		...options.env,
	};
	const verifyTurnstile = vi.fn(async () => {
		if (options.verify === 'throws') throw new Error('boom');
		return options.verify ?? WORKING;
	});
	const deps: WeeklyDeps = {
		verifyTurnstile,
		now: () => NOW,
		ping: async (url) => {
			pings.push(url);
			if (options.pingStatus === 'throws') throw new Error('offline');
			return new Response(null, { status: options.pingStatus ?? 200 });
		},
		log: (line, level) => logs.push({ line, level }),
	};
	return { env, deps, sends, pings, logs, listCalls, verifyTurnstile };
};

describe('handleScheduled', () => {
	// covers: AC-21
	it('probes the secret, emails the week, pings success and logs one fine line', async () => {
		const fakes = setup({
			pages: [
				{
					keys: [
						key('2026-10-15T10:00:00.000Z', 'sent'),
						key('2026-10-01T10:00:00.000Z', 'sent', 'Old'),
					],
				},
			],
		});
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.verifyTurnstile).toHaveBeenCalledWith({
			secret: 'secret',
			token: PROBE_TOKEN,
			expectedHostname: 'toyintest.org',
			expectedAction: 'contact',
		});
		expect(fakes.listCalls).toEqual([{ prefix: 'msg:' }]);
		expect(fakes.sends).toHaveLength(1);
		expect(fakes.sends[0]).toMatchObject({
			from: { email: 'form@toyintest.org', name: 'Contact form' },
			to: 'you@example.com',
			subject: '[toyintest.org] Weekly contact form check',
		});
		expect(fakes.sends[0].text).toContain('2026-10-15T10:00:00.000Z · A role · Ada · email sent');
		expect(fakes.sends[0].text).not.toContain('Old');
		expect(fakes.pings).toEqual(['https://hc-ping.com/check']);
		expect(fakes.logs).toEqual([
			{
				line: {
					event: 'weekly_check',
					email: 'sent',
					turnstile: 'ok',
					messages: 1,
					healthcheck: 'pinged',
				},
				level: 'log',
			},
		]);
	});

	// covers: AC-21
	it('follows the list cursor to the end and lists oldest first', async () => {
		const fakes = setup({
			pages: [
				{ keys: [key('2026-10-17T10:00:00.000Z', 'sent', 'Second')], cursor: '1' },
				{ keys: [key('2026-10-13T10:00:00.000Z', 'sent', 'First')] },
			],
		});
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.listCalls).toEqual([{ prefix: 'msg:' }, { prefix: 'msg:', cursor: '1' }]);
		const text = fakes.sends[0].text;
		expect(text.indexOf('First')).toBeLessThan(text.indexOf('Second'));
		expect(fakes.logs[0].line.messages).toBe(2);
	});

	// covers: AC-21
	it('still pings success when a message failed, but names it in the email', async () => {
		const fakes = setup({ pages: [{ keys: [key('2026-10-15T10:00:00.000Z', 'failed')] }] });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.sends[0].text).toContain('1 message(s) may not be in your inbox');
		expect(fakes.sends[0].text).toContain('- msg:2026-10-15T10:00:00.000Z:u');
		expect(fakes.pings).toEqual(['https://hc-ping.com/check']);
	});

	// covers: AC-21
	it('lists a key with broken metadata as pending, from the time in its key', async () => {
		const fakes = setup({
			pages: [{ keys: [{ name: 'msg:2026-10-16T10:00:00.000Z:u', metadata: undefined as never }] }],
		});
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.sends[0].text).toContain(
			'2026-10-16T10:00:00.000Z · Something else · (no name recorded) · email pending',
		);
	});

	// covers: AC-21
	it.each([
		[
			'a rejected secret',
			{
				kind: 'secret_rejected',
				body: { success: false, 'error-codes': ['invalid-input-secret'] },
			},
			'secret_rejected',
		],
		['an unreachable siteverify', { kind: 'unreachable' }, 'unreachable'],
		[
			'an internal error',
			{ kind: 'unreachable', body: { success: false, 'error-codes': ['internal-error'] } },
			'unknown',
		],
		['a passing token', { kind: 'ok', body: { success: true, 'error-codes': [] } }, 'unknown'],
		['a probe that throws', 'throws', 'unreachable'],
	] as const)('pings failure and logs an error for %s', async (_label, verify, state) => {
		const fakes = setup({ verify: verify as VerifyResult | 'throws' });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.sends).toHaveLength(1);
		expect(fakes.pings).toEqual(['https://hc-ping.com/check/fail']);
		expect(fakes.logs[0]).toEqual({
			line: {
				event: 'weekly_check',
				email: 'sent',
				turnstile: state,
				messages: 0,
				healthcheck: 'pinged',
			},
			level: 'error',
		});
	});

	// covers: AC-21
	it('reports a missing secret without probing', async () => {
		const fakes = setup({ env: { TURNSTILE_SECRET_KEY: undefined } });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.verifyTurnstile).not.toHaveBeenCalled();
		expect(fakes.sends[0].text).toContain('Turnstile secret: NOT SET');
		expect(fakes.pings).toEqual(['https://hc-ping.com/check/fail']);
		expect(fakes.logs[0].line.turnstile).toBe('secret_missing');
	});

	// covers: AC-21
	it('still emails and pings success when the outbox cannot be read, but logs an error', async () => {
		const fakes = setup({ pages: 'throws' });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.sends[0].text).toContain('could not be read');
		expect(fakes.pings).toEqual(['https://hc-ping.com/check']);
		expect(fakes.logs[0]).toEqual({
			line: {
				event: 'weekly_check',
				email: 'sent',
				turnstile: 'ok',
				messages: 'unreadable',
				healthcheck: 'pinged',
			},
			level: 'error',
		});
	});

	// covers: AC-21
	it('pings failure when the email fails', async () => {
		const fakes = setup({ sendFails: true });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.pings).toEqual(['https://hc-ping.com/check/fail']);
		expect(fakes.logs[0]).toEqual({
			line: {
				event: 'weekly_check',
				email: 'failed',
				turnstile: 'ok',
				messages: 0,
				healthcheck: 'pinged',
			},
			level: 'error',
		});
	});

	// covers: AC-21
	it('treats a missing inbox secret as a failed email', async () => {
		const fakes = setup({ env: { CONTACT_TO: undefined } });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.sends).toEqual([]);
		expect(fakes.pings).toEqual(['https://hc-ping.com/check/fail']);
		expect(fakes.logs[0].line.email).toBe('failed');
	});

	// covers: AC-21
	it('logs healthcheck missing when there is no HEALTHCHECK_URL', async () => {
		const fakes = setup({ env: { HEALTHCHECK_URL: undefined } });
		await handleScheduled(fakes.env, fakes.deps);

		expect(fakes.pings).toEqual([]);
		expect(fakes.logs[0]).toEqual({
			line: {
				event: 'weekly_check',
				email: 'sent',
				turnstile: 'ok',
				messages: 0,
				healthcheck: 'missing',
			},
			level: 'error',
		});
	});

	// covers: AC-21
	it.each([[500], ['throws']] as const)(
		'logs healthcheck failed when the ping gets %s',
		async (pingStatus) => {
			const fakes = setup({ pingStatus });
			await handleScheduled(fakes.env, fakes.deps);

			expect(fakes.logs[0].line.healthcheck).toBe('failed');
			expect(fakes.logs[0].level).toBe('error');
		},
	);

	// covers: AC-21
	it('never throws when the email, the probe and the ping throw before returning a promise', async () => {
		const fakes = setup();
		const env: ContactEnv = {
			...fakes.env,
			EMAIL: {
				send: () => {
					throw new TypeError('send is not supported here');
				},
			},
		};
		const deps: WeeklyDeps = {
			...fakes.deps,
			verifyTurnstile: () => {
				throw new TypeError('no fetch');
			},
			ping: () => {
				throw new TypeError('no fetch');
			},
		};
		await handleScheduled(env, deps);

		expect(fakes.logs).toEqual([
			{
				line: {
					event: 'weekly_check',
					email: 'failed',
					turnstile: 'unreachable',
					messages: 0,
					healthcheck: 'failed',
				},
				level: 'error',
			},
		]);
	});

	// covers: AC-18, AC-21
	it('logs no names, emails or secrets', async () => {
		const fakes = setup({
			pages: [{ keys: [key('2026-10-15T10:00:00.000Z', 'sent', 'Zoë Secret')] }],
		});
		await handleScheduled(fakes.env, fakes.deps);

		const logged = JSON.stringify(fakes.logs);
		for (const value of ['Zoë', 'you@example.com', 'secret', 'hc-ping'])
			expect(logged).not.toContain(value);
	});
});
