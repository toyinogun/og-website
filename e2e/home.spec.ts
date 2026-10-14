import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { HOME } from '../src/lib/home';
import { SITE } from '../src/lib/site';

// The home page (spec 0004), against the production build served from dist/
// (see playwright.config.ts).

const heroButton = (page: Page) =>
	page.getByRole('main').getByRole('link', { name: SITE.contact.label }).first();

const firstCover = (page: Page) => page.locator('#selected-work img').first();

/** Opens `/` at the given size, after the fonts have loaded. */
const open = async (page: Page, width: number, height: number) => {
	await page.setViewportSize({ width, height });
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);
};

/** Skips the test outside the desktop project: it sets its own viewport sizes. */
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');

/** Whether the box sits fully inside the viewport. */
const fullyVisible = async (page: Page, locator: Locator) => {
	const box = await locator.boundingBox();
	const viewport = page.viewportSize();
	return (
		!!box &&
		!!viewport &&
		box.x >= 0 &&
		box.y >= 0 &&
		box.x + box.width <= viewport.width &&
		box.y + box.height <= viewport.height
	);
};

test.describe('home page from the static build', () => {
	// covers: AC-1, AC-3, AC-4, AC-7, AC-9
	test('shows intro, selected work, about and the closing action, in order, with no errors', async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(msg.text());
		});
		page.on('pageerror', (err) => errors.push(err.message));

		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(HOME.title);
		const main = page.getByRole('main');
		await expect(main.getByText(HOME.availability)).toBeVisible();
		await expect(main.getByRole('heading', { level: 1 })).toHaveText(HOME.heading);
		await expect(main.getByText(HOME.lead)).toBeVisible();
		const contact = main.getByRole('link', { name: SITE.contact.label });
		await expect(contact).toHaveCount(2);
		for (const link of await contact.all()) {
			await expect(link).toHaveAttribute('href', SITE.contact.href);
			await expect(link).not.toHaveAttribute('target', /.*/);
		}
		await expect(page.locator('#selected-work h3')).toHaveText([
			'Production Kubernetes on Hetzner Cloud',
			'Deployer, a deploy platform for AI coding agents',
			'ShipSafe, trust scores for AI written code',
		]);
		await expect(page.locator('#about p')).toHaveCount(1);
		await expect(page.locator('#about p')).toContainText("I'm Toyin Ogunseinde");
		await expect(main).not.toContainText("I didn't start here");
		await expect(page.locator('#about a')).toHaveText(HOME.aboutLink);
		await expect(page.locator('#about a')).toHaveAttribute('href', '/about');

		const ids = await main.locator('section').evaluateAll((sections) => sections.map((s) => s.id));
		expect(ids).toEqual(['selected-work', 'about', 'contact']);
		await expect(page.locator('#contact')).toContainText(HOME.closingText);
		expect(errors).toEqual([]);
	});

	// covers: AC-6
	test('gives each card link out a unique name, and each title its project page', async ({
		page,
	}) => {
		await page.goto('/');

		const links = page.locator('#selected-work article a:not([href^="/projects/"])');
		const names = await links.evaluateAll((anchors) =>
			anchors.map((a) => a.textContent?.replace(/\s+/g, ' ').trim()),
		);
		expect(names).toEqual([
			'Code for Deployer, a deploy platform for AI coding agents',
			'Code for ShipSafe, trust scores for AI written code',
		]);
		await expect(page.locator('#selected-work article h3 a')).toHaveText([
			'Production Kubernetes on Hetzner Cloud',
			'Deployer, a deploy platform for AI coding agents',
			'ShipSafe, trust scores for AI written code',
		]);
		const hrefs = await page
			.locator('#selected-work article h3 a')
			.evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')));
		expect(hrefs).toEqual([
			'/projects/hetzner-talos-cluster',
			'/projects/deployer',
			'/projects/shipsafe',
		]);
	});

	// covers: AC-5
	test('points the canonical URL at the production origin', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://toyintest.org/',
		);
	});

	// covers: AC-1
	test('caps the intro at the reading width inside a page width container', async ({ page }) => {
		await page.goto('/');

		const intro = page.locator('main h1').locator('..');
		await expect(intro).toHaveCSS('max-width', '672px');
		await expect(page.getByRole('main').locator('> div').first()).toHaveCSS('max-width', '1152px');
		await expect(page.locator('body')).toHaveCSS('display', 'flex');
	});

	// covers: AC-3
	test('ships no Worker bundle in the build output', async ({ request }) => {
		const response = await request.get('/_worker.js');

		expect(response.status()).toBe(404);
	});

	test('returns 404 for a page that does not exist', async ({ request }) => {
		const response = await request.get('/no-such-page/');

		expect(response.status()).toBe(404);
	});

	test('serves the favicon and the touch icon', async ({ request }) => {
		expect((await request.get('/favicon.svg')).status()).toBe(200);
		expect((await request.get('/apple-touch-icon.png')).status()).toBe(200);
	});

	test('fits the viewport with no horizontal scroll', async ({ page }) => {
		await page.goto('/');

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});

test.describe('above the fold (AC-14)', () => {
	for (const [width, height] of [
		[1280, 800],
		[1440, 900],
	] as const) {
		// covers: AC-14
		test(`shows the heading, the button and the top of the first cover at ${width} by ${height}`, async ({
			page,
		}) => {
			desktopOnly();
			await open(page, width, height);

			expect(await fullyVisible(page, page.locator('main h1')), 'heading').toBe(true);
			expect(await fullyVisible(page, heroButton(page)), 'button').toBe(true);
			const cover = await firstCover(page).boundingBox();
			expect(cover && cover.y < height, 'first cover').toBe(true);
		});
	}

	// covers: AC-14
	test('shows the whole hero button on a 375 by 667 phone without scrolling', async ({ page }) => {
		desktopOnly();
		await open(page, 375, 667);

		expect(await fullyVisible(page, heroButton(page))).toBe(true);
	});
});

test.describe('layout (AC-15)', () => {
	// covers: AC-15
	test('never scrolls sideways across the width sweep', async ({ page }) => {
		desktopOnly();
		for (const width of [320, 360, 375, 639, 640, 768, 1024, 1440]) {
			await open(page, width, 800);

			const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(scroll, `at ${width}px`).toBe(width);
		}
	});

	// covers: AC-15
	test('fills the content width with the buttons below 640px, natural width from 640px', async ({
		page,
	}) => {
		desktopOnly();
		for (const width of [320, 639, 640, 1024]) {
			await open(page, width, 800);
			const buttons = page.getByRole('main').getByRole('link', { name: SITE.contact.label });

			for (const button of await buttons.all()) {
				const [own, parent] = await button.evaluate((el) => [
					el.getBoundingClientRect().width,
					(el.parentElement as HTMLElement).getBoundingClientRect().width,
				]);
				if (width < 640) expect(own, `at ${width}px`).toBeCloseTo(parent, 0);
				else expect(own, `at ${width}px`).toBeLessThan(parent / 2);
			}
		}
	});

	// covers: AC-15
	test('sets the cards one, two, then three per row, image on top', async ({ page }) => {
		desktopOnly();
		for (const [width, perRow] of [
			[375, 1],
			[767, 1],
			[768, 2],
			[1023, 2],
			[1024, 3],
			[1440, 3],
		] as const) {
			await open(page, width, 800);

			const tops = await page
				.locator('#selected-work li')
				.evaluateAll((items) => items.map((li) => Math.round(li.getBoundingClientRect().top)));
			expect(
				tops.filter((top) => top === tops[0]),
				`at ${width}px`,
			).toHaveLength(perRow);

			const [image, kind] = await page
				.locator('#selected-work article')
				.first()
				.evaluate((article) => [
					article.querySelector('img')?.getBoundingClientRect().bottom ?? Infinity,
					article.querySelector('p')?.getBoundingClientRect().top ?? 0,
				]);
			expect(image, `at ${width}px`).toBeLessThanOrEqual(kind);
		}
	});
});

test.describe('accessibility (AC-16)', () => {
	// covers: AC-16
	test('has one h1 and headings that never skip a level', async ({ page }) => {
		await page.goto('/');

		const levels = await page
			.locator('main :is(h1, h2, h3, h4, h5, h6)')
			.evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))));
		expect(levels.filter((level) => level === 1)).toHaveLength(1);
		expect(levels[0]).toBe(1);
		for (const [index, level] of levels.entries()) {
			if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 1) + 1);
		}
	});

	for (const scheme of ['light', 'dark'] as const) {
		// covers: AC-16
		test(`finds no WCAG 2.2 AA violations in ${scheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto('/');

			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(results.violations).toEqual([]);
		});
	}

	// covers: AC-16
	test('gives every link and button in main a target of at least 24 by 24 pixels', async ({
		page,
	}) => {
		await page.goto('/');

		const targets = page.locator('main a, main button');
		expect(await targets.count()).toBeGreaterThan(0);
		for (const target of await targets.all()) {
			const box = await target.boundingBox();
			const name = (await target.textContent()) ?? '';
			expect(box?.width, name).toBeGreaterThanOrEqual(24);
			expect(box?.height, name).toBeGreaterThanOrEqual(24);
		}
	});
});

test.describe('budget (AC-17)', () => {
	// covers: AC-17
	test('requests nothing from another host, images included', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));

		await page.goto('/');
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForLoadState('networkidle');

		expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
		const loaded = await page
			.locator('#selected-work img')
			.evaluateAll((images) => images.every((img) => (img as HTMLImageElement).complete));
		expect(loaded).toBe(true);
	});
});
