import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { ABOUT, RESUME_PATH } from '../src/lib/about';
import { HOME } from '../src/lib/home';
import { SITE } from '../src/lib/site';

// Feature 10 in a real browser, against the production build served from
// dist/ (see playwright.config.ts). About current, axe, target sizes and the
// width sweep for /about live in the shared lists in design-system.spec.ts.

/** Whether the cleaned resume is in public/: the button shows only then. */
const hasResume = existsSync(`public${RESUME_PATH}`);

/** Opens `/about` at the given size, after the fonts have loaded. */
const open = async (page: Page, width: number, height = 800) => {
	await page.setViewportSize({ width, height });
	await page.goto('/about');
	await page.evaluate(() => document.fonts.ready);
};

/** Skips the test outside the desktop project: it sets its own viewport sizes. */
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');

test.describe('about page from the static build', () => {
	test('serves /about', async ({ request }) => {
		expect((await request.get('/about')).status()).toBe(200);
	});

	test('shows the intro, the whole story, the links out, then the closing action', async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto('/about');
		const main = page.getByRole('main');

		await expect(main.getByRole('heading', { level: 1 })).toHaveText(ABOUT.heading);
		await expect(main.getByText(ABOUT.lead)).toBeVisible();
		await expect(main.locator('.prose p').first()).toContainText('I’m Toyin Ogunseinde');
		await expect(main.locator('.prose')).toContainText('I didn’t start here');

		const links = main.locator('#links a');
		await expect(links).toHaveText(SITE.links.map((link) => link.label));
		for (const [i, link] of SITE.links.entries()) {
			await expect(links.nth(i)).toHaveAttribute('href', link.href);
		}

		await expect(main.locator('section').last()).toHaveAttribute('id', 'contact');
		await expect(main.locator('#contact h2')).toHaveText(ABOUT.closingHeading);
		await expect(main.getByRole('link', { name: SITE.contact.label })).toHaveCount(1);
		expect(errors).toEqual([]);
	});

	test('downloads the resume as a PDF, or shows no resume button while the file is missing', async ({
		page,
		request,
	}) => {
		await page.goto('/about');
		const resume = page.getByRole('main').getByRole('link', { name: ABOUT.resumeLabel });

		if (!hasResume) {
			await expect(resume).toHaveCount(0);
			await expect(page.locator(`a[href="${RESUME_PATH}"]`)).toHaveCount(0);
			expect((await request.get(RESUME_PATH)).status()).toBe(404);
			return;
		}
		await expect(resume).toHaveAttribute('href', RESUME_PATH);
		const [download] = await Promise.all([page.waitForEvent('download'), resume.click()]);
		expect(download.suggestedFilename()).toMatch(/\.pdf$/);
		expect(await download.failure()).toBeNull();
	});

	test('reaches the page from the home About section and from the nav', async ({ page }) => {
		await page.goto('/');
		await page.locator('#about').getByRole('link', { name: HOME.aboutLink }).click();
		await expect(page).toHaveURL(/\/about$/);

		await page.goto('/projects');
		await page
			.getByRole('navigation', { name: 'Main' })
			.getByRole('link', { name: 'About' })
			.click();
		await expect(page).toHaveURL(/\/about$/);
	});
});

test.describe('phone layout', () => {
	test('stretches the buttons to the content width below 640px, natural width from 640', async ({
		page,
	}) => {
		desktopOnly();
		for (const width of [375, 639, 640, 1024]) {
			await open(page, width);
			for (const name of hasResume
				? [ABOUT.resumeLabel, SITE.contact.label]
				: [SITE.contact.label]) {
				const [own, parent] = await page
					.getByRole('main')
					.getByRole('link', { name })
					.evaluate((el) => [
						el.getBoundingClientRect().width,
						(el.parentElement as HTMLElement).getBoundingClientRect().width,
					]);

				if (width < 640) expect(own, `${name} at ${width}px`).toBeCloseTo(parent ?? 0, 0);
				else expect(own, `${name} at ${width}px`).toBeLessThan(parent ?? 0);
			}
		}
	});

	test('shows the heading, and the resume button when there is one, on a 375 by 667 first screen', async ({
		page,
	}) => {
		desktopOnly();
		await open(page, 375, 667);

		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 });
		if (hasResume)
			await expect(
				page.getByRole('main').getByRole('link', { name: ABOUT.resumeLabel }),
			).toBeInViewport({ ratio: 1 });
	});
});

test.describe('accessibility', () => {
	test('has one h1, then the two section h2s, never skipping a level', async ({ page }) => {
		await page.goto('/about');

		const levels = await page
			.locator('main :is(h1, h2, h3, h4, h5, h6)')
			.evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))));
		expect(levels).toEqual([1, 2, 2]);
	});
});

test.describe('budget', () => {
	test('requests nothing from another host', async ({ page, baseURL }) => {
		const hosts = new Set<string>();
		page.on('request', (request) => hosts.add(new URL(request.url()).host));

		await page.goto('/about');
		await page.waitForLoadState('networkidle');

		expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
	});
});
