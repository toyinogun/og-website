import { expect, test, type Page } from '@playwright/test';
import { SERVICES_PAGE } from '../src/lib/services';
import { SITE } from '../src/lib/site';

// Feature 13 (spec 0008) in a real browser, against the production build
// served from dist/ (see playwright.config.ts). Services current, axe, target
// sizes and the width sweep for /services live in the shared lists in
// design-system.spec.ts.

/** Opens `/services` at the given size, after the fonts have loaded. */
const open = async (page: Page, width: number, height = 800) => {
	await page.setViewportSize({ width, height });
	await page.goto('/services');
	await page.evaluate(() => document.fonts.ready);
};

/** Skips the test outside the desktop project: it sets its own viewport sizes. */
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');

test.describe('services page from the static build', () => {
	test('shows the intro, offers, steps, pricing, then the closing action, in order', async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto('/services');
		const main = page.getByRole('main');

		await expect(main.getByRole('heading', { level: 1 })).toHaveText(SERVICES_PAGE.heading);
		await expect(main.getByText(SERVICES_PAGE.availability)).toBeVisible();
		await expect(main.locator('section')).toHaveCount(4);
		await expect(main.locator('section h2')).toHaveText([
			SERVICES_PAGE.offersHeading,
			SERVICES_PAGE.stepsHeading,
			SERVICES_PAGE.pricingHeading,
			SERVICES_PAGE.closingHeading,
		]);
		await expect(main.locator('#offers h3')).toHaveText(SERVICES_PAGE.offers.map((o) => o.name));
		await expect(main.locator('#how li > h3')).toHaveText(SERVICES_PAGE.steps.map((s) => s.title));
		await expect(main.locator('#pricing li > h3')).toHaveText(
			SERVICES_PAGE.pricing.map((m) => m.title),
		);
		await expect(main.getByRole('link', { name: SITE.contact.label })).toHaveCount(2);
		await expect(main.locator('section').last()).toHaveAttribute('id', 'contact');
		expect(errors).toEqual([]);
	});

	test('goes h1, then h2 per section, then h3, without skipping a level', async ({ page }) => {
		await page.goto('/services');
		const levels = await page
			.getByRole('main')
			.locator('h1, h2, h3, h4, h5, h6')
			.evaluateAll((els) => els.map((el) => Number(el.tagName.slice(1))));

		expect(levels[0]).toBe(1);
		levels.slice(1).forEach((level, i) => expect(level - (levels[i] ?? 0)).toBeLessThanOrEqual(1));
		expect(levels.filter((level) => level === 1)).toHaveLength(1);
	});

	test('opens a project page from a Seen in link', async ({ page }) => {
		await page.goto('/services');
		const proof = page.getByRole('list', { name: 'Seen in: Delivery pipelines and GitOps' });
		const link = proof.getByRole('link').first();
		const title = (await link.textContent())?.trim() ?? '';

		await link.click();
		await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
	});

	test('requests nothing from another host', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));
		await page.goto('/services');
		await page.waitForLoadState('networkidle');

		expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
	});
});

test.describe('phone layout', () => {
	test('stretches both buttons to the content width below 640px, natural width from 640', async ({
		page,
	}) => {
		desktopOnly();
		for (const width of [375, 639, 640, 1024]) {
			await open(page, width);
			const buttons = page.getByRole('main').getByRole('link', { name: SITE.contact.label });

			for (const index of [0, 1]) {
				const [own, parent] = await buttons
					.nth(index)
					.evaluate((el) => [
						el.getBoundingClientRect().width,
						(el.parentElement as HTMLElement).getBoundingClientRect().width,
					]);

				if (width < 640) expect(own, `button ${index} at ${width}px`).toBeCloseTo(parent ?? 0, 0);
				else expect(own, `button ${index} at ${width}px`).toBeLessThan(parent ?? 0);
			}
		}
	});

	test('wraps the Seen in links inside the reading column at 320px', async ({ page }) => {
		desktopOnly();
		await open(page, 320);
		const column = await page.getByRole('main').locator('#offers').boundingBox();
		const boxes = await page.locator('#offers ul[aria-label] a').evaluateAll((els) =>
			els.map((el) => {
				const { left, right } = el.getBoundingClientRect();
				return { left, right };
			}),
		);

		expect(boxes.length).toBeGreaterThan(0);
		for (const box of boxes) {
			expect(box.left).toBeGreaterThanOrEqual(column?.x ?? 0);
			expect(box.right).toBeLessThanOrEqual((column?.x ?? 0) + (column?.width ?? 0) + 1);
		}
	});
});
