import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import BaseLayout from './BaseLayout.astro';

const SITE = 'https://toyintest.org';

describe('BaseLayout', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create({ astroConfig: { site: SITE } });
	});

	async function render(props: { title: string; description?: string }, path = '/') {
		return container.renderToString(BaseLayout, {
			props,
			request: new Request(new URL(path, 'http://localhost:4321')),
			slots: { default: '<main><h1>Slot content</h1></main>' },
		});
	}

	it('renders the title it is given', async () => {
		const html = await render({ title: 'Toyin Ogunseinde' });

		expect(html).toContain('<title>Toyin Ogunseinde</title>');
	});

	it('declares English as the document language', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toMatch(/<html[^>]*\blang="en"/);
	});

	it('renders a meta description when one is given', async () => {
		const html = await render({ title: 'Home', description: 'Personal site.' });

		expect(html).toMatch(/<meta name="description" content="Personal site\."/);
	});

	it('omits the meta description when none is given', async () => {
		const html = await render({ title: 'Home' });

		expect(html).not.toContain('name="description"');
	});

	it('omits the meta description when it is an empty string', async () => {
		const html = await render({ title: 'Home', description: '' });

		expect(html).not.toContain('name="description"');
	});

	// covers: AC-5
	it('builds the canonical URL from the configured site, not the request host', async () => {
		const html = await render({ title: 'Home' }, '/');

		expect(html).toContain(`<link rel="canonical" href="${SITE}/"`);
		expect(html).not.toContain('href="http://localhost:4321/"');
	});

	it('keeps the request path in the canonical URL for nested pages', async () => {
		const html = await render({ title: 'Writing' }, '/writing/first-post/');

		expect(html).toContain(`<link rel="canonical" href="${SITE}/writing/first-post/"`);
	});

	it('escapes markup in the title and description', async () => {
		const html = await render({ title: '<script>x</script>', description: '"quoted" & <b>' });

		expect(html).not.toContain('<script>x</script>');
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
		// A quote that breaks out of the attribute is the real risk there.
		expect(html).toContain('content="&quot;quoted&quot; &amp; <b>"');
	});

	it('renders the page content passed into its slot', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toContain('<h1>Slot content</h1>');
	});

	it('links both favicons from public/', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toContain('href="/favicon.svg"');
		expect(html).toContain('href="/favicon.ico"');
	});
});
