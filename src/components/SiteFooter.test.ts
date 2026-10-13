import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OutLink } from '../lib/site';
import SiteFooter from './SiteFooter.astro';

const LINKS: readonly OutLink[] = [
	{ label: 'GitHub', href: 'https://github.com/example', kind: 'profile' },
	{ label: 'Email', href: 'mailto:hello@example.com', kind: 'email' },
];

describe('SiteFooter', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create();
	});

	const render = (props: { links: readonly OutLink[]; year?: number }) =>
		container.renderToString(SiteFooter, { props });

	// covers: AC-12
	it('renders the copyright line alone when there are no links', async () => {
		const html = await render({ links: [], year: 2026 });

		expect(html).toContain('© 2026 Toyin Ogunseinde');
		expect(html).not.toContain('<a ');
		expect(html).not.toContain('<ul');
	});

	// covers: AC-12
	it('defaults the year to the current (build) year', async () => {
		const html = await render({ links: [] });

		expect(html).toContain(`© ${new Date().getFullYear()} Toyin Ogunseinde`);
	});

	// covers: AC-12
	it('renders one link per item, in order', async () => {
		const html = await render({ links: LINKS, year: 2026 });

		const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1]);
		expect(hrefs).toEqual(['https://github.com/example', 'mailto:hello@example.com']);
	});

	// covers: AC-12
	it('adds rel="me" to profile links only', async () => {
		const html = await render({ links: LINKS, year: 2026 });

		expect(html).toMatch(/<a href="https:\/\/github\.com\/example" rel="me"/);
		expect(html).not.toMatch(/<a href="mailto:[^"]*" rel="me"/);
	});
});
