import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import StyleGuide from './styleguide.astro';

const design = readFileSync(new URL('../../design.md', import.meta.url), 'utf8');
const tokensIn = (table: string) => {
	const start = design.indexOf(`<!-- token-table:${table}:start -->`);
	const end = design.indexOf(`<!-- token-table:${table}:end -->`);
	return [...design.slice(start, end).matchAll(/^\| `(--[a-z0-9-]+)`/gm)].map((m) => m[1]);
};

describe('style guide', () => {
	let html: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org' },
		});
		html = await container.renderToString(StyleGuide, {
			request: new Request('http://localhost:4321/styleguide'),
		});
	});

	// covers: AC-18
	it('renders inside the base layout, so the header toggle switches its theme', () => {
		expect(html).toContain('<title>Style guide</title>');
		expect(html).toContain('data-theme-toggle');
	});

	// covers: AC-18
	it('shows every colour token as a swatch', () => {
		const colours = tokensIn('colour');
		expect(colours).toHaveLength(8);
		for (const token of colours) {
			expect(html).toContain(`<code class="text-sm">${token}</code>`);
			expect(html).toContain(`bg-${token.replace('--color-', '')}`);
		}
	});

	// covers: AC-18
	it('shows every type size', () => {
		const sizes = tokensIn('type');
		expect(sizes).toHaveLength(7);
		for (const token of sizes) {
			expect(html).toContain(`>${token}</code>`);
			expect(html).toContain(token.replace('--', ''));
		}
	});

	// covers: AC-18
	it('shows each Button variant as a button and as a link, and a submit button', () => {
		expect(html).toMatch(/<button type="button"[^>]*bg-accent[^>]*>Primary button/);
		expect(html).toMatch(/<button type="button"[^>]*border-line[^>]*>Secondary button/);
		expect(html).toMatch(/<button type="submit"[^>]*>Submit button/);
		expect(html).toMatch(/<a href="\/"[^>]*bg-accent[^>]*>Primary link/);
		expect(html).toMatch(/<a href="\/"[^>]*border-line[^>]*>Secondary link/);
	});

	// covers: AC-18
	it('shows every Stack gap and every Grid column count and gap', () => {
		for (const gap of ['gap-3', 'gap-6', 'gap-12', 'gap-20']) expect(html).toContain(gap);
		expect(html).toContain('md:grid-cols-2');
		expect(html).toContain('lg:grid-cols-3');
		expect(html).toMatch(/<ol class="flex flex-col gap-3/);
	});

	// covers: AC-18
	it('shows Sections with an h2, an h3 and no heading, and both Container widths', () => {
		expect(html).toMatch(/<h2 id="colour-heading"/);
		expect(html).toMatch(/<h3 id="section-h3-heading"/);
		expect(html).toContain('max-w-page');
		expect(html).toContain('max-w-measure');
	});

	// covers: AC-18
	it('renders the sample Markdown through Prose, covering every listed element', () => {
		const prose = html.slice(html.indexOf('<div class="prose">'));
		for (const element of ['<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<blockquote']) {
			expect(prose).toContain(element);
		}
		expect(prose).toContain('<code>inline code</code>');
		expect(prose).toMatch(/<pre class="astro-code/);
		expect(prose).toContain('<table');
		expect(prose).toMatch(/<figure>[\s\S]*<figcaption>/);
		expect(prose).toContain('https://toyintest.org/a/very/long/path');
	});
});
