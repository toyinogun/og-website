import { describe, expect, it, vi } from 'vitest';
import { CONTACT_LIMITS } from '../src/lib/contact';
import {
	EXITS,
	FORM_SENDER,
	handleContact,
	type ContactDeps,
	type ContactEnv,
	type OutgoingEmail,
} from './contact';
import type { VerifyResult } from './turnstile';

const NOW = new Date('2026-10-14T09:30:00.000Z');
const KEY = 'msg:2026-10-14T09:30:00.000Z:uuid-1';
const IP = '203.0.113.7';

const FIELDS = {
	name: 'Zoë "Zee" O’Brien, Jr.',
	email: 'zee@example.com',
	topic: 'project',
	message: 'Hello,\nI have a project for you.\n\tThanks',
	'cf-turnstile-response': 'token-123',
} as const;

interface Put {
	readonly key: string;
	readonly value: string;
	readonly options: { readonly expirationTtl: number; readonly metadata: unknown };
}

/** Fake bindings and deps that record every call. */
const setup = (
	options: {
		readonly env?: Partial<ContactEnv>;
		readonly verify?: VerifyResult;
		readonly putFails?: readonly boolean[];
		readonly sendFails?: boolean;
		readonly limit?: () => Promise<{ success: boolean }>;
	} = {},
) => {
	const puts: Put[] = [];
	const sends: OutgoingEmail[] = [];
	const logs: { line: Readonly<Record<string, unknown>>; level: string }[] = [];
	const limits: string[] = [];
	const putFails = [...(options.putFails ?? [])];
	const env: ContactEnv = {
		EMAIL: {
			send: async (message) => {
				sends.push(message);
				if (options.sendFails) throw new Error('send failed for zee@example.com');
				return { messageId: 'm-1' };
			},
		},
		CONTACT_LIMITER: {
			limit: async ({ key }) => {
				limits.push(key);
				return options.limit ? options.limit() : { success: true };
			},
		},
		CONTACT_OUTBOX: {
			put: async (key, value, putOptions) => {
				puts.push({ key, value, options: putOptions });
				if (putFails.shift()) throw new Error('kv down');
			},
			list: async () => ({ keys: [], list_complete: true }),
		},
		CONTACT_TO: 'you@example.com',
		TURNSTILE_SECRET_KEY: 'secret',
		TURNSTILE_EXPECTED_HOSTNAME: 'toyintest.org',
		ALLOWED_ORIGINS: 'https://toyintest.org',
		HEALTHCHECK_URL: 'https://hc-ping.com/x',
		...options.env,
	};
	const verifyTurnstile = vi.fn(async () => options.verify ?? ({ kind: 'ok', body: {} } as const));
	const alarm = vi.fn();
	const deps: ContactDeps = {
		verifyTurnstile,
		now: () => NOW,
		uuid: () => 'uuid-1',
		log: (line, level) => logs.push({ line, level }),
		alarm,
	};
	return { env, deps, puts, sends, logs, limits, verifyTurnstile, alarm };
};

const post = (
	body: BodyInit | null = new URLSearchParams(FIELDS),
	headers: Record<string, string> = {},
	path = '/api/contact',
) =>
	new Request(`https://toyintest.org${path}`, {
		method: 'POST',
		body,
		headers: { Origin: 'https://toyintest.org', 'CF-Connecting-IP': IP, ...headers },
	});

const send = async (request: Request, setupResult: ReturnType<typeof setup>) => {
	const response = await handleContact(request, setupResult.env, setupResult.deps);
	const text = await response.text();
	return { response, body: text === '' ? null : JSON.parse(text) };
};

describe('handleContact, the happy path', () => {
	// covers: AC-12, AC-13, AC-14, AC-18
	it('saves the copy, sends the email, marks the copy sent, and answers 200', async () => {
		const fakes = setup();
		const { response, body } = await send(post(), fakes);

		expect(response.status).toBe(200);
		expect(body).toEqual({ ok: true });
		expect(fakes.puts.map((put) => JSON.parse(put.value).emailStatus)).toEqual(['pending', 'sent']);
		expect(fakes.sends).toHaveLength(1);
		expect(fakes.logs).toEqual([
			{ line: { event: 'contact', outcome: 'sent', reason: null }, level: 'log' },
		]);
		expect(fakes.alarm).not.toHaveBeenCalled();
	});

	// covers: AC-12
	it('stores the record under a time sorted key for 30 days, with its metadata', async () => {
		const fakes = setup();
		await send(post(), fakes);

		const [first] = fakes.puts;
		expect(first.key).toBe(KEY);
		expect(first.options.expirationTtl).toBe(2592000);
		expect(JSON.parse(first.value)).toEqual({
			receivedAt: '2026-10-14T09:30:00.000Z',
			topic: 'project',
			name: FIELDS.name,
			email: FIELDS.email,
			message: FIELDS.message,
			emailStatus: 'pending',
		});
		expect(first.options.metadata).toEqual({
			receivedAt: '2026-10-14T09:30:00.000Z',
			topic: 'project',
			name: FIELDS.name,
			emailStatus: 'pending',
		});
		expect(fakes.puts[1].key).toBe(KEY);
		expect(fakes.puts[1].options.expirationTtl).toBe(2592000);
	});

	// covers: AC-13
	it('hands the Email Service the exact structured message', async () => {
		const fakes = setup();
		await send(post(), fakes);

		expect(fakes.sends[0]).toEqual({
			from: { email: 'form@toyintest.org', name: 'Contact form' },
			to: 'you@example.com',
			replyTo: { email: FIELDS.email, name: FIELDS.name },
			subject: `[toyintest.org] A project or contract: ${FIELDS.name}`,
			text: [
				'Topic: A project or contract',
				`Name: ${FIELDS.name}`,
				`Email: ${FIELDS.email}`,
				'Received: 2026-10-14T09:30:00.000Z',
				`Reference: ${KEY}`,
				'',
				FIELDS.message,
			].join('\n'),
		});
		expect(FORM_SENDER).toEqual({ email: 'form@toyintest.org', name: 'Contact form' });
	});

	// covers: AC-13
	it('trims what was typed before storing and sending', async () => {
		const fakes = setup();
		await send(
			post(new URLSearchParams({ ...FIELDS, name: '  Ada  ', message: '  Hello there friend  ' })),
			fakes,
		);

		expect(fakes.sends[0].replyTo).toEqual({ email: FIELDS.email, name: 'Ada' });
		expect(fakes.sends[0].text.endsWith('\n\nHello there friend')).toBe(true);
	});

	// covers: AC-17
	it('accepts multipart form data, as the browser sends it', async () => {
		const form = new FormData();
		Object.entries(FIELDS).forEach(([key, value]) => form.append(key, value));
		const fakes = setup();

		expect((await send(post(form), fakes)).response.status).toBe(200);
		expect(fakes.sends[0].replyTo?.name).toBe(FIELDS.name);
	});

	// covers: AC-15
	it('answers JSON that is never cached', async () => {
		const { response } = await send(post(), setup());

		expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
		expect(response.headers.get('Cache-Control')).toBe('no-store');
	});

	// covers: AC-10
	it('checks the token with the secret, the IP, the hostname and the action', async () => {
		const fakes = setup();
		await send(post(), fakes);

		expect(fakes.verifyTurnstile).toHaveBeenCalledWith({
			secret: 'secret',
			token: 'token-123',
			remoteip: IP,
			expectedHostname: 'toyintest.org',
			expectedAction: 'contact',
		});
	});

	// covers: AC-10
	it('leaves remoteip out when there is no CF-Connecting-IP', async () => {
		const fakes = setup();
		const request = new Request('https://toyintest.org/api/contact', {
			method: 'POST',
			body: new URLSearchParams(FIELDS),
		});
		await send(request, fakes);

		expect(fakes.verifyTurnstile.mock.calls[0]).toEqual([
			expect.not.objectContaining({ remoteip: expect.anything() }),
		]);
	});
});

describe('handleContact, delivery outcomes', () => {
	// covers: AC-14, AC-21
	it('answers 200 stored_only with the alarm when the email fails but the copy is saved', async () => {
		const fakes = setup({ sendFails: true });
		const { response, body } = await send(post(), fakes);

		expect(response.status).toBe(200);
		expect(body).toEqual({ ok: true });
		expect(JSON.parse(fakes.puts[1].value).emailStatus).toBe('failed');
		expect(fakes.logs).toEqual([
			{
				line: { event: 'contact', outcome: 'stored_only', reason: 'email_failed' },
				level: 'error',
			},
		]);
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-13, AC-14, AC-21
	it('answers 200 with the alarm when the copy fails but the email is sent, saying "not saved"', async () => {
		const fakes = setup({ putFails: [true] });
		const { response } = await send(post(), fakes);

		expect(response.status).toBe(200);
		expect(fakes.puts).toHaveLength(1);
		expect(fakes.sends[0].text).toContain('\nReference: not saved\n');
		expect(fakes.logs[0]).toEqual({
			line: { event: 'contact', outcome: 'sent', reason: 'outbox_failed' },
			level: 'error',
		});
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-14, AC-18, AC-21
	it('answers 502 delivery with the alarm when both fail', async () => {
		const fakes = setup({ putFails: [true], sendFails: true });
		const { response, body } = await send(post(), fakes);

		expect(response.status).toBe(502);
		expect(body).toEqual({ ok: false, error: 'delivery' });
		expect(fakes.logs).toEqual([
			{
				line: { event: 'contact', outcome: 'delivery_failed', reason: 'email_and_outbox_failed' },
				level: 'error',
			},
		]);
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-12
	it('logs a failed status update and still answers sent', async () => {
		const fakes = setup({ putFails: [false, true] });
		const { response } = await send(post(), fakes);

		expect(response.status).toBe(200);
		expect(fakes.logs).toEqual([
			{ line: { event: 'contact_outbox_update', ok: false }, level: 'error' },
			{ line: { event: 'contact', outcome: 'sent', reason: null }, level: 'log' },
		]);
		expect(fakes.alarm).not.toHaveBeenCalled();
	});

	// covers: AC-12, AC-14
	it('treats a send that throws before returning a promise as a failed email', async () => {
		const fakes = setup();
		const env: ContactEnv = {
			...fakes.env,
			EMAIL: {
				send: () => {
					throw new TypeError('send is not supported here');
				},
			},
		};
		const response = await handleContact(post(), env, fakes.deps);

		expect(response.status).toBe(200);
		expect(JSON.parse(fakes.puts[1].value).emailStatus).toBe('failed');
		expect(fakes.logs).toEqual([
			{
				line: { event: 'contact', outcome: 'stored_only', reason: 'email_failed' },
				level: 'error',
			},
		]);
	});

	// covers: AC-12, AC-14
	it('treats an outbox write that throws before returning a promise as not saved', async () => {
		const fakes = setup();
		const env: ContactEnv = {
			...fakes.env,
			CONTACT_OUTBOX: {
				put: () => {
					throw new TypeError('kv is not bound');
				},
				list: async () => ({ keys: [], list_complete: true }),
			},
		};
		const response = await handleContact(post(), env, fakes.deps);

		expect(response.status).toBe(200);
		expect(fakes.sends[0].text).toContain('\nReference: not saved\n');
		expect(fakes.logs[0].line).toEqual({
			event: 'contact',
			outcome: 'sent',
			reason: 'outbox_failed',
		});
	});

	// covers: AC-13
	it('never retries a send', async () => {
		const fakes = setup({ sendFails: true });
		await send(post(), fakes);

		expect(fakes.sends).toHaveLength(1);
	});
});

describe('handleContact, routing (AC-15)', () => {
	// covers: AC-15
	it.each(['GET', 'POST', 'PUT'])('answers 404 for %s on another /api/ path', async (method) => {
		const fakes = setup();
		const request = new Request('https://toyintest.org/api/other', { method });
		const { response, body } = await send(request, fakes);

		expect(response.status).toBe(404);
		expect(body).toEqual({ ok: false, error: 'not_found' });
		expect(fakes.logs[0].line).toEqual({ event: 'contact', outcome: 'not_found', reason: null });
	});

	// covers: AC-15
	it.each(['/api/contact/', '/api/contact/x', '/api/'])('answers 404 for %s', async (path) => {
		const { response } = await send(post(undefined, {}, path), setup());

		expect(response.status).toBe(404);
	});

	// covers: AC-15
	it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])(
		'answers 405 with Allow: POST for %s',
		async (method) => {
			const { response, body } = await send(
				new Request('https://toyintest.org/api/contact', { method }),
				setup(),
			);

			expect(response.status).toBe(405);
			expect(response.headers.get('Allow')).toBe('POST');
			expect(body).toEqual({ ok: false, error: 'method_not_allowed' });
		},
	);

	// covers: AC-15
	it('answers HEAD with the 405 status and headers and no body', async () => {
		const { response, body } = await send(
			new Request('https://toyintest.org/api/contact', { method: 'HEAD' }),
			setup(),
		);

		expect(response.status).toBe(405);
		expect(response.headers.get('Allow')).toBe('POST');
		expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
		expect(body).toBeNull();
	});
});

describe('handleContact, the gate checks (AC-16, AC-17)', () => {
	// covers: AC-16
	it('answers 403 forbidden for a foreign Origin, before any work', async () => {
		const fakes = setup();
		const { response, body } = await send(
			post(undefined, { Origin: 'https://evil.example' }),
			fakes,
		);

		expect(response.status).toBe(403);
		expect(body).toEqual({ ok: false, error: 'forbidden' });
		expect(fakes.logs[0].line).toEqual({
			event: 'contact',
			outcome: 'forbidden',
			reason: 'origin',
		});
		expect(fakes.limits).toEqual([]);
	});

	// covers: AC-16
	it('accepts a request with no Origin', async () => {
		const request = new Request('https://toyintest.org/api/contact', {
			method: 'POST',
			body: new URLSearchParams(FIELDS),
		});

		expect((await send(request, setup())).response.status).toBe(200);
	});

	// covers: AC-16
	it('accepts any origin in the comma separated list', async () => {
		const fakes = setup({
			env: { ALLOWED_ORIGINS: 'https://toyintest.org, http://localhost:8787' },
		});

		expect(
			(await send(post(undefined, { Origin: 'http://localhost:8787' }), fakes)).response.status,
		).toBe(200);
	});

	// covers: AC-16, AC-21
	it.each([
		'CONTACT_TO',
		'TURNSTILE_SECRET_KEY',
		'EMAIL',
		'CONTACT_LIMITER',
		'CONTACT_OUTBOX',
	] as const)('answers 503 config_missing with the alarm when %s is missing', async (name) => {
		const fakes = setup({ env: { [name]: undefined } });
		const { response, body } = await send(post(), fakes);

		expect(response.status).toBe(503);
		expect(body).toEqual({ ok: false, error: 'unavailable' });
		expect(fakes.logs).toEqual([
			{
				line: { event: 'contact', outcome: 'unavailable', reason: 'config_missing' },
				level: 'error',
			},
		]);
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-16
	it.each(['application/json', 'text/plain', ''])(
		'answers 400 content_type for %j',
		async (type) => {
			const fakes = setup();
			const { response, body } = await send(
				post(JSON.stringify(FIELDS), { 'Content-Type': type }),
				fakes,
			);

			expect(response.status).toBe(400);
			expect(body).toEqual({ ok: false, error: 'bad_request' });
			expect(fakes.logs[0].line.reason).toBe('content_type');
		},
	);

	// covers: AC-17
	it('answers 400 body_too_large for a body over 32,768 bytes, whatever Content-Length says', async () => {
		const chunk = new TextEncoder().encode('a'.repeat(8192));
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				Array.from({ length: 5 }).forEach(() => controller.enqueue(chunk));
				controller.close();
			},
		});
		const request = new Request('https://toyintest.org/api/contact', {
			method: 'POST',
			body: stream,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': '10' },
			duplex: 'half',
		} as RequestInit);
		const fakes = setup();
		const { response } = await send(request, fakes);

		expect(response.status).toBe(400);
		expect(fakes.logs[0].line.reason).toBe('body_too_large');
	});

	// covers: AC-17
	it('accepts a body of exactly 32,768 bytes', async () => {
		const base = new URLSearchParams(FIELDS).toString();
		const body = `${base}&pad=${'a'.repeat(CONTACT_LIMITS.bodyMaxBytes - base.length - 5)}`;
		expect(new TextEncoder().encode(body).length).toBe(CONTACT_LIMITS.bodyMaxBytes);

		const { response } = await send(
			post(body, { 'Content-Type': 'application/x-www-form-urlencoded' }),
			setup(),
		);
		expect(response.status).toBe(200);
	});

	// covers: AC-17
	it('answers 400 parse_failed for a body that cannot be read', async () => {
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				controller.error(new Error('reset'));
			},
		});
		const request = new Request('https://toyintest.org/api/contact', {
			method: 'POST',
			body: stream,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			duplex: 'half',
		} as RequestInit);
		const fakes = setup();
		const { response } = await send(request, fakes);

		expect(response.status).toBe(400);
		expect(fakes.logs[0].line.reason).toBe('parse_failed');
	});

	// covers: AC-17
	it('answers 400 parse_failed for a multipart body that cannot be parsed', async () => {
		const fakes = setup();
		const { response } = await send(
			post('not multipart', { 'Content-Type': 'multipart/form-data; boundary=x' }),
			fakes,
		);

		expect(response.status).toBe(400);
		expect(fakes.logs[0].line.reason).toBe('parse_failed');
	});

	// covers: AC-17
	it('answers 400 field_shape for a repeated known field', async () => {
		const body = `${new URLSearchParams(FIELDS)}&name=Other`;
		const fakes = setup();
		const { response } = await send(
			post(body, { 'Content-Type': 'application/x-www-form-urlencoded' }),
			fakes,
		);

		expect(response.status).toBe(400);
		expect(fakes.logs[0].line.reason).toBe('field_shape');
	});

	// covers: AC-17
	it('answers 400 field_shape for a known field sent as a file', async () => {
		const form = new FormData();
		Object.entries(FIELDS).forEach(([key, value]) => key !== 'message' && form.append(key, value));
		form.append('message', new Blob(['Hello there friend']), 'message.txt');
		const fakes = setup();
		const { response } = await send(post(form), fakes);

		expect(response.status).toBe(400);
		expect(fakes.logs[0].line.reason).toBe('field_shape');
	});

	// covers: AC-17
	it('ignores unknown fields, files included', async () => {
		const form = new FormData();
		Object.entries(FIELDS).forEach(([key, value]) => form.append(key, value));
		form.append('extra', 'x');
		form.append('extra', 'y');
		form.append('upload', new Blob(['x']), 'x.txt');

		expect((await send(post(form), setup())).response.status).toBe(200);
	});

	// covers: AC-17, AC-5
	it('treats a missing known field as empty', async () => {
		const rest = Object.entries(FIELDS).filter(([key]) => key !== 'name');
		const { response, body } = await send(post(new URLSearchParams(rest)), setup());

		expect(response.status).toBe(422);
		expect(body).toEqual({ ok: false, error: 'invalid', fields: { name: 'required' } });
	});
});

describe('handleContact, spam and abuse (AC-9, AC-10)', () => {
	// covers: AC-9
	it('keys the limit by contact: plus the visitor IP', async () => {
		const fakes = setup();
		await send(post(), fakes);

		expect(fakes.limits).toEqual([`contact:${IP}`]);
	});

	// covers: AC-9
	it('keys the limit contact:unknown when there is no IP', async () => {
		const fakes = setup();
		await send(
			new Request('https://toyintest.org/api/contact', {
				method: 'POST',
				body: new URLSearchParams(FIELDS),
			}),
			fakes,
		);

		expect(fakes.limits).toEqual(['contact:unknown']);
	});

	// covers: AC-9
	it('answers 429 over the limit, before validation and Turnstile', async () => {
		const fakes = setup({ limit: async () => ({ success: false }) });
		const { response, body } = await send(post(new URLSearchParams({})), fakes);

		expect(response.status).toBe(429);
		expect(body).toEqual({ ok: false, error: 'rate_limited' });
		expect(fakes.verifyTurnstile).not.toHaveBeenCalled();
	});

	// covers: AC-9
	it('lets three sends through, then answers the fourth with 429', async () => {
		const counts = new Map<string, number>();
		const fakes = setup();
		const env: ContactEnv = {
			...fakes.env,
			CONTACT_LIMITER: {
				limit: async ({ key }) => {
					counts.set(key, (counts.get(key) ?? 0) + 1);
					return { success: (counts.get(key) ?? 0) <= 3 };
				},
			},
		};
		const statuses = [];
		for (let i = 0; i < 4; i += 1)
			statuses.push((await handleContact(post(), env, fakes.deps)).status);

		expect(statuses).toEqual([200, 200, 200, 429]);
	});

	// covers: AC-9, AC-21
	it('fails closed with 503 when the limiter throws', async () => {
		const fakes = setup({
			limit: async () => {
				throw new Error('limiter down');
			},
		});
		const { response } = await send(post(), fakes);

		expect(response.status).toBe(503);
		expect(fakes.logs[0]).toEqual({
			line: { event: 'contact', outcome: 'unavailable', reason: 'limiter_error' },
			level: 'error',
		});
		expect(fakes.alarm).toHaveBeenCalledOnce();
		expect(fakes.puts).toEqual([]);
	});

	// covers: AC-5, AC-6
	it('answers 422 with the field codes before Turnstile', async () => {
		const fakes = setup();
		const { response, body } = await send(
			post(new URLSearchParams({ ...FIELDS, email: 'nope', message: 'short' })),
			fakes,
		);

		expect(response.status).toBe(422);
		expect(body).toEqual({
			ok: false,
			error: 'invalid',
			fields: { email: 'invalid', message: 'too_short' },
		});
		expect(fakes.verifyTurnstile).not.toHaveBeenCalled();
		expect(fakes.sends).toEqual([]);
	});

	// covers: AC-10
	it.each(['token_missing', 'token_rejected', 'action_mismatch', 'hostname_mismatch'] as const)(
		'answers 403 verification for a %s token, without the alarm',
		async (reason) => {
			const fakes = setup({ verify: { kind: 'rejected', reason } });
			const { response, body } = await send(post(), fakes);

			expect(response.status).toBe(403);
			expect(body).toEqual({ ok: false, error: 'verification' });
			expect(fakes.logs[0].line).toEqual({
				event: 'contact',
				outcome: 'verification_failed',
				reason,
			});
			expect(fakes.alarm).not.toHaveBeenCalled();
			expect(fakes.sends).toEqual([]);
		},
	);

	// covers: AC-10, AC-21
	it('answers 503 with the alarm when the secret is rejected', async () => {
		const fakes = setup({ verify: { kind: 'secret_rejected', body: {} } });
		const { response } = await send(post(), fakes);

		expect(response.status).toBe(503);
		expect(fakes.logs[0]).toEqual({
			line: { event: 'contact', outcome: 'unavailable', reason: 'secret_rejected' },
			level: 'error',
		});
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-10
	it('answers 503 without the alarm when siteverify is unreachable', async () => {
		const fakes = setup({ verify: { kind: 'unreachable' } });
		const { response } = await send(post(), fakes);

		expect(response.status).toBe(503);
		expect(fakes.logs[0]).toEqual({
			line: { event: 'contact', outcome: 'unavailable', reason: 'turnstile_unreachable' },
			level: 'error',
		});
		expect(fakes.alarm).not.toHaveBeenCalled();
	});
});

describe('handleContact, logging (AC-18)', () => {
	// covers: AC-15, AC-18
	it('answers 500 unavailable with the alarm on an unexpected error', async () => {
		const fakes = setup();
		const deps: ContactDeps = {
			...fakes.deps,
			uuid: () => {
				throw new Error('boom zee@example.com');
			},
		};
		const response = await handleContact(post(), fakes.env, deps);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ ok: false, error: 'unavailable' });
		expect(fakes.logs).toEqual([
			{ line: { event: 'contact', outcome: 'unavailable', reason: 'unexpected' }, level: 'error' },
		]);
		expect(fakes.alarm).toHaveBeenCalledOnce();
	});

	// covers: AC-18
	it('never logs the name, email, message, IP, token or stored value', async () => {
		const runs = [
			setup(),
			setup({ sendFails: true }),
			setup({ putFails: [true, true], sendFails: true }),
			setup({ putFails: [false, true] }),
			setup({ verify: { kind: 'rejected', reason: 'token_rejected' } }),
		];
		for (const fakes of runs) await send(post(), fakes);

		const logged = JSON.stringify(runs.flatMap((fakes) => fakes.logs));
		for (const secret of [
			'Zoë',
			'zee@example.com',
			'project for you',
			IP,
			'token-123',
			'you@example.com',
		]) {
			expect(logged).not.toContain(secret);
		}
	});

	// covers: AC-15, AC-18
	it('keeps every exit row to the statuses, bodies and levels of the Exit table', () => {
		const rows = Object.entries(EXITS).map(([name, row]) => [
			name,
			row.status,
			row.error,
			row.level,
			row.alarm,
		]);

		expect(rows).toEqual([
			['not_found', 404, 'not_found', 'log', false],
			['method_not_allowed', 405, 'method_not_allowed', 'log', false],
			['origin', 403, 'forbidden', 'log', false],
			['config_missing', 503, 'unavailable', 'error', true],
			['content_type', 400, 'bad_request', 'log', false],
			['body_too_large', 400, 'bad_request', 'log', false],
			['parse_failed', 400, 'bad_request', 'log', false],
			['field_shape', 400, 'bad_request', 'log', false],
			['limiter_error', 503, 'unavailable', 'error', true],
			['rate_limited', 429, 'rate_limited', 'log', false],
			['invalid', 422, 'invalid', 'log', false],
			['token_missing', 403, 'verification', 'log', false],
			['token_rejected', 403, 'verification', 'log', false],
			['action_mismatch', 403, 'verification', 'log', false],
			['hostname_mismatch', 403, 'verification', 'log', false],
			['secret_rejected', 503, 'unavailable', 'error', true],
			['turnstile_unreachable', 503, 'unavailable', 'error', false],
			['sent', 200, null, 'log', false],
			['stored_only', 200, null, 'error', true],
			['outbox_failed', 200, null, 'error', true],
			['delivery_failed', 502, 'delivery', 'error', true],
			['unexpected', 500, 'unavailable', 'error', true],
		]);
	});
});
