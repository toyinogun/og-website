import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import cover from '../content/projects/shipsafe/cover.png';
import type { JsonLdGraph } from '../lib/seo';
import BaseLayout from './BaseLayout.astro';

const SITE = 'https://toyintest.org';

describe('BaseLayout', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create({ astroConfig: { site: SITE } });
	});

	async function render(
		props: {
			title: string;
			description?: string;
			image?: { src: ImageMetadata; alt: string };
			noindex?: boolean;
			structuredData?: JsonLdGraph;
		},
		path = '/',
	) {
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

		expect(html).not.toContain('<title><script>x</script>');
		expect(html).toContain('<title>&lt;script&gt;x&lt;/script&gt;</title>');
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

	// covers: AC-13 (spec 0004)
	it('writes the share tags after the canonical link, from the title and description', async () => {
		const html = await render({ title: 'Home', description: 'Personal site.' }, '/');
		const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
		const canonical = head.indexOf('<link rel="canonical"');

		const tags = [
			'<meta property="og:type" content="website"',
			'<meta property="og:site_name" content="Toyin Ogunseinde"',
			'<meta property="og:title" content="Home"',
			'<meta property="og:description" content="Personal site."',
			`<meta property="og:url" content="${SITE}/"`,
			'<meta property="og:image" content="https://toyintest.org/',
			'<meta property="og:image:type" content="image/jpeg"',
			'<meta property="og:image:width" content="1200"',
			'<meta property="og:image:height" content="630"',
			'<meta property="og:image:alt" content="Toyin Ogunseinde, DevOps',
			'<meta name="twitter:card" content="summary_large_image"',
		];
		for (const tag of tags) {
			expect(head.indexOf(tag), tag).toBeGreaterThan(canonical);
		}
	});

	// covers: AC-13 (spec 0004)
	it('omits og:description when there is no description', async () => {
		for (const description of [undefined, '']) {
			const html = await render({ title: 'Home', description });

			expect(html).not.toContain('og:description');
			expect(html).toContain('<meta property="og:title" content="Home"');
		}
	});

	// covers: AC-13 (spec 0004)
	it('uses the canonical URL of nested pages for og:url', async () => {
		const html = await render({ title: 'Writing' }, '/writing/first-post/');

		expect(html).toContain(`<meta property="og:url" content="${SITE}/writing/first-post/"`);
	});

	// covers: AC-3, AC-4 (spec 0007)
	it('uses the site card when no image is given, and the given image when one is', async () => {
		const plain = await render({ title: 'Home', description: 'Personal site.' });
		const own = await render({
			title: 'Home',
			image: { src: cover, alt: 'A cover of its own' },
		});

		expect(plain).toContain('og:image:alt" content="Toyin Ogunseinde, DevOps');
		expect(own).toContain('<meta property="og:image:alt" content="A cover of its own"');
		expect(own).not.toContain('og:image:alt" content="Toyin Ogunseinde');
	});

	// covers: AC-7 (spec 0007)
	it('with noindex writes the robots meta and no canonical, og:url or image tags', async () => {
		const html = await render({ title: 'Gone', description: 'Nothing here.', noindex: true });

		expect(html).toContain('<meta name="robots" content="noindex"');
		expect(html).not.toMatch(/rel="canonical"|og:url|og:image/);
		expect(html).toContain('<meta name="twitter:card" content="summary"');
	});

	// covers: AC-7 (spec 0007)
	it('writes no robots meta on an ordinary page', async () => {
		const html = await render({ title: 'Home' });

		expect(html).not.toContain('name="robots"');
	});

	// covers: AC-10 (spec 0007)
	it('links the sitemap on every page', async () => {
		const html = await render({ title: 'Home' });

		expect(html).toContain('<link rel="sitemap" href="/sitemap-index.xml"');
	});

	// covers: AC-14 (spec 0007)
	it('writes structured data as an escaped data block, only when given', async () => {
		const none = await render({ title: 'Home' });
		const html = await render({
			title: 'Home',
			structuredData: { '@context': 'https://schema.org', '@graph': [{ name: '</script>' }] },
		});

		expect(none).not.toContain('application/ld+json');
		expect(html).toContain('<script type="application/ld+json">');
		expect(html).toContain('\\u003c/script>');
		expect(html.match(/<script[^>]*ld\+json/g)).toHaveLength(1);
	});
});
