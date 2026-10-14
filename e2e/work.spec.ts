import { expect, test, type Page } from '@playwright/test';
import { SITE } from '../src/lib/site';
import { WORK } from '../src/lib/work';

// Spec 0005 in a real browser, against the production build served from dist/
// (see playwright.config.ts). Work current, axe, target sizes and the width
// sweep for /projects live in the shared lists in design-system.spec.ts.

/** Opens `/projects` at the given size, after the fonts have loaded. */
const open = async (page: Page, width: number, height = 800) => {
	await page.setViewportSize({ width, height });
	await page.goto('/projects');
	await page.evaluate(() => document.fonts.ready);
};

/** Skips the test outside the desktop project: it sets its own viewport sizes. */
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');

test.describe('addresses (AC-10)', () => {
	// covers: AC-10
	test('serves /projects and / and answers an unknown path with 404', async ({ request }) => {
		expect((await request.get('/projects')).status()).toBe(200);
		expect((await request.get('/')).status()).toBe(200);
		expect((await request.get('/no-such-page')).status()).toBe(404);
	});
});

test.describe('work listing from the static build', () => {
	// covers: AC-1, AC-3, AC-5, AC-6
	test('shows the intro, four cards in order with chips, then the closing action', async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto('/projects');
		const main = page.getByRole('main');

		await expect(main.getByRole('heading', { level: 1 })).toHaveText(WORK.heading);
		await expect(main.getByText(WORK.lead)).toBeVisible();
		await expect(main.locator('#projects article h2')).toHaveText([
			'Production Kubernetes on Hetzner Cloud',
			'Deployer, a deploy platform for AI coding agents',
			'ShipSafe, trust scores for AI written code',
			'Mool, a self hosted screen recorder',
		]);
		await expect(main.getByRole('list', { name: 'Stack' })).toHaveCount(4);
		await expect(
			main.getByRole('list', { name: 'Stack' }).first().getByRole('listitem'),
		).toHaveText(['Kubernetes', 'Talos Linux', 'Terraform', 'Hetzner Cloud', 'Argo CD']);

		const contact = main.getByRole('link', { name: SITE.contact.label });
		await expect(contact).toHaveCount(1);
		await expect(main.locator('section').last()).toHaveAttribute('id', 'contact');
		await expect(main.locator('#contact h2')).toHaveText(WORK.closingHeading);
		expect(errors).toEqual([]);
	});
});

test.describe('layout (AC-8, AC-12)', () => {
	// covers: AC-12
	test('sets the cards one, two, then three per row, image on top', async ({ page }) => {
		desktopOnly();
		for (const [width, rows] of [
			[767, 3],
			[768, 2],
			[1023, 2],
			[1024, 1],
		] as const) {
			await open(page, width);

			const tops = await page
				.locator('#projects li:has(article)')
				.evaluateAll((items) =>
					items.slice(0, 3).map((li) => Math.round(li.getBoundingClientRect().top)),
				);
			expect(new Set(tops).size, `at ${width}px`).toBe(rows);

			const [image, kind] = await page
				.locator('#projects article')
				.first()
				.evaluate((article) => [
					article.querySelector('img')?.getBoundingClientRect().bottom ?? Infinity,
					article.querySelector('p')?.getBoundingClientRect().top ?? 0,
				]);
			expect(image, `at ${width}px`).toBeLessThanOrEqual(kind);
		}
	});

	// covers: AC-8
	test('keeps every chip list inside its card at 320 pixels', async ({ page }) => {
		desktopOnly();
		await open(page, 320);

		const edges = await page
			.locator('#projects li:has(article)')
			.evaluateAll((items) =>
				items.map((li) => [
					li.getBoundingClientRect().right,
					li.querySelector('ul[aria-label="Stack"]')?.getBoundingClientRect().right ?? Infinity,
					Math.max(
						...[...li.querySelectorAll('ul[aria-label="Stack"] li')].map(
							(chip) => chip.getBoundingClientRect().right,
						),
					),
				]),
			);
		expect(edges).toHaveLength(4);
		for (const [card, list, chip] of edges) {
			expect(list).toBeLessThanOrEqual(card ?? 0);
			expect(chip).toBeLessThanOrEqual(card ?? 0);
		}
	});

	// covers: AC-12
	test('fills the content width with the closing button below 640px, natural width from 640px', async ({
		page,
	}) => {
		desktopOnly();
		for (const width of [320, 639, 640, 1024]) {
			await open(page, width);
			const [own, parent] = await page
				.getByRole('main')
				.getByRole('link', { name: SITE.contact.label })
				.evaluate((el) => [
					el.getBoundingClientRect().width,
					(el.parentElement as HTMLElement).getBoundingClientRect().width,
				]);

			if (width < 640) expect(own, `at ${width}px`).toBeCloseTo(parent ?? 0, 0);
			else expect(own, `at ${width}px`).toBeLessThan((parent ?? 0) / 2);
		}
	});
});

test.describe('accessibility (AC-13)', () => {
	// covers: AC-13
	test('has one h1, an h2 per card and the closing h2, never skipping a level', async ({
		page,
	}) => {
		await page.goto('/projects');

		const levels = await page
			.locator('main :is(h1, h2, h3, h4, h5, h6)')
			.evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))));
		expect(levels).toEqual([1, 2, 2, 2, 2, 2]);
	});
});

test.describe('budget (AC-14)', () => {
	// covers: AC-14
	test('requests nothing from another host, images included', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));

		await page.goto('/projects');
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForLoadState('networkidle');

		expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
		const loaded = await page
			.locator('#projects img')
			.evaluateAll((images) => images.every((img) => (img as HTMLImageElement).complete));
		expect(loaded).toBe(true);
	});
});
