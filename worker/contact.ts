// The contact form's endpoint, POST /api/contact (spec 0006). Every way it
// ends is one row of `EXITS`, the spec's *Exit table*, and `finish` is the
// one place that turns a row into the JSON response, the log line and the
// alarm. The words, limits and validation come from src/lib/contact.ts, so
// the browser and the Worker judge a message the same way. Every outside
// effect (Turnstile, the clock, the log, the alarm) arrives through `deps`.
import {
	CONTACT_FIELDS,
	CONTACT_LIMITS,
	emailBody,
	emailSubject,
	outboxKey,
	outboxMetadata,
	validateContact,
	type ContactField,
	type ContactMessage,
	type ContactResponse,
	type FieldErrors,
	type OutboxRecord,
} from '../src/lib/contact';
import type { VerifyInput, VerifyResult } from './turnstile';

/** The address every form email comes from. */
export const FORM_SENDER = { email: 'form@toyintest.org', name: 'Contact form' } as const;

/** The email the Worker hands to the Email Service binding. */
export interface OutgoingEmail {
	readonly from: { readonly email: string; readonly name: string };
	readonly to: string;
	readonly replyTo?: { readonly email: string; readonly name: string };
	readonly subject: string;
	readonly text: string;
}

/** The parts of the `send_email` binding the Worker uses. */
export interface EmailSender {
	send(message: OutgoingEmail): Promise<unknown>;
}

/** The parts of the `CONTACT_OUTBOX` KV namespace the Worker uses. */
export interface OutboxStore {
	put(
		key: string,
		value: string,
		options: { readonly expirationTtl: number; readonly metadata: unknown },
	): Promise<unknown>;
	list(options: { readonly prefix: string; readonly cursor?: string }): Promise<{
		readonly keys: readonly { readonly name: string; readonly metadata?: unknown }[];
		readonly list_complete: boolean;
		readonly cursor?: string;
	}>;
}

/** The parts of the rate limit binding the Worker uses. */
export interface Limiter {
	limit(options: { readonly key: string }): Promise<{ readonly success: boolean }>;
}

/**
 * The Worker's bindings, secrets and vars, every one optional so a missing
 * one is an answer (`503 config_missing`) rather than a crash.
 */
export interface ContactEnv {
	readonly EMAIL?: EmailSender;
	readonly CONTACT_LIMITER?: Limiter;
	readonly CONTACT_OUTBOX?: OutboxStore;
	readonly CONTACT_TO?: string;
	readonly TURNSTILE_SECRET_KEY?: string;
	readonly HEALTHCHECK_URL?: string;
	readonly TURNSTILE_EXPECTED_HOSTNAME?: string;
	readonly ALLOWED_ORIGINS?: string;
}

/** Whether a log line is written with `console.log` or `console.error`. */
export type LogLevel = 'log' | 'error';

/** The outside effects `handleContact` uses, passed in so tests can fake them. */
export interface ContactDeps {
	readonly verifyTurnstile: (input: VerifyInput) => Promise<VerifyResult>;
	readonly now: () => Date;
	readonly uuid: () => string;
	readonly log: (line: Readonly<Record<string, unknown>>, level: LogLevel) => void;
	/** Sends the Healthchecks failure signal, with no personal data. */
	readonly alarm: () => void;
}

/** One row of the *Exit table*. */
interface Exit {
	readonly status: number;
	readonly error: Exclude<ContactResponse, { ok: true }>['error'] | null;
	readonly outcome: string;
	readonly reason: string | null;
	readonly level: LogLevel;
	readonly alarm: boolean;
}

const exit = (
	status: number,
	error: Exit['error'],
	outcome: string,
	reason: string | null,
	level: LogLevel = 'log',
	alarm = false,
): Exit => ({ status, error, outcome, reason, level, alarm });

/** Every way a request ends (spec 0006, *Exit table*). */
export const EXITS = {
	not_found: exit(404, 'not_found', 'not_found', null),
	method_not_allowed: exit(405, 'method_not_allowed', 'method_not_allowed', null),
	origin: exit(403, 'forbidden', 'forbidden', 'origin'),
	config_missing: exit(503, 'unavailable', 'unavailable', 'config_missing', 'error', true),
	content_type: exit(400, 'bad_request', 'bad_request', 'content_type'),
	body_too_large: exit(400, 'bad_request', 'bad_request', 'body_too_large'),
	parse_failed: exit(400, 'bad_request', 'bad_request', 'parse_failed'),
	field_shape: exit(400, 'bad_request', 'bad_request', 'field_shape'),
	limiter_error: exit(503, 'unavailable', 'unavailable', 'limiter_error', 'error', true),
	rate_limited: exit(429, 'rate_limited', 'rate_limited', null),
	invalid: exit(422, 'invalid', 'invalid', null),
	token_missing: exit(403, 'verification', 'verification_failed', 'token_missing'),
	token_rejected: exit(403, 'verification', 'verification_failed', 'token_rejected'),
	action_mismatch: exit(403, 'verification', 'verification_failed', 'action_mismatch'),
	hostname_mismatch: exit(403, 'verification', 'verification_failed', 'hostname_mismatch'),
	secret_rejected: exit(503, 'unavailable', 'unavailable', 'secret_rejected', 'error', true),
	turnstile_unreachable: exit(503, 'unavailable', 'unavailable', 'turnstile_unreachable', 'error'),
	sent: exit(200, null, 'sent', null),
	stored_only: exit(200, null, 'stored_only', 'email_failed', 'error', true),
	outbox_failed: exit(200, null, 'sent', 'outbox_failed', 'error', true),
	delivery_failed: exit(
		502,
		'delivery',
		'delivery_failed',
		'email_and_outbox_failed',
		'error',
		true,
	),
	unexpected: exit(500, 'unavailable', 'unavailable', 'unexpected', 'error', true),
} as const satisfies Readonly<Record<string, Exit>>;

/** The name of one *Exit table* row. */
export type ExitName = keyof typeof EXITS;

/** How a request ended: its row, plus the field errors for a 422. */
interface Ending {
	readonly name: ExitName;
	readonly fields?: FieldErrors;
}

const end = (name: ExitName, fields?: FieldErrors): Ending => ({ name, fields });

const KNOWN_FIELDS = [...CONTACT_FIELDS, 'cf-turnstile-response'] as const;

type KnownField = (typeof KNOWN_FIELDS)[number];

const FORM_TYPES: readonly string[] = ['multipart/form-data', 'application/x-www-form-urlencoded'];

/** The body bytes, or why they could not be read within the cap. */
type BodyRead =
	| { readonly kind: 'ok'; readonly bytes: Uint8Array }
	| { readonly kind: 'too_large' }
	| { readonly kind: 'failed' };

/** Reads the body through the byte cap, whatever `Content-Length` says. */
const readCapped = async (
	body: ReadableStream<Uint8Array> | null,
	maxBytes: number,
): Promise<BodyRead> => {
	if (body === null) return { kind: 'ok', bytes: new Uint8Array() };
	const reader = body.getReader();
	const readFrom = async (chunks: readonly Uint8Array[], total: number): Promise<BodyRead> => {
		const { done, value } = await reader.read();
		if (done) {
			const bytes = new Uint8Array(total);
			chunks.reduce((offset, chunk) => (bytes.set(chunk, offset), offset + chunk.length), 0);
			return { kind: 'ok', bytes };
		}
		const size = total + value.length;
		if (size > maxBytes) {
			await reader.cancel().catch(() => undefined);
			return { kind: 'too_large' };
		}
		return readFrom([...chunks, value], size);
	};
	return readFrom([], 0).catch((): BodyRead => ({ kind: 'failed' }));
};

/** The known fields as text, or `null` when one repeats or is a file. */
const knownFields = (form: FormData): Readonly<Record<KnownField, string>> | null => {
	const entries = KNOWN_FIELDS.map((field) => [field, form.getAll(field)] as const);
	const wellShaped = entries.every(
		([, values]) => values.length <= 1 && values.every((value) => typeof value === 'string'),
	);
	return wellShaped
		? (Object.fromEntries(
				entries.map(([field, values]) => [field, String(values[0] ?? '')]),
			) as Record<KnownField, string>)
		: null;
};

const VERIFY_EXITS: Readonly<Record<string, ExitName>> = {
	token_missing: 'token_missing',
	token_rejected: 'token_rejected',
	action_mismatch: 'action_mismatch',
	hostname_mismatch: 'hostname_mismatch',
};

const verifyExit = (result: VerifyResult): ExitName | null => {
	switch (result.kind) {
		case 'ok':
			return null;
		case 'rejected':
			return VERIFY_EXITS[result.reason] ?? 'token_rejected';
		case 'secret_rejected':
			return 'secret_rejected';
		case 'unreachable':
			return 'turnstile_unreachable';
	}
};

/** Runs a storage or email call, reporting only whether it worked. */
const attempt = async (run: () => Promise<unknown>): Promise<boolean> =>
	run().then(
		() => true,
		() => false,
	);

/** Saves the copy, sends the email, then records whether the email went out (AC-12 to AC-14). */
const deliver = async (
	message: ContactMessage,
	receivedAt: Date,
	env: Required<Pick<ContactEnv, 'EMAIL' | 'CONTACT_OUTBOX' | 'CONTACT_TO'>>,
	deps: ContactDeps,
): Promise<Ending> => {
	const key = outboxKey(receivedAt, deps.uuid());
	const record: OutboxRecord = {
		receivedAt: receivedAt.toISOString(),
		topic: message.topic,
		name: message.name,
		email: message.email,
		message: message.message,
		emailStatus: 'pending',
	};
	const save = (value: OutboxRecord) => () =>
		env.CONTACT_OUTBOX.put(key, JSON.stringify(value), {
			expirationTtl: CONTACT_LIMITS.outboxTtlSeconds,
			metadata: outboxMetadata(value),
		});

	const saved = await attempt(save(record));
	const sent = await attempt(() =>
		env.EMAIL.send({
			from: FORM_SENDER,
			to: env.CONTACT_TO,
			replyTo: { email: message.email, name: message.name },
			subject: emailSubject(message),
			text: emailBody(message, receivedAt, saved ? key : null),
		}),
	);
	if (saved) {
		const updated = await attempt(save({ ...record, emailStatus: sent ? 'sent' : 'failed' }));
		if (!updated) deps.log({ event: 'contact_outbox_update', ok: false }, 'error');
	}

	if (saved && sent) return end('sent');
	if (saved) return end('stored_only');
	if (sent) return end('outbox_failed');
	return end('delivery_failed');
};

/** Walks the *Exit table* steps in order, stopping at the first that ends the request. */
const run = async (
	request: Request,
	env: ContactEnv,
	deps: ContactDeps,
	receivedAt: Date,
): Promise<Ending> => {
	// 1 and 2: route by path, then method.
	if (new URL(request.url).pathname !== '/api/contact') return end('not_found');
	if (request.method !== 'POST') return end('method_not_allowed');

	// 3: the Origin, when present, must be allowed. Absent is fine.
	const origin = request.headers.get('Origin');
	const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim());
	if (origin !== null && !allowed.includes(origin)) return end('origin');

	// 4: every secret and binding is set.
	const { EMAIL, CONTACT_LIMITER, CONTACT_OUTBOX, CONTACT_TO, TURNSTILE_SECRET_KEY } = env;
	if (!EMAIL || !CONTACT_LIMITER || !CONTACT_OUTBOX || !CONTACT_TO || !TURNSTILE_SECRET_KEY)
		return end('config_missing');

	// 5 and 6: a form body, within the cap, each known field once and as text.
	const contentType = request.headers.get('Content-Type') ?? '';
	if (!FORM_TYPES.includes(contentType.split(';')[0].trim().toLowerCase()))
		return end('content_type');
	const read = await readCapped(request.body, CONTACT_LIMITS.bodyMaxBytes);
	if (read.kind === 'too_large') return end('body_too_large');
	if (read.kind === 'failed') return end('parse_failed');
	const form = await new Response(read.bytes, { headers: { 'Content-Type': contentType } })
		.formData()
		.catch(() => null);
	if (form === null) return end('parse_failed');
	const fields = knownFields(form);
	if (fields === null) return end('field_shape');

	// 7: the rate limit, failing closed.
	const ip = request.headers.get('CF-Connecting-IP');
	const limited = await CONTACT_LIMITER.limit({ key: `contact:${ip ?? 'unknown'}` }).then(
		(outcome) => !outcome.success,
		() => null,
	);
	if (limited === null) return end('limiter_error');
	if (limited) return end('rate_limited');

	// 8: the same validation the browser ran.
	const message: Readonly<Record<ContactField, string>> = fields;
	const validation = validateContact(message);
	if (!validation.ok) return end('invalid', validation.errors);

	// 9: Turnstile, with the action and the hostname checked.
	const verified = await deps.verifyTurnstile({
		secret: TURNSTILE_SECRET_KEY,
		token: fields['cf-turnstile-response'],
		...(ip ? { remoteip: ip } : {}),
		expectedHostname: env.TURNSTILE_EXPECTED_HOSTNAME ?? '',
		expectedAction: 'contact',
	});
	const failed = verifyExit(verified);
	if (failed !== null) return end(failed);

	// 10: the copy and the email.
	return deliver(validation.value, receivedAt, { EMAIL, CONTACT_OUTBOX, CONTACT_TO }, deps);
};

const JSON_HEADERS = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store',
} as const;

/** The one place a request ends: the response, the log line and, on alarm rows, the alarm. */
const finish = (ending: Ending, request: Request, deps: ContactDeps): Response => {
	const row = EXITS[ending.name];
	const body: ContactResponse =
		row.error === null
			? { ok: true }
			: row.error === 'invalid'
				? { ok: false, error: 'invalid', fields: ending.fields ?? {} }
				: { ok: false, error: row.error };

	deps.log({ event: 'contact', outcome: row.outcome, reason: row.reason }, row.level);
	if (row.alarm) deps.alarm();

	const headers =
		ending.name === 'method_not_allowed' ? { ...JSON_HEADERS, Allow: 'POST' } : JSON_HEADERS;
	return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
		status: row.status,
		headers,
	});
};

/**
 * Handles a request to `/api/*`: answers exactly one *Exit table* row with
 * one JSON response and one log line. Never throws; an unexpected error is
 * the `500 unavailable` row.
 */
export const handleContact = async (
	request: Request,
	env: ContactEnv,
	deps: ContactDeps,
): Promise<Response> => {
	const receivedAt = deps.now();
	const ending = await run(request, env, deps, receivedAt).catch(() => end('unexpected'));
	return finish(ending, request, deps);
};
