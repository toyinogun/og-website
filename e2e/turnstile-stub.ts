// A stand in for Cloudflare's Turnstile script, so the browser tests never
// call Cloudflare (spec 0006, Build plan step 10). Each mode drives one row of
// the *Turnstile states* table; `window.__turnstile` lets a test finish,
// expire or inspect the widget by hand.
import type { Page } from '@playwright/test';

/** How the fake widget behaves. */
export type TurnstileMode =
	| 'ok' // a token straight away, and again after every reset
	| 'slow' // no token until the test calls `window.__turnstile.issue()`
	| 'never' // no token, ever
	| 'interactive' // asks the visitor to tick a box
	| 'error' // errors on render and again after the reset
	| 'error-once' // errors on render, then gives a token after the reset
	| 'throw' // `render` throws
	| 'blocked'; // the script fails to load

/** What the fake widget saw, read back with `turnstileCalls`. */
export interface TurnstileCalls {
	readonly render: readonly Readonly<Record<string, unknown>>[];
	readonly reset: number;
	readonly remove: number;
}

export const TURNSTILE_URL = 'https://challenges.cloudflare.com/**';

const STUB = `(() => {
	const mode = window.__turnstileMode || 'ok';
	const calls = { render: [], reset: 0, remove: 0 };
	let options;
	let issued = 0;
	const issue = () => { issued += 1; options.callback('stub-token-' + issued); };
	const later = (run) => setTimeout(run, 0);
	window.__turnstileCalls = calls;
	window.__turnstile = {
		issue,
		expire: () => options['expired-callback'](),
		interactive: () => options['before-interactive-callback'](),
	};
	window.turnstile = {
		render(container, given) {
			options = given;
			const { callback, ...rest } = given;
			calls.render.push(Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')));
			if (mode === 'throw') throw new Error('render failed');
			if (mode === 'ok') later(issue);
			if (mode === 'interactive') later(() => given['before-interactive-callback']());
			if (mode === 'error' || mode === 'error-once') later(() => given['error-callback']('300030'));
			return 'widget-' + calls.render.length;
		},
		reset() {
			calls.reset += 1;
			if (mode === 'ok' || mode === 'error-once') later(issue);
			if (mode === 'error') later(() => options['error-callback']('300030'));
		},
		remove() { calls.remove += 1; },
	};
})();`;

/** Serves the fake Turnstile script in `mode` for every page this test opens. */
export const stubTurnstile = async (page: Page, mode: TurnstileMode = 'ok'): Promise<void> => {
	await page.addInitScript((value) => {
		(window as unknown as { __turnstileMode: string }).__turnstileMode = value;
	}, mode);
	await page.route(TURNSTILE_URL, (route) =>
		mode === 'blocked'
			? route.abort('blockedbyclient')
			: route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }),
	);
};

/** What the fake widget has been asked to do so far. */
export const turnstileCalls = (page: Page): Promise<TurnstileCalls> =>
	page.evaluate(() => (window as unknown as { __turnstileCalls: TurnstileCalls }).__turnstileCalls);
