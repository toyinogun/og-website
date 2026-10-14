// The contact form in the browser (spec 0006), against the production build.
// `/api/contact` and the Turnstile script are both stubbed: the real Worker is
// proved by its own tests and the local `wrangler dev` run, and the real
// widget by hand in `/check verify`.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { CONTACT, TOPICS } from '../src/lib/contact';
import { LINKEDIN_URL } from '../src/lib/site';
import { stubTurnstile, turnstileCalls, type TurnstileMode } from './turnstile-stub';

const API = '**/api/contact';
const status = (page: Page) => page.locator('#contact-status');
const submit = (page: Page) => page.getByRole('button', { name: CONTACT.submitLabel });
const name = (page: Page) => page.getByLabel(CONTACT.nameLabel);
const email = (page: Page) => page.getByLabel(CONTACT.emailLabel);
const message = (page: Page) => page.getByLabel(CONTACT.messageLabel);

const scan = (page: Page) =>
	new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();

const open = async (page: Page, mode: TurnstileMode = 'ok') => {
	await stubTurnstile(page, mode);
	await page.goto('/contact');
};

const fillValid = async (page: Page) => {
	await name(page).fill('Zoë "Zee" O’Brien');
	await email(page).fill('zee@example.com');
	await page.getByLabel(TOPICS[1].label).check();
	await message(page).fill('Hello,\nI have a project for you.');
};

/** Answers every send with this status and body, and records each request. */
const answer = async (page: Page, code: number, body: unknown) => {
	const requests: Request[] = [];
	await page.route(API, (route) => {
		requests.push(route.request());
		return route.fulfill({
			status: code,
			contentType: 'application/json',
			body: typeof body === 'string' ? body : JSON.stringify(body),
		});
	});
	return requests;
};

/** Holds every send until the test releases it. */
const hold = async (page: Page) => {
	const routes: Route[] = [];
	await page.route(API, (route) => {
		routes.push(route);
	});
	return routes;
};

const expectTextKept = async (page: Page) => {
	await expect(name(page)).toHaveValue('Zoë "Zee" O’Brien');
	await expect(email(page)).toHaveValue('zee@example.com');
	await expect(page.getByLabel(TOPICS[1].label)).toBeChecked();
	await expect(message(page)).toHaveValue('Hello,\nI have a project for you.');
};

test.describe('the contact page (AC-1, AC-22, AC-24)', () => {
	// covers: AC-1, AC-22
	test('shows the intro, the form, the privacy note and the LinkedIn line', async ({ page }) => {
		await open(page);

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(CONTACT.heading);
		await expect(page.getByText(CONTACT.privacyNote)).toBeVisible();
		await expect(
			page.getByRole('main').getByRole('link', { name: CONTACT.linkedinLink }),
		).toHaveAttribute('href', LINKEDIN_URL);
		await expect(status(page)).toBeEmpty();
		await expect(status(page)).toBeHidden();
	});

	// covers: AC-24
	test('holds the noscript line, with LinkedIn, above the form', async ({ page }) => {
		// Chromium under Playwright still parses <noscript> as text with scripts
		// off, so the test reads its markup; tests/contact-page.test.ts checks the order.
		await open(page);
		const noscript = (await page.locator('main noscript').textContent()) ?? '';

		expect(noscript).toContain(CONTACT.noScript);
		expect(noscript).toContain(`<a href="${LINKEDIN_URL}">${CONTACT.linkedinLink}</a>`);
	});

	// covers: AC-24
	test('makes outside requests only for the Turnstile script', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));
		await open(page);
		await expect.poll(() => turnstileCalls(page).then((calls) => calls?.render.length)).toBe(1);

		expect([...hosts].sort()).toEqual(
			[new URL(baseURL ?? '').host, 'challenges.cloudflare.com'].sort(),
		);
	});

	// covers: AC-4
	test('marks Contact current in the nav', async ({ page }) => {
		await open(page);

		await expect(
			page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact' }),
		).toHaveAttribute('aria-current', 'page');
	});
});

test.describe('Turnstile (AC-11)', () => {
	// covers: AC-11, AC-19
	test('renders explicitly with the contact action, managed and quiet, sized to the column', async ({
		page,
	}) => {
		await open(page);
		await expect.poll(() => turnstileCalls(page).then((calls) => calls?.render.length)).toBe(1);

		const [options] = (await turnstileCalls(page)).render;
		const siteKey = await page.locator('#contact-form').getAttribute('data-site-key');
		expect(options).toMatchObject({
			sitekey: siteKey,
			action: 'contact',
			appearance: 'interaction-only',
			theme: 'auto',
			size: 'flexible',
		});
	});

	// covers: AC-11
	test('uses the compact size when the column is under 300 pixels, and re-renders when it grows', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await open(page, 'never');
		await expect.poll(() => turnstileCalls(page).then((calls) => calls?.render.length)).toBe(1);
		expect((await turnstileCalls(page)).render[0].size).toBe('compact');

		await page.setViewportSize({ width: 768, height: 800 });
		await expect.poll(() => turnstileCalls(page).then((calls) => calls.render.length)).toBe(2);
		expect((await turnstileCalls(page)).render[1].size).toBe('flexible');
		expect((await turnstileCalls(page)).remove).toBe(1);
	});

	// covers: AC-11
	test('keeps the widget as it is when the width crosses 300 pixels while a token is held', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await open(page, 'ok');
		await expect.poll(() => turnstileCalls(page).then((calls) => calls?.render.length)).toBe(1);

		await page.setViewportSize({ width: 768, height: 800 });
		await page.waitForTimeout(300);

		expect((await turnstileCalls(page)).render).toHaveLength(1);
		expect((await turnstileCalls(page)).remove).toBe(0);
	});

	// covers: AC-11
	test('waits for a slow token with the button busy, then sends', async ({ page }) => {
		await open(page, 'slow');
		const requests = await answer(page, 200, { ok: true });
		await fillValid(page);
		await submit(page).click();

		const busy = page.getByRole('button', { name: CONTACT.sendingLabel });
		await expect(busy).toHaveAttribute('aria-busy', 'true');
		expect(requests).toHaveLength(0);
		await page.evaluate(() =>
			(window as unknown as { __turnstile: { issue: () => void } }).__turnstile.issue(),
		);

		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		expect(requests).toHaveLength(1);
	});

	// covers: AC-11
	test('shows checkFailed when no token arrives within 10 seconds', async ({ page }) => {
		await page.clock.install();
		await open(page, 'never');
		const requests = await answer(page, 200, { ok: true });
		await fillValid(page);
		await submit(page).click();
		await expect(page.getByRole('button', { name: CONTACT.sendingLabel })).toBeVisible();

		await page.clock.fastForward(10_000);

		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.checkFailed);
		await expect(status(page).getByRole('link', { name: CONTACT.linkedinLink })).toBeVisible();
		await expect(submit(page)).toBeVisible();
		expect(requests).toHaveLength(0);
		await expectTextKept(page);
	});

	// covers: AC-11
	test('asks the visitor to finish the check when the widget needs a tick', async ({ page }) => {
		await open(page, 'interactive');
		const requests = await answer(page, 200, { ok: true });
		await fillValid(page);
		await submit(page).click();

		await expect(status(page).getByRole('alert')).toHaveText(CONTACT.errors.checkPending);
		expect(requests).toHaveLength(0);
	});

	// covers: AC-11
	test('retries a widget error once, and sends when the retry gives a token', async ({ page }) => {
		await open(page, 'error-once');
		await answer(page, 200, { ok: true });
		await fillValid(page);
		await submit(page).click();

		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		expect((await turnstileCalls(page)).reset).toBeGreaterThanOrEqual(1);
	});

	for (const mode of ['error', 'throw', 'blocked'] as const) {
		// covers: AC-11
		test(`shows checkFailed with LinkedIn when the widget is ${mode}`, async ({ page }) => {
			await open(page, mode);
			const requests = await answer(page, 200, { ok: true });
			await fillValid(page);
			await submit(page).click();

			await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.checkFailed);
			await expect(status(page).getByRole('link', { name: CONTACT.linkedinLink })).toHaveAttribute(
				'href',
				LINKEDIN_URL,
			);
			expect(requests).toHaveLength(0);
		});
	}

	// covers: AC-11
	test('resets an expired token without a message, then sends with the new one', async ({
		page,
	}) => {
		await open(page, 'ok');
		const requests = await answer(page, 200, { ok: true });
		await expect.poll(() => turnstileCalls(page).then((calls) => calls?.render.length)).toBe(1);
		await page.evaluate(() =>
			(window as unknown as { __turnstile: { expire: () => void } }).__turnstile.expire(),
		);

		await expect(status(page)).toBeEmpty();
		expect((await turnstileCalls(page)).reset).toBe(1);
		await fillValid(page);
		await submit(page).click();

		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		expect(requests[0].postDataBuffer()?.toString()).toContain('stub-token-2');
	});
});

test.describe('validation in the browser (AC-6)', () => {
	// covers: AC-6
	test('sends nothing, marks every bad field and lists them in form order', async ({ page }) => {
		await open(page);
		const requests = await answer(page, 200, { ok: true });
		await submit(page).click();

		const alert = status(page).getByRole('alert');
		await expect(alert).toContainText(CONTACT.errorSummary);
		await expect(alert.getByRole('link')).toHaveText([
			CONTACT.errors.nameRequired,
			CONTACT.errors.emailRequired,
			CONTACT.errors.topicRequired,
			CONTACT.errors.messageRequired,
		]);
		await expect(status(page)).toBeFocused();
		await expect(name(page)).toHaveAttribute('aria-invalid', 'true');
		await expect(name(page)).toHaveAccessibleDescription(
			`${CONTACT.errorPrefix} ${CONTACT.errors.nameRequired}`,
		);
		await expect(message(page)).toHaveAccessibleDescription(
			`${CONTACT.messageHint} ${CONTACT.errorPrefix} ${CONTACT.errors.messageRequired}`,
		);
		for (const topic of TOPICS)
			await expect(page.getByLabel(topic.label)).toHaveAttribute('aria-invalid', 'true');
		expect(requests).toHaveLength(0);
	});

	// covers: AC-6
	test('focuses the field from its summary link, the first radio for the topic', async ({
		page,
	}) => {
		await open(page);
		await submit(page).click();

		await status(page).getByRole('link', { name: CONTACT.errors.topicRequired }).click();
		await expect(page.getByLabel(TOPICS[0].label)).toBeFocused();
		await status(page).getByRole('link', { name: CONTACT.errors.emailRequired }).click();
		await expect(email(page)).toBeFocused();
	});

	// covers: AC-6
	test('clears a field error as soon as that field changes', async ({ page }) => {
		await open(page);
		await submit(page).click();

		await name(page).fill('A');
		await expect(name(page)).not.toHaveAttribute('aria-invalid', /.*/);
		await expect(page.locator('#contact-name-error')).toBeHidden();
		await expect(email(page)).toHaveAttribute('aria-invalid', 'true');

		await page.getByLabel(TOPICS[2].label).check();
		await expect(page.getByLabel(TOPICS[0].label)).not.toHaveAttribute('aria-invalid', /.*/);
	});

	// covers: AC-6, AC-5
	test('uses the same rules as the Worker: a short message and a bad email', async ({ page }) => {
		await open(page);
		await name(page).fill('Ada');
		await email(page).fill('ada@example');
		await page.getByLabel(TOPICS[0].label).check();
		await message(page).fill('too short');
		await submit(page).click();

		await expect(status(page).getByRole('alert').getByRole('link')).toHaveText([
			CONTACT.errors.emailInvalid,
			CONTACT.errors.messageShort,
		]);
	});

	// covers: AC-3
	test('shows the counter from 4,500 characters', async ({ page }) => {
		await open(page);
		const counter = page.locator('#contact-message-counter');

		await message(page).fill('a'.repeat(4499));
		await expect(counter).toBeHidden();
		await message(page).fill('a'.repeat(4500));
		await expect(counter).toHaveText('500 characters left');
		await expect(counter).not.toHaveAttribute('aria-live', /.*/);
	});
});

test.describe('sending (AC-7, AC-8)', () => {
	// covers: AC-7, AC-8, AC-23
	test('fills and sends by keyboard alone, then confirms in a status region and clears', async ({
		page,
	}) => {
		await open(page);
		const requests = await answer(page, 200, { ok: true });
		await name(page).focus();

		await page.keyboard.type('Ada Lovelace');
		await page.keyboard.press('Tab');
		await page.keyboard.type('ada@example.com');
		await page.keyboard.press('Tab');
		await expect(page.getByLabel(TOPICS[0].label)).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByLabel(TOPICS[1].label)).toBeChecked();
		await page.keyboard.press('Tab');
		await expect(message(page)).toBeFocused();
		await page.keyboard.type('Hello, I have a project for you.');
		await page.keyboard.press('Tab');
		await expect(submit(page)).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		await expect(status(page)).toBeFocused();
		await expect(name(page)).toHaveValue('');
		await expect(message(page)).toHaveValue('');
		expect(requests).toHaveLength(1);
		const request = requests[0];
		expect(request.method()).toBe('POST');
		expect(request.headers()['accept']).toBe('application/json');
		expect(request.headers()['content-type']).toMatch(/^multipart\/form-data/);
		const body = request.postDataBuffer()?.toString() ?? '';
		for (const part of [
			'Ada Lovelace',
			'ada@example.com',
			'project',
			'Hello, I have a project for you.',
			'stub-token-1',
		]) {
			expect(body).toContain(part);
		}
		expect((await turnstileCalls(page)).reset).toBe(1);
	});

	// covers: AC-7
	test('keeps the fields read only while sending, and a second press sends nothing', async ({
		page,
	}) => {
		await open(page);
		const routes = await hold(page);
		await fillValid(page);
		await submit(page).click();

		const busy = page.getByRole('button', { name: CONTACT.sendingLabel });
		await expect(busy).toHaveAttribute('aria-busy', 'true');
		await expect(name(page)).toHaveAttribute('readonly', '');
		await expect(message(page)).toHaveAttribute('readonly', '');
		for (const topic of TOPICS) await expect(page.getByLabel(topic.label)).toBeDisabled();
		await busy.click();
		await busy.press('Enter');
		await expect.poll(() => routes.length).toBe(1);

		await routes[0].fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		await expect(name(page)).not.toHaveAttribute('readonly', /.*/);
		expect(routes).toHaveLength(1);
	});

	// covers: AC-7, AC-8
	test('gives up after 15 seconds as uncertain, and ignores a reply that arrives later', async ({
		page,
	}) => {
		await page.clock.install();
		await open(page);
		const routes = await hold(page);
		await fillValid(page);
		await submit(page).click();
		await expect.poll(() => routes.length).toBe(1);

		await page.clock.fastForward(15_000);

		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.uncertain);
		await routes[0]
			.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
			.catch(() => undefined);
		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.uncertain);
		await expect(name(page)).not.toHaveAttribute('readonly', /.*/);
		await expectTextKept(page);
	});

	// covers: AC-8
	test('shows the field errors from a 422', async ({ page }) => {
		await open(page);
		await answer(page, 422, {
			ok: false,
			error: 'invalid',
			fields: { email: 'invalid', phone: 'required' },
		});
		await fillValid(page);
		await submit(page).click();

		await expect(status(page).getByRole('alert').getByRole('link')).toHaveText([
			CONTACT.errors.emailInvalid,
		]);
		await expect(email(page)).toHaveAttribute('aria-invalid', 'true');
		await expectTextKept(page);
	});

	// covers: AC-8
	test('falls back on a 422 naming an unknown code, or no known field', async ({ page }) => {
		await open(page);
		await answer(page, 422, { ok: false, error: 'invalid', fields: { name: 'new_code' } });
		await fillValid(page);
		await submit(page).click();
		await expect(status(page).getByRole('alert').getByRole('link')).toHaveText([
			CONTACT.errors.fieldFallback,
		]);

		await page.unroute(API);
		await answer(page, 422, { ok: false, error: 'invalid', fields: { phone: 'required' } });
		await submit(page).click();
		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.notSent);
	});

	const OUTCOMES: readonly (readonly [string, number, unknown, string, boolean])[] = [
		['429', 429, { ok: false, error: 'rate_limited' }, CONTACT.errors.rateLimited, false],
		[
			'403 verification',
			403,
			{ ok: false, error: 'verification' },
			CONTACT.errors.verification,
			false,
		],
		['400', 400, { ok: false, error: 'bad_request' }, CONTACT.errors.notSent, true],
		['403 forbidden', 403, { ok: false, error: 'forbidden' }, CONTACT.errors.notSent, true],
		['404', 404, { ok: false, error: 'not_found' }, CONTACT.errors.notSent, true],
		['405', 405, { ok: false, error: 'method_not_allowed' }, CONTACT.errors.notSent, true],
		['502', 502, { ok: false, error: 'delivery' }, CONTACT.errors.notSent, true],
		['503', 503, { ok: false, error: 'unavailable' }, CONTACT.errors.notSent, true],
		['500', 500, { ok: false, error: 'unavailable' }, CONTACT.errors.uncertain, true],
		['a body that is not JSON', 200, '<html>oops</html>', CONTACT.errors.uncertain, true],
		['200 with ok false', 200, { ok: false, error: 'delivery' }, CONTACT.errors.uncertain, true],
	];

	for (const [label, code, body, words, linkedin] of OUTCOMES) {
		// covers: AC-8
		test(`answers ${label} in an alert, keeps the text and resets the widget`, async ({ page }) => {
			await open(page);
			await answer(page, code, body);
			await fillValid(page);
			await submit(page).click();

			const alert = status(page).getByRole('alert');
			await expect(alert).toContainText(words);
			await expect(status(page)).toBeFocused();
			await expect(alert.getByRole('link', { name: CONTACT.linkedinLink })).toHaveCount(
				linkedin ? 1 : 0,
			);
			await expectTextKept(page);
			expect((await turnstileCalls(page)).reset).toBe(1);
		});
	}

	// covers: AC-8
	test('answers a network error as uncertain', async ({ page }) => {
		await open(page);
		await page.route(API, (route) => route.abort('connectionreset'));
		await fillValid(page);
		await submit(page).click();

		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.uncertain);
		await expectTextKept(page);
	});

	// covers: AC-8
	test('sends again after a failure with a fresh token', async ({ page }) => {
		await open(page);
		const requests = await answer(page, 503, { ok: false, error: 'unavailable' });
		await fillValid(page);
		await submit(page).click();
		await expect(status(page).getByRole('alert')).toContainText(CONTACT.errors.notSent);

		await page.unroute(API);
		const second = await answer(page, 200, { ok: true });
		await submit(page).click();

		await expect(status(page).getByRole('status')).toHaveText(CONTACT.sent);
		expect(requests[0].postDataBuffer()?.toString()).toContain('stub-token-1');
		expect(second[0].postDataBuffer()?.toString()).toContain('stub-token-2');
	});
});

test.describe('accessibility (AC-23)', () => {
	for (const scheme of ['light', 'dark'] as const) {
		// covers: AC-23
		test(`finds no violations at rest and with field errors (${scheme})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page);
			expect((await scan(page)).violations).toEqual([]);

			await submit(page).click();
			await expect(status(page).getByRole('alert')).toBeVisible();
			expect((await scan(page)).violations).toEqual([]);
		});

		for (const [code, body] of [
			[200, { ok: true }],
			[429, { ok: false, error: 'rate_limited' }],
			[403, { ok: false, error: 'verification' }],
			[503, { ok: false, error: 'unavailable' }],
			[500, { ok: false, error: 'unavailable' }],
		] as const) {
			// covers: AC-23
			test(`finds no violations showing the ${code} outcome (${scheme})`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await open(page);
				await answer(page, code, body);
				await fillValid(page);
				await submit(page).click();
				await expect(status(page).locator('[role]')).toBeVisible();

				expect((await scan(page)).violations).toEqual([]);
			});
		}

		// covers: AC-23
		test(`finds no violations showing checkFailed (${scheme})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page, 'blocked');
			await fillValid(page);
			await submit(page).click();
			await expect(status(page).getByRole('alert')).toBeVisible();

			expect((await scan(page)).violations).toEqual([]);
		});
	}

	// covers: AC-3, AC-23
	test('gives every control at least a 24 by 24 target, and each radio row 2.75rem', async ({
		page,
	}) => {
		await open(page);

		for (const control of [name(page), email(page), message(page), submit(page)]) {
			const box = await control.boundingBox();
			expect(box && box.width >= 24 && box.height >= 24).toBe(true);
		}
		for (const topic of TOPICS) {
			const row = await page.locator(`label[for="contact-topic-${topic.value}"]`).boundingBox();
			expect(row?.height ?? 0).toBeGreaterThanOrEqual(44);
		}
	});

	// covers: AC-6
	test('shows errors in text and weight, not colour alone', async ({ page }) => {
		await open(page);
		await submit(page).click();

		const weight = await page
			.locator('#contact-name-error')
			.evaluate((element) => getComputedStyle(element).fontWeight);
		expect(Number(weight)).toBeGreaterThanOrEqual(600);
		await expect(page.locator('#contact-name-error')).toHaveText(
			`${CONTACT.errorPrefix} ${CONTACT.errors.nameRequired}`,
		);
	});
});
