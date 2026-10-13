import { expect, test } from '@playwright/test';

// Runs against the production build served from dist/ (see playwright.config.ts).

test.describe('home page from the static build', () => {
	// covers: AC-2, AC-3
	test('renders the placeholder page with no console errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(msg.text());
		});
		page.on('pageerror', (err) => errors.push(err.message));

		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Toyin Ogunseinde');
		await expect(page.getByRole('heading', { level: 1, name: 'Toyin Ogunseinde' })).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
		expect(errors).toEqual([]);
	});

	// covers: AC-5
	test('points the canonical URL at the production origin', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://toyintest.org/',
		);
	});

	// covers: AC-8
	test('applies the compiled Tailwind styles', async ({ page }) => {
		await page.goto('/');

		// The content sits in a measure width Container: 42rem, i.e. 672px at
		// the default 16px root size.
		const column = page.getByRole('main').locator('> div').first();
		await expect(column).toHaveCSS('max-width', '672px');
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
