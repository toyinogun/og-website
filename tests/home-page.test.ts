// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Index from '../src/pages/index.astro';

describe('home page (placeholder)', () => {
	async function render() {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org' },
		});
		return container.renderToString(Index, {
			request: new Request('http://localhost:4321/'),
		});
	}

	// covers: AC-1
	it('renders inside the base layout with the site owner as the title', async () => {
		const html = await render();

		expect(html).toContain('<title>Toyin Ogunseinde</title>');
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/"');
	});

	it('has exactly one top level heading naming the site owner', async () => {
		const html = await render();

		const headings = html.match(/<h1[\s>][\s\S]*?<\/h1>/g) ?? [];
		expect(headings).toHaveLength(1);
		expect(headings[0]).toContain('Toyin Ogunseinde');
	});

	// covers: AC-8 (spec 0003)
	it('leaves the one main landmark to the base layout', async () => {
		const html = await render();

		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
		expect(html).toContain('<main id="main" tabindex="-1"');
	});

	// covers: AC-2 (spec 0003)
	it('uses no opacity styling for its text', async () => {
		const html = await render();

		expect(html).not.toMatch(/\bopacity-/);
	});

	it('gives search engines a description', async () => {
		const html = await render();

		expect(html).toMatch(/<meta name="description" content="[^"]+"/);
	});
});
