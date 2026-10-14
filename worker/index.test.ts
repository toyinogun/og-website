import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

/** A fake execution context that keeps every promise handed to `waitUntil`. */
const context = () => {
	const pending: Promise<unknown>[] = [];
	return {
		pending,
		ctx: {
			waitUntil: (promise: Promise<unknown>) => pending.push(promise),
			passThroughOnException: () => undefined,
			props: {},
		} as unknown as ExecutionContext,
	};
};

/** A request as the Worker receives it; the incoming `cf` fields do not matter here. */
const post = () =>
	new Request('https://toyintest.org/api/contact', {
		method: 'POST',
		body: new URLSearchParams({ name: 'Ada' }),
	}) as Parameters<typeof worker.fetch>[0];

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('the Worker entry point', () => {
	// covers: AC-18
	it('writes the handler log line as JSON, with console.log or console.error by level', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const { ctx } = context();
		await worker.fetch(
			new Request('https://toyintest.org/api/nope') as Parameters<typeof worker.fetch>[0],
			{} as never,
			ctx,
		);

		expect(log).toHaveBeenCalledWith('{"event":"contact","outcome":"not_found","reason":null}');
	});

	// covers: AC-21
	it('sends the Healthchecks failure signal after the response on an alarm row', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetch = vi.fn(async () => new Response(null));
		vi.stubGlobal('fetch', fetch);
		const { ctx, pending } = context();

		const response = await worker.fetch(
			post(),
			{ HEALTHCHECK_URL: 'https://hc-ping.com/check' } as never,
			ctx,
		);
		await Promise.all(pending);

		expect(response.status).toBe(503);
		expect(error).toHaveBeenCalledWith(
			'{"event":"contact","outcome":"unavailable","reason":"config_missing"}',
		);
		expect(pending).toHaveLength(1);
		expect(fetch).toHaveBeenCalledWith('https://hc-ping.com/check/fail');
	});

	// covers: AC-21
	it('swallows a failed alarm request, so it never breaks the response', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			}),
		);
		const { ctx, pending } = context();
		await worker.fetch(post(), { HEALTHCHECK_URL: 'https://hc-ping.com/check' } as never, ctx);

		await expect(Promise.all(pending)).resolves.toBeDefined();
	});

	// covers: AC-21
	it('sends no alarm when HEALTHCHECK_URL is not set', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetch = vi.fn(async () => new Response(null));
		vi.stubGlobal('fetch', fetch);
		const { ctx, pending } = context();
		await worker.fetch(post(), {} as never, ctx);

		expect(pending).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});

	// covers: AC-21
	it('runs the weekly check inside waitUntil and logs its one line', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null)),
		);
		const { ctx, pending } = context();

		await worker.scheduled(
			{ cron: '0 8 * * 1', scheduledTime: 0, noRetry: () => undefined },
			{} as never,
			ctx,
		);
		await Promise.all(pending);

		expect(pending).toHaveLength(1);
		expect(error).toHaveBeenCalledWith(
			'{"event":"weekly_check","email":"failed","turnstile":"secret_missing","messages":"unreadable","healthcheck":"missing"}',
		);
	});
});
