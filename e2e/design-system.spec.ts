import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Spec 0003 in a real browser, against the production build served from dist/
// (see playwright.config.ts).

const DARK_BG = 'oklch(17% 0.006 65)';
const LIGHT_BG = 'oklch(98.5% 0.006 85)';

/** The computed form of a CSS colour, so it can be compared with a computed style. */
const computed = (page: Page, colour: string) =>
	page.evaluate((value) => {
		const probe = document.createElement('i');
		probe.style.color = value;
		document.documentElement.append(probe);
		const result = getComputedStyle(probe).color;
		probe.remove();
		return result;
	}, colour);

const background = (page: Page) =>
	page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

const dataTheme = (page: Page) => page.locator('html').getAttribute('data-theme');

const toggle = (page: Page) => page.getByRole('button', { name: 'Dark theme' });

/**
 * Collects console errors and page errors for the test. Chrome's own log line
 * for a 404 document response is expected on the 404 page, so it is skipped.
 */
const watchErrors = (page: Page) => {
	const errors: string[] = [];
	page.on('console', (msg) => {
		const own404 = msg
			.text()
			.startsWith('Failed to load resource: the server responded with a status of 404');
		if (msg.type() === 'error' && !own404) errors.push(msg.text());
	});
	page.on('pageerror', (err) => errors.push(err.message));
	return errors;
};

test.describe('device theme (AC-4)', () => {
	// covers: AC-4, AC-6
	test('follows a dark device with JavaScript off, and hides the toggle', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
		const page = await context.newPage();
		await page.goto('/');

		expect(await dataTheme(page)).toBeNull();
		expect(await background(page)).toBe(await computed(page, DARK_BG));
		await expect(page.locator('[data-theme-toggle]')).toBeHidden();
		await context.close();
	});

	// covers: AC-4
	test('follows a light device with JavaScript on', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');

		expect(await dataTheme(page)).toBeNull();
		expect(await background(page)).toBe(await computed(page, LIGHT_BG));
	});

	// covers: AC-4, AC-6
	test('follows a device change live while nothing is stored', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');

		await page.emulateMedia({ colorScheme: 'dark' });

		await expect.poll(() => background(page)).toBe(await computed(page, DARK_BG));
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('[data-icon="moon"]')).toBeVisible();

		await page.emulateMedia({ colorScheme: 'light' });

		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('[data-icon="sun"]')).toBeVisible();
	});
});

test.describe('remembered theme (AC-5)', () => {
	for (const stored of ['light', 'dark'] as const) {
		// covers: AC-5
		test(`applies a stored ${stored} theme before <body> exists`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: stored === 'dark' ? 'light' : 'dark' });
			await page.addInitScript((value) => {
				localStorage.setItem('theme', value);
				const observer = new MutationObserver(() => {
					if (document.body) {
						(window as unknown as { themeAtBody: string | null }).themeAtBody =
							document.documentElement.getAttribute('data-theme');
						observer.disconnect();
					}
				});
				observer.observe(document, { childList: true, subtree: true });
			}, stored);
			await page.goto('/');

			expect(
				await page.evaluate(() => (window as unknown as { themeAtBody: string }).themeAtBody),
			).toBe(stored);
			expect(await background(page)).toBe(
				await computed(page, stored === 'dark' ? DARK_BG : LIGHT_BG),
			);
		});
	}

	// covers: AC-5
	test('ignores a stored value that is not light or dark', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript(() => localStorage.setItem('theme', 'blue'));
		await page.goto('/');

		expect(await dataTheme(page)).toBeNull();
		expect(await background(page)).toBe(await computed(page, DARK_BG));
	});

	// covers: AC-5
	test('follows the device when reading storage throws', async ({ page }) => {
		const errors = watchErrors(page);
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.addInitScript(() => {
			Storage.prototype.getItem = () => {
				throw new DOMException('blocked', 'SecurityError');
			};
		});
		await page.goto('/');

		expect(await dataTheme(page)).toBeNull();
		expect(await background(page)).toBe(await computed(page, DARK_BG));
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
		expect(errors).toEqual([]);
	});
});

test.describe('theme toggle (AC-6)', () => {
	// covers: AC-6, AC-19
	test('flips the theme, and the choice survives a reload and the 404 page', async ({ page }) => {
		const errors = watchErrors(page);
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');

		await toggle(page).click();

		expect(await dataTheme(page)).toBe('light');
		expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('[data-icon="sun"]')).toBeVisible();
		await expect(page.locator('[data-icon="moon"]')).toBeHidden();
		expect(await background(page)).toBe(await computed(page, LIGHT_BG));

		await page.reload();
		expect(await dataTheme(page)).toBe('light');
		expect(await background(page)).toBe(await computed(page, LIGHT_BG));

		const response = await page.goto('/no-such-page');
		expect(response?.status()).toBe(404);
		expect(await dataTheme(page)).toBe('light');
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
		expect(errors).toEqual([]);
	});

	// covers: AC-6
	test('ignores device changes once a theme is pinned', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await toggle(page).click();

		await page.emulateMedia({ colorScheme: 'light' });
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.emulateMedia({ colorScheme: 'light' });

		expect(await dataTheme(page)).toBe('dark');
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
	});

	for (const key of ['Enter', 'Space'] as const) {
		// covers: AC-6
		test(`flips the theme with ${key}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: 'light' });
			await page.goto('/');
			await toggle(page).focus();

			await page.keyboard.press(key);

			expect(await dataTheme(page)).toBe('dark');
			await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
		});
	}

	// covers: AC-6
	test('still flips this page, with no console error, when storing throws', async ({ page }) => {
		const errors = watchErrors(page);
		await page.emulateMedia({ colorScheme: 'light' });
		await page.addInitScript(() => {
			Storage.prototype.setItem = () => {
				throw new DOMException('full', 'QuotaExceededError');
			};
		});
		await page.goto('/');

		await toggle(page).click();

		expect(await dataTheme(page)).toBe('dark');
		expect(await background(page)).toBe(await computed(page, DARK_BG));
		expect(errors).toEqual([]);
	});
});

test.describe('fonts (AC-7)', () => {
	// covers: AC-7
	test('sets body text in Inter at 18px and headings and the wordmark in Source Serif 4', async ({
		page,
	}) => {
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);

		const body = await page.evaluate(() => {
			const style = getComputedStyle(document.body);
			return { family: style.fontFamily, size: style.fontSize };
		});
		expect(body.family).toContain('Inter Variable');
		expect(body.size).toBe('18px');
		for (const selector of ['h1', '[data-wordmark]']) {
			const family = await page.locator(selector).evaluate((el) => getComputedStyle(el).fontFamily);
			expect(family).toContain('Source Serif 4 Variable');
		}
		const loaded = await page.evaluate(() =>
			[...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family),
		);
		expect(loaded.some((family) => family.includes('Inter Variable'))).toBe(true);
		expect(loaded.some((family) => family.includes('Source Serif 4 Variable'))).toBe(true);
	});

	// covers: AC-7
	test('makes no request to any other host', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));

		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);
		await page.goto('/no-such-page');

		expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
	});
});

test.describe('keyboard (AC-9, AC-10)', () => {
	const focused = (page: Page) =>
		page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null;
			return {
				text: el?.textContent?.trim() ?? '',
				tag: el?.tagName ?? '',
				id: el?.id ?? '',
				inHeader: !!el?.closest('header'),
				outlineStyle: el ? getComputedStyle(el).outlineStyle : '',
				outlineWidth: el ? getComputedStyle(el).outlineWidth : '',
			};
		});

	for (const scheme of ['light', 'dark'] as const) {
		// covers: AC-9, AC-10
		test(`tabs through skip link, wordmark, Home, Work and toggle, each with the ring (${scheme})`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');

			await page.keyboard.press('Tab');
			const skip = await focused(page);
			expect(skip.text).toBe('Skip to content');
			const box = await page.getByRole('link', { name: 'Skip to content' }).boundingBox();
			expect(box && box.width > 1 && box.height > 1 && box.y >= 0).toBe(true);

			await page.keyboard.press('Tab');
			expect((await focused(page)).text).toBe('Toyin Ogunseinde');

			await page.keyboard.press('Tab');
			const home = await focused(page);
			expect(home.text).toBe('Home');
			expect(home.inHeader).toBe(true);

			await page.keyboard.press('Tab');
			const work = await focused(page);
			expect(work.text).toBe('Work');
			expect(work.inHeader).toBe(true);

			await page.keyboard.press('Tab');
			const about = await focused(page);
			expect(about.text).toBe('About');
			expect(about.inHeader).toBe(true);

			await page.keyboard.press('Tab');
			const toggleFocus = await focused(page);
			expect(toggleFocus.tag).toBe('BUTTON');

			for (const state of [skip, home, work, about, toggleFocus]) {
				expect(state.outlineStyle).toBe('solid');
				expect(state.outlineWidth).toBe('2px');
			}
		});
	}

	// covers: AC-10
	test('the skip link moves focus to main, and the next Tab stays out of the header', async ({
		page,
	}) => {
		await page.goto('/no-such-page');

		await page.keyboard.press('Tab');
		await page.keyboard.press('Enter');
		expect((await focused(page)).id).toBe('main');

		await page.keyboard.press('Tab');
		const next = await focused(page);
		expect(next.text).toBe('Go to the home page');
		expect(next.inHeader).toBe(false);
		expect(next.outlineStyle).toBe('solid');
		expect(next.outlineWidth).toBe('2px');
	});

	// covers: AC-10
	test('on the home page, Tab after the skip link goes to the first link in main', async ({
		page,
	}) => {
		await page.goto('/');

		await page.keyboard.press('Tab');
		await page.keyboard.press('Enter');
		expect((await focused(page)).id).toBe('main');

		await page.keyboard.press('Tab');
		const next = await focused(page);
		expect(next.inHeader).toBe(false);
		expect(next.text).toBe('Message me on LinkedIn');
	});
});

test.describe('layout (AC-13)', () => {
	const WIDTHS = [320, 360, 375, 639, 640, 768, 1024, 1440];

	// covers: AC-13
	test('never scrolls sideways and no box exceeds 72rem', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', 'the sweep sets its own widths');
		for (const path of [
			'/',
			'/projects',
			'/about',
			'/projects/hetzner-talos-cluster',
			'/projects/deployer',
			'/no-such-page',
		]) {
			for (const width of WIDTHS) {
				await page.setViewportSize({ width, height: 800 });
				await page.goto(path);

				const sizes = await page.evaluate(() => ({
					scroll: document.documentElement.scrollWidth,
					widest: Math.max(
						...[...document.querySelectorAll('header > *, main *, footer > *')].map(
							(el) => el.getBoundingClientRect().width,
						),
					),
				}));
				expect(sizes.scroll, `${path} at ${width}px`).toBe(width);
				expect(sizes.widest, `${path} at ${width}px`).toBeLessThanOrEqual(72 * 16);
			}
		}
	});

	// covers: AC-13 (spec 0004, AC-10; spec 0005, AC-9)
	test('puts the nav links on a second header row at 639px and on one row at 640px', async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', 'the sweep sets its own widths');
		const middle = (box: { y: number; height: number } | null) =>
			box ? box.y + box.height / 2 : NaN;
		for (const [width, rows] of [
			[639, 2],
			[640, 1],
		] as const) {
			await page.setViewportSize({ width, height: 800 });
			await page.goto('/');

			const wordmark = middle(await page.locator('[data-wordmark]').boundingBox());
			const button = middle(await toggle(page).boundingBox());
			const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
			const home = middle(await links.first().boundingBox());
			const last = middle(await links.last().boundingBox());
			expect(Math.abs(wordmark - button), `at ${width}px`).toBeLessThan(4);
			expect(Math.abs(home - last), `at ${width}px`).toBeLessThan(4);
			if (rows === 1) expect(Math.abs(home - wordmark), `at ${width}px`).toBeLessThan(4);
			else expect(home - wordmark, `at ${width}px`).toBeGreaterThan(20);
		}
	});

	// covers: spec 0004, AC-10; spec 0005, AC-9; feature 10
	test('marks only the nav link for the page you are on as current', async ({ page }) => {
		const nav = page.getByRole('navigation', { name: 'Main' });
		const links = { '/': 'Home', '/projects': 'Work', '/about': 'About' } as const;

		for (const path of ['/', '/projects', '/about', '/no-such-page']) {
			await page.goto(path);
			for (const [href, name] of Object.entries(links)) {
				const link = nav.getByRole('link', { name });
				if (href === path) await expect(link, path).toHaveAttribute('aria-current', 'page');
				else await expect(link, path).not.toHaveAttribute('aria-current', /.*/);
			}
		}
	});
});

test.describe('motion (AC-16)', () => {
	const recordReveal = (page: Page) =>
		page.addInitScript(() => {
			addEventListener('pagereveal', (event) => {
				const reveal = event as Event & { viewTransition: unknown };
				(window as unknown as { reveal: object }).reveal = {
					transition: reveal.viewTransition !== null,
					animations: document.getAnimations().length,
				};
			});
		});

	const reveal = (page: Page) =>
		page.evaluate(
			() => (window as unknown as { reveal?: { transition: boolean; animations: number } }).reveal,
		);

	// covers: AC-16
	test('cross fades between pages when motion is allowed', async ({ page }) => {
		await recordReveal(page);
		await page.goto('/no-such-page');

		await page.getByRole('link', { name: 'Go to the home page' }).click();
		await page.waitForURL('/');

		await expect.poll(async () => (await reveal(page))?.transition).toBe(true);
	});

	// covers: AC-16
	test('runs no view transition and no animations under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await recordReveal(page);
		await page.goto('/no-such-page');

		await page.getByRole('link', { name: 'Go to the home page' }).click();
		await page.waitForURL('/');

		await expect.poll(() => reveal(page)).toEqual({ transition: false, animations: 0 });
	});
});

test.describe('404 page (AC-19)', () => {
	// covers: AC-19
	test('answers an unknown path with status 404 and the designed page', async ({ page }) => {
		const response = await page.goto('/this/does/not/exist');

		expect(response?.status()).toBe(404);
		await expect(page).toHaveTitle('Page not found');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist');
		await expect(page.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
			'href',
			'/',
		);
	});
});

test.describe('accessibility, WCAG 2.2 AA (AC-20)', () => {
	const scan = (page: Page) =>
		new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();

	for (const scheme of ['light', 'dark'] as const) {
		for (const path of [
			'/',
			'/projects',
			'/about',
			'/projects/hetzner-talos-cluster',
			'/projects/deployer',
			'/no-such-page',
		]) {
			// covers: AC-20
			test(`finds no violations on ${path} in ${scheme}`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(path);

				expect((await scan(page)).violations).toEqual([]);
			});
		}
	}

	// covers: AC-20
	test('finds no violations with the skip link focused', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('Tab');

		expect((await scan(page)).violations).toEqual([]);
	});

	// covers: AC-20
	test('gives every header, footer and button target at least 24 by 24 pixels', async ({
		page,
	}) => {
		for (const path of [
			'/',
			'/projects',
			'/about',
			'/projects/hetzner-talos-cluster',
			'/projects/deployer',
			'/no-such-page',
		]) {
			await page.goto(path);
			const targets = page.locator(
				'header a, header button, footer a, footer button, main a.inline-flex, main article a, main button',
			);
			expect(await targets.count()).toBeGreaterThan(0);
			for (const target of await targets.all()) {
				const box = await target.boundingBox();
				expect(box?.width, (await target.textContent()) ?? '').toBeGreaterThanOrEqual(24);
				expect(box?.height, (await target.textContent()) ?? '').toBeGreaterThanOrEqual(24);
			}
		}
	});
});
