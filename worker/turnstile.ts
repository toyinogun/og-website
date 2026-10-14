// Checks a Turnstile token with Cloudflare's siteverify API (spec 0006,
// AC-10). The network call is passed in, so the tests run with a fake.
import { CONTACT_LIMITS } from '../src/lib/contact';

/** Cloudflare's token check endpoint. */
export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** What `verifyTurnstile` checks: the token against the secret, the action and the hostname. */
export interface VerifyInput {
	readonly secret: string;
	readonly token: string;
	/** The visitor's address from `CF-Connecting-IP`, sent only when present. */
	readonly remoteip?: string;
	readonly expectedHostname: string;
	readonly expectedAction: string;
}

/** Why a token did not pass. */
export type RejectReason =
	'token_missing' | 'token_rejected' | 'action_mismatch' | 'hostname_mismatch';

/**
 * The result of a check. `body` is siteverify's parsed reply, kept so the
 * weekly check can read its error codes; it is absent when there was none.
 */
export type VerifyResult =
	| { readonly kind: 'ok'; readonly body: unknown }
	| { readonly kind: 'rejected'; readonly reason: RejectReason; readonly body?: unknown }
	| { readonly kind: 'secret_rejected'; readonly body: unknown }
	| { readonly kind: 'unreachable'; readonly body?: unknown };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads siteverify's reply into one result, first match wins. */
const readReply = (body: unknown, input: VerifyInput): VerifyResult => {
	if (!isRecord(body) || typeof body.success !== 'boolean') return { kind: 'unreachable', body };
	const codes = Array.isArray(body['error-codes']) ? body['error-codes'] : [];
	if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret'))
		return { kind: 'secret_rejected', body };
	if (codes.includes('internal-error')) return { kind: 'unreachable', body };
	if (!body.success) return { kind: 'rejected', reason: 'token_rejected', body };
	if (body.action !== input.expectedAction)
		return { kind: 'rejected', reason: 'action_mismatch', body };
	if (body.hostname !== input.expectedHostname)
		return { kind: 'rejected', reason: 'hostname_mismatch', body };
	return { kind: 'ok', body };
};

/**
 * Verifies a token with one form encoded `POST` to siteverify, aborted after
 * 5 seconds. A missing or over long token is rejected without a call. Never
 * throws: a network error, a timeout, a non 2xx status or a reply it cannot
 * read is `unreachable`.
 */
export const verifyTurnstile = async (
	input: VerifyInput,
	fetchImpl: typeof fetch,
): Promise<VerifyResult> => {
	if (input.token === '') return { kind: 'rejected', reason: 'token_missing' };
	if (input.token.length > CONTACT_LIMITS.tokenMax)
		return { kind: 'rejected', reason: 'token_rejected' };

	const form = new URLSearchParams({ secret: input.secret, response: input.token });
	if (input.remoteip) form.set('remoteip', input.remoteip);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), CONTACT_LIMITS.verifyTimeoutMs);
	try {
		const response = await fetchImpl(SITEVERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
			signal: controller.signal,
		});
		if (!response.ok) return { kind: 'unreachable' };
		const body: unknown = await response.json().catch(() => undefined);
		return readReply(body, input);
	} catch {
		return { kind: 'unreachable' };
	} finally {
		clearTimeout(timer);
	}
};
