// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route.
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import NotFound from '../src/pages/404.astro';

describe('404 page', () => {
	async function render() {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org' },
		});
		return container.renderToString(NotFound, {
			request: new Request('http://localhost:4321/404'),
		});
	}

	// covers: AC-19
	it('is titled "Page not found" and renders inside the base layout', async () => {
		const html = await render();

		expect(html).toContain('<title>Page not found</title>');
		expect(html).toContain('<main id="main" tabindex="-1"');
		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
	});

	// covers: AC-19
	it('has one heading, "This page does not exist", and a line of help', async () => {
		const html = await render();

		const headings = html.match(/<h1[\s>][\s\S]*?<\/h1>/g) ?? [];
		expect(headings).toHaveLength(1);
		expect(headings[0]).toContain('This page does not exist');
		expect(html).toMatch(/<\/h1>\s*<p[^>]*>[^<]+<\/p>/);
	});

	// covers: AC-19
	it('links home with a primary button', async () => {
		const html = await render();

		const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
		expect(main).toMatch(/<a href="\/" class="[^"]*\bbg-accent\b[^"]*"/);
	});

	// covers: AC-19
	it('is served for unknown paths by wrangler.jsonc', () => {
		const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');

		expect(config).toMatch(/"not_found_handling":\s*"404-page"/);
	});
});
