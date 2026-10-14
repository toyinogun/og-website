// The og-website Worker's script (spec 0006). Cloudflare runs it only for
// /api/* (`assets.run_worker_first` in wrangler.jsonc); every other request
// is a static asset. This file is the edge: it wires the real network, clock,
// log and alarm into the handlers, which hold all the logic.
import { handleContact, type ContactDeps, type ContactEnv, type LogLevel } from './contact';
import { verifyTurnstile } from './turnstile';
import { handleScheduled } from './weekly';

/** Writes one JSON log line; the handlers decide what goes in it. */
const writeLog = (line: Readonly<Record<string, unknown>>, level: LogLevel): void => {
	console[level](JSON.stringify(line));
};

/** The Healthchecks failure signal, sent after the response; it carries no personal data. */
const alarm = (env: ContactEnv, ctx: ExecutionContext) => (): void => {
	if (!env.HEALTHCHECK_URL) return;
	ctx.waitUntil(
		fetch(`${env.HEALTHCHECK_URL}/fail`).then(
			() => undefined,
			() => undefined,
		),
	);
};

const contactDeps = (env: ContactEnv, ctx: ExecutionContext): ContactDeps => ({
	verifyTurnstile: (input) => verifyTurnstile(input, fetch),
	now: () => new Date(),
	uuid: () => crypto.randomUUID(),
	log: writeLog,
	alarm: alarm(env, ctx),
});

export default {
	fetch: (request, env, ctx) => handleContact(request, env, contactDeps(env, ctx)),
	scheduled: (_controller, env, ctx) => {
		ctx.waitUntil(
			handleScheduled(env, {
				verifyTurnstile: (input) => verifyTurnstile(input, fetch),
				now: () => new Date(),
				ping: (url) => fetch(url),
				log: writeLog,
			}),
		);
	},
} satisfies ExportedHandler<Env>;
