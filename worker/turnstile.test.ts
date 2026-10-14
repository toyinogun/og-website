import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITEVERIFY_URL, verifyTurnstile, type VerifyInput } from './turnstile';

const INPUT: VerifyInput = {
	secret: 'secret',
	token: 'token-123',
	remoteip: '203.0.113.7',
	expectedHostname: 'toyintest.org',
	expectedAction: 'contact',
};

const reply = (body: unknown, status = 200) =>
	vi.fn<typeof fetch>(
		async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
	);

const PASS = { success: true, action: 'contact', hostname: 'toyintest.org', 'error-codes': [] };

afterEach(() => {
	vi.useRealTimers();
});

describe('verifyTurnstile', () => {
	// covers: AC-10
	it('posts one form encoded request to siteverify with the secret, token and IP', async () => {
		const fetchImpl = reply(PASS);
		await verifyTurnstile(INPUT, fetchImpl);

		expect(fetchImpl).toHaveBeenCalledOnce();
		const [url, init] = fetchImpl.mock.calls[0];
		expect(url).toBe(SITEVERIFY_URL);
		expect(SITEVERIFY_URL).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
		expect(init?.method).toBe('POST');
		expect(init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
		expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
			secret: 'secret',
			response: 'token-123',
			remoteip: '203.0.113.7',
		});
	});

	// covers: AC-10
	it('leaves remoteip out when there is none', async () => {
		const fetchImpl = reply(PASS);
		await verifyTurnstile({ ...INPUT, remoteip: undefined }, fetchImpl);

		expect(new URLSearchParams(String(fetchImpl.mock.calls[0][1]?.body)).has('remoteip')).toBe(
			false,
		);
	});

	// covers: AC-10
	it('passes a token that succeeds with the right action and hostname', async () => {
		expect(await verifyTurnstile(INPUT, reply(PASS))).toEqual({ kind: 'ok', body: PASS });
	});

	// covers: AC-10
	it('rejects a missing token without a call', async () => {
		const fetchImpl = reply(PASS);

		expect(await verifyTurnstile({ ...INPUT, token: '' }, fetchImpl)).toEqual({
			kind: 'rejected',
			reason: 'token_missing',
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	// covers: AC-10
	it('rejects a token over 2,048 characters without a call, and allows 2,048', async () => {
		const fetchImpl = reply(PASS);

		expect((await verifyTurnstile({ ...INPUT, token: 'a'.repeat(2049) }, fetchImpl)).kind).toBe(
			'rejected',
		);
		expect(fetchImpl).not.toHaveBeenCalled();
		expect((await verifyTurnstile({ ...INPUT, token: 'a'.repeat(2048) }, fetchImpl)).kind).toBe(
			'ok',
		);
	});

	// covers: AC-10
	it.each([
		[
			'a failed token',
			{ success: false, 'error-codes': ['invalid-input-response'] },
			'token_rejected',
		],
		[
			'a reused token',
			{ success: false, 'error-codes': ['timeout-or-duplicate'] },
			'token_rejected',
		],
		['the wrong action', { ...PASS, action: 'login' }, 'action_mismatch'],
		['no action', { success: true, hostname: 'toyintest.org' }, 'action_mismatch'],
		['the wrong hostname', { ...PASS, hostname: 'evil.example' }, 'hostname_mismatch'],
	])('rejects %s', async (_label, body, reason) => {
		expect(await verifyTurnstile(INPUT, reply(body))).toEqual({ kind: 'rejected', reason, body });
	});

	// covers: AC-10
	it.each([['invalid-input-secret'], ['missing-input-secret']])(
		'reports %s as secret_rejected',
		async (code) => {
			const body = { success: false, 'error-codes': [code] };

			expect(await verifyTurnstile(INPUT, reply(body))).toEqual({ kind: 'secret_rejected', body });
		},
	);

	// covers: AC-10
	it.each([
		['a 500', reply(PASS, 500)],
		['a 404', reply(PASS, 404)],
		['a body that is not JSON', reply('<html>')],
		['a body without a boolean success', reply({ success: 'yes' })],
		['an array body', reply([PASS])],
		['internal-error', reply({ success: false, 'error-codes': ['internal-error'] })],
		[
			'a network error',
			vi.fn<typeof fetch>(async () => {
				throw new TypeError('fetch failed');
			}),
		],
	])('reports %s as unreachable', async (_label, fetchImpl) => {
		expect((await verifyTurnstile(INPUT, fetchImpl)).kind).toBe('unreachable');
	});

	// covers: AC-10
	it('gives up after 5 seconds', async () => {
		vi.useFakeTimers();
		const fetchImpl = vi.fn<typeof fetch>(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new DOMException('aborted', 'AbortError')),
					);
				}),
		);
		const result = verifyTurnstile(INPUT, fetchImpl);

		await vi.advanceTimersByTimeAsync(4999);
		expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(await result).toEqual({ kind: 'unreachable' });
	});
});
