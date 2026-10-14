import { expect, test, type Page } from '@playwright/test';
import { PROJECT_PAGE } from '../src/lib/project-page';
import { SITE } from '../src/lib/site';

// Feature 9 in a real browser, against the production build served from
// dist/ (see playwright.config.ts). Axe, target sizes and the width sweep for
// two project pages live in the shared lists in design-system.spec.ts.

/** Opens a project page at the given width, after the fonts have loaded. */
const open = async (page: Page, path: string, width = 1280) => {
	await page.setViewportSize({ width, height: 800 });
	await page.goto(path);
	await page.evaluate(() => document.fonts.ready);
};

test.describe('project page from the static build', () => {
	test('shows the intro, links, panel, write up and closing action, with no errors', async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto('/projects/deployer');
		const main = page.getByRole('main');

		await expect(page).toHaveTitle(
			'Deployer, a deploy platform for AI coding agents, by Toyin Ogunseinde',
		);
		await expect(main.getByRole('heading', { level: 1 })).toHaveText(
			'Deployer, a deploy platform for AI coding agents',
		);
		await expect(main.getByText('Personal project')).toBeVisible();
		await expect(
			main.getByRole('list', { name: PROJECT_PAGE.linksLabel }).getByRole('link'),
		).toHaveAttribute('href', 'https://github.com/toyinogun/deployer');
		await expect(main.getByRole('heading', { level: 2 })).toHaveText([
			PROJECT_PAGE.glanceHeading,
			'Problem',
			'Approach',
			'Outcome',
			PROJECT_PAGE.closingHeading,
		]);
		await expect(main.getByRole('link', { name: SITE.contact.label })).toHaveCount(1);
		expect(errors).toEqual([]);
	});

	test('shows all nine stack chips on the Hetzner page, where its card shows five', async ({
		page,
	}) => {
		await page.goto('/projects/hetzner-talos-cluster');

		await expect(
			page.getByRole('main').getByRole('list', { name: 'Stack' }).getByRole('listitem'),
		).toHaveText([
			'Kubernetes',
			'Talos Linux',
			'Terraform',
			'Hetzner Cloud',
			'Argo CD',
			'Cilium',
			'Longhorn',
			'Prometheus',
			'Grafana',
		]);
	});

	test('marks Work as the current page', async ({ page }) => {
		await page.goto('/projects/shipsafe');

		await expect(page.getByRole('banner').getByRole('link', { name: 'Work' })).toHaveAttribute(
			'aria-current',
			'page',
		);
	});

	test('answers an unknown project with 404', async ({ request }) => {
		expect((await request.get('/projects/no-such-project')).status()).toBe(404);
	});
});

test.describe('reaching a project page', () => {
	test('opens the case study from a work listing card title', async ({ page }) => {
		await page.goto('/projects');
		await page
			.getByRole('link', { name: 'Mool, a self hosted screen recorder', exact: true })
			.click();

		await expect(page).toHaveURL(/\/projects\/mool$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Mool, a self hosted screen recorder',
		);
	});

	test('opens the case study from a home card title', async ({ page }) => {
		await page.goto('/');
		await page
			.getByRole('link', { name: 'Production Kubernetes on Hetzner Cloud', exact: true })
			.click();

		await expect(page).toHaveURL(/\/projects\/hetzner-talos-cluster$/);
	});
});

test.describe('on a phone', () => {
	test('stacks the panel terms above their values and keeps the cover inside the column', async ({
		page,
	}) => {
		test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');
		await open(page, '/projects/hetzner-talos-cluster', 320);

		const role = page.locator('dt', { hasText: PROJECT_PAGE.roleTerm });
		const roleValue = page.locator('dt:has-text("Role") + dd');
		const termBox = await role.boundingBox();
		const valueBox = await roleValue.boundingBox();
		expect(valueBox?.y ?? 0).toBeGreaterThan(termBox?.y ?? 0);
		expect(Math.round(valueBox?.x ?? -1)).toBe(Math.round(termBox?.x ?? -2));

		const cover = await page.getByRole('main').locator('img').first().boundingBox();
		expect((cover?.x ?? -1) + (cover?.width ?? 0)).toBeLessThanOrEqual(320);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
	});

	test('puts each panel term beside its value from sm up', async ({ page }) => {
		test.skip(test.info().project.name !== 'desktop', 'sets its own sizes');
		await open(page, '/projects/hetzner-talos-cluster', 1024);

		const termBox = await page.locator('dt', { hasText: PROJECT_PAGE.roleTerm }).boundingBox();
		const valueBox = await page.locator('dt:has-text("Role") + dd').boundingBox();
		expect(valueBox?.x ?? 0).toBeGreaterThan(termBox?.x ?? 0);
		expect(Math.abs((valueBox?.y ?? 0) - (termBox?.y ?? 100))).toBeLessThan(8);
	});
});
