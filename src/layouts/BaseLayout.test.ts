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
			slots: { default: '<h1>Slot content</h1>' },
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

	// covers: AC-8
	it('renders the skip link, header, main and footer in that order', async () => {
		const html = await render({ title: 'Home' });

		const positions = [
			html.indexOf('href="#main"'),
			html.indexOf('<header'),
			html.indexOf('<main id="main" tabindex="-1"'),
			html.indexOf('<h1>Slot content</h1>'),
			html.indexOf('</main>'),
			html.indexOf('<footer'),
		];
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	// covers: AC-8
	it('provides exactly one main landmark around the page slot', async () => {
		const html = await render({ title: 'Home' });

		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
	});

	// covers: AC-9
	it('labels the skip link "Skip to content"', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toMatch(/<a href="#main"[^>]*>\s*Skip to content\s*<\/a>/);
	});

	// covers: AC-5
	it('puts the theme script first in the head, before any style or stylesheet', async () => {
		const html = await render({ title: 'Home' });
		const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

		const script = head.indexOf('<script>(function(){try{var t=localStorage.getItem(');
		expect(script).toBeGreaterThan(-1);
		expect(head.indexOf('<script')).toBe(script);
		const firstStyle = head.search(/<style|<link rel="stylesheet"/);
		expect(firstStyle === -1 || firstStyle > script).toBe(true);
	});

	// covers: AC-7
	it('preloads only the two normal font faces', async () => {
		const html = await render({ title: 'Home' });

		expect(html.match(/<link rel="preload"[^>]*as="font"/g)).toHaveLength(2);
	});

	// covers: AC-17
	it('links the SVG favicon and the touch icon, and no favicon.ico', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg"');
		expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png"');
		expect(html).not.toContain('favicon.ico');
	});
});
