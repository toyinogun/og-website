// The Monday self check (spec 0006, AC-21): probes the Turnstile secret,
// lists the week's messages from the outbox, emails you the summary, then
// pings Healthchecks.io (success only when the email went out and the secret
// works), and writes one log line. It proves the email path, the secret and
// the outbox, not the page or the widget.
import {
	weeklyCheckBody,
	weeklyCheckSubject,
	weeklyTurnstileState,
	type EmailStatus,
	type OutboxSummary,
	type Topic,
	type WeeklyTurnstileState,
} from '../src/lib/contact';
import { FORM_SENDER, type ContactEnv, type LogLevel, type OutboxStore } from './contact';
import type { VerifyInput, VerifyResult } from './turnstile';

/** The outside effects `handleScheduled` uses, passed in so tests can fake them. */
export interface WeeklyDeps {
	readonly verifyTurnstile: (input: VerifyInput) => Promise<VerifyResult>;
	readonly now: () => Date;
	/** Requests the Healthchecks ping address. */
	readonly ping: (url: string) => Promise<Response>;
	readonly log: (line: Readonly<Record<string, unknown>>, level: LogLevel) => void;
}

/** A token that can never pass, so a working secret answers `invalid-input-response`. */
export const PROBE_TOKEN = 'weekly-check';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const TOPIC_VALUES: readonly string[] = ['role', 'project', 'other'];
const STATUS_VALUES: readonly string[] = ['pending', 'sent', 'failed'];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * One listed key as a summary. The time comes from the key itself
 * (`msg:<ISO>:<uuid>`), so a key with broken metadata is still listed,
 * as `pending`, rather than silently dropped.
 */
const toSummary = (key: { readonly name: string; readonly metadata?: unknown }): OutboxSummary => {
	const meta = isRecord(key.metadata) ? key.metadata : {};
	const keyTime = key.name.slice('msg:'.length, 'msg:'.length + 24);
	return {
		key: key.name,
		receivedAt: typeof meta.receivedAt === 'string' ? meta.receivedAt : keyTime,
		topic: (TOPIC_VALUES.includes(String(meta.topic)) ? meta.topic : 'other') as Topic,
		name: typeof meta.name === 'string' ? meta.name : '(no name recorded)',
		emailStatus: (STATUS_VALUES.includes(String(meta.emailStatus))
			? meta.emailStatus
			: 'pending') as EmailStatus,
	};
};

/** Every outbox key, following the list cursor to the end. */
const listAll = async (
	outbox: OutboxStore,
	cursor?: string,
): Promise<readonly { readonly name: string; readonly metadata?: unknown }[]> => {
	const page = await outbox.list({ prefix: 'msg:', ...(cursor ? { cursor } : {}) });
	return page.list_complete || !page.cursor
		? page.keys
		: [...page.keys, ...(await listAll(outbox, page.cursor))];
};

/** The messages received in the 7 days before `now`, oldest first, or `unreadable`. */
const weekOfMessages = async (
	outbox: OutboxStore | undefined,
	now: Date,
): Promise<readonly OutboxSummary[] | 'unreadable'> => {
	if (!outbox) return 'unreadable';
	const since = now.getTime() - WEEK_MS;
	return listAll(outbox).then(
		(keys) =>
			keys
				.map(toSummary)
				.filter((item) => Date.parse(item.receivedAt) >= since)
				.toSorted((a, b) => a.receivedAt.localeCompare(b.receivedAt)),
		(): 'unreadable' => 'unreadable',
	);
};

/** Runs an outside call; a throw of either kind, before or after it returns a promise, gives `fallback`. */
const settle = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
	try {
		return await run();
	} catch {
		return fallback;
	}
};

const probeTurnstile = async (env: ContactEnv, deps: WeeklyDeps): Promise<WeeklyTurnstileState> => {
	if (!env.TURNSTILE_SECRET_KEY) return weeklyTurnstileState('missing');
	const secret = env.TURNSTILE_SECRET_KEY;
	const result = await settle<VerifyResult>(
		() =>
			deps.verifyTurnstile({
				secret,
				token: PROBE_TOKEN,
				expectedHostname: env.TURNSTILE_EXPECTED_HOSTNAME ?? '',
				expectedAction: 'contact',
			}),
		{ kind: 'unreachable' },
	);
	return weeklyTurnstileState(result.body === undefined ? 'unreachable' : result.body);
};

/** Runs the weekly check. Never throws; every failure ends up in the log line and the alarm. */
export const handleScheduled = async (env: ContactEnv, deps: WeeklyDeps): Promise<void> => {
	const now = deps.now();
	const turnstile = await probeTurnstile(env, deps);
	const messages = await weekOfMessages(env.CONTACT_OUTBOX, now);

	const { EMAIL, CONTACT_TO } = env;
	const emailed =
		EMAIL && CONTACT_TO
			? await settle(async () => {
					await EMAIL.send({
						from: FORM_SENDER,
						to: CONTACT_TO,
						subject: weeklyCheckSubject(),
						text: weeklyCheckBody(now, turnstile, messages),
					});
					return true;
				}, false)
			: false;

	const fine = emailed && turnstile === 'ok';
	const url = env.HEALTHCHECK_URL;
	const healthcheck = url
		? await settle(
				async () => ((await deps.ping(fine ? url : `${url}/fail`)).ok ? 'pinged' : 'failed'),
				'failed',
			)
		: 'missing';

	const allFine = fine && messages !== 'unreadable' && healthcheck === 'pinged';
	deps.log(
		{
			event: 'weekly_check',
			email: emailed ? 'sent' : 'failed',
			turnstile,
			messages: messages === 'unreadable' ? 'unreadable' : messages.length,
			healthcheck,
		},
		allFine ? 'log' : 'error',
	);
};
