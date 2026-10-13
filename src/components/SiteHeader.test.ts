import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import type { NavItem } from '../lib/site';
import SiteHeader from './SiteHeader.astro';

const NAV: readonly NavItem[] = [
	{ label: 'Work', href: '/work' },
	{ label: 'About', href: '/about' },
	{ label: 'Contact', href: '/contact' },
];

describe('SiteHeader', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create();
	});

	const render = (nav: readonly NavItem[], path = '/') =>
		container.renderToString(SiteHeader, {
			props: { nav },
			request: new Request(new URL(path, 'http://localhost:4321')),
		});

	// covers: AC-17
	it('renders the wordmark as a serif link home', async () => {
		const html = await render([]);

		expect(html).toMatch(
			/<a href="\/" class="[^"]*\bfont-serif\b[^"]*"[^>]*>\s*Toyin Ogunseinde\s*<\/a>/,
		);
	});

	// covers: AC-11
	it('renders no nav element and no second row when the nav is empty', async () => {
		const html = await render([]);

		expect(html).not.toContain('<nav');
		expect(html).not.toContain('row-start-2');
	});

	// covers: AC-11
	it('renders one link per nav item, in order', async () => {
		const html = await render(NAV);

		expect(html).toContain('<nav aria-label="Main"');
		const hrefs = [...html.matchAll(/<li><a href="([^"]+)"/g)].map((match) => match[1]);
		expect(hrefs).toEqual(['/work', '/about', '/contact']);
	});

	// covers: AC-11
	it('marks only the current item with aria-current="page"', async () => {
		const html = await render(NAV, '/work/some-project/');

		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
		expect(html).toMatch(/<a href="\/work" aria-current="page"/);
	});

	// covers: AC-11
	it('marks nothing on a page outside the nav', async () => {
		const html = await render(NAV, '/');

		expect(html).not.toContain('aria-current');
	});

	// covers: AC-9
	it('puts the wordmark, the nav links, then the toggle in source order', async () => {
		const html = await render(NAV);

		const wordmark = html.indexOf('data-wordmark');
		const nav = html.indexOf('<nav');
		const toggle = html.indexOf('data-theme-toggle');
		expect(wordmark).toBeLessThan(nav);
		expect(nav).toBeLessThan(toggle);
	});

	// covers: AC-16
	it('names its view transition site-header', async () => {
		const html = await render([]);

		expect(html).toContain('[view-transition-name:site-header]');
	});
});

describe('ThemeToggle (inside the header)', () => {
	// covers: AC-6
	it('ships hidden, unpressed, with the name "Dark theme" and two hidden icons', async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(SiteHeader, { props: { nav: [] } });
		const button = html.match(/<button[^>]*data-theme-toggle[^>]*>/)?.[0] ?? '';

		expect(button).toContain('type="button"');
		expect(button).toContain('aria-label="Dark theme"');
		expect(button).toContain('aria-pressed="false"');
		expect(button).toMatch(/\shidden(\s|>)/);
		expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2);
		expect(html).toContain('data-icon="sun"');
		expect(html).toContain('data-icon="moon"');
	});
});
