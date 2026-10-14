// Checks the built home page in dist/ against spec 0004. Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOME } from '../../src/lib/home';
import { SITE } from '../../src/lib/site';

const dist = new URL('../../dist/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const headOf = (html: string) => html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

const home = read('index.html');
const head = headOf(home);
const main = home.slice(home.indexOf('<main'), home.indexOf('</main>'));

describe('home head (AC-12, AC-13)', () => {
	// covers: AC-12
	it('uses the HOME title and description', () => {
		expect(head).toContain(`<title>${escapeHtml(HOME.title)}</title>`);
		expect(head).toContain(`<meta name="description" content="${escapeHtml(HOME.description)}">`);
	});

	// covers: AC-13
	it('writes the six share tags after the canonical link, with matching values', () => {
		const canonical = head.indexOf('<link rel="canonical" href="https://toyintest.org/">');
		const tags = [
			'<meta property="og:type" content="website">',
			`<meta property="og:site_name" content="${SITE.name}">`,
			`<meta property="og:title" content="${escapeHtml(HOME.title)}">`,
			`<meta property="og:description" content="${escapeHtml(HOME.description)}">`,
			'<meta property="og:url" content="https://toyintest.org/">',
			'<meta name="twitter:card" content="summary">',
		];

		expect(canonical).toBeGreaterThan(-1);
		for (const tag of tags) expect(head.indexOf(tag), tag).toBeGreaterThan(canonical);
	});

	// covers: AC-13
	it('writes no share image, structured data or sitemap', () => {
		expect(head).not.toMatch(/og:image|twitter:image|application\/ld\+json|sitemap/);
		expect(existsSync(new URL('sitemap-index.xml', dist))).toBe(false);
	});

	// covers: AC-13
	it('gives the 404 page share tags of its own', () => {
		const notFound = headOf(read('404.html'));

		expect(notFound).toContain('<meta property="og:title" content="Page not found">');
		expect(notFound).toContain('<meta name="twitter:card" content="summary">');
	});
});

describe('home cards (AC-4, AC-6)', () => {
	const images = main.match(/<img[^>]*>/g) ?? [];

	// covers: AC-4
	it('shows the featured projects in order, and not Mool', () => {
		const titles = [...main.matchAll(/<h3 class="text-xl">([^<]+)<\/h3>/g)].map((m) => m[1]);

		expect(titles).toEqual([
			'Production Kubernetes on Hetzner Cloud',
			'Deployer, a deploy platform for AI coding agents',
			'ShipSafe, trust scores for AI written code',
		]);
		expect(main).not.toContain('Mool');
	});

	// covers: AC-6
	it('serves each cover at 400, 800 and 1200 pixels, with width, height and the sizes', () => {
		expect(images).toHaveLength(3);
		for (const img of images) {
			const widths = [...(img.match(/srcset="([^"]*)"/)?.[1] ?? '').matchAll(/ (\d+)w/g)].map(
				(m) => m[1],
			);
			expect(widths).toEqual(['400', '800', '1200']);
			expect(img).toMatch(/\bwidth="\d+" height="\d+"/);
			expect(img).toContain(
				'sizes="(min-width: 64rem) 22rem, (min-width: 48rem) calc(50vw - 3rem), calc(100vw - 2.5rem)"',
			);
			expect(img).toContain('loading="lazy"');
		}
	});

	// covers: AC-17
	it('serves every image from the site itself', () => {
		const urls = images.flatMap((img) => [
			img.match(/ src="([^"]+)"/)?.[1] ?? '',
			...(img.match(/srcset="([^"]*)"/)?.[1] ?? '')
				.split(',')
				.map((part) => part.trim().split(' ')[0]),
		]);

		expect(urls.length).toBeGreaterThan(0);
		for (const url of urls) expect(url).toMatch(/^\/_astro\//);
		for (const url of urls) expect(existsSync(new URL(url.slice(1), dist)), url).toBe(true);
	});

	// covers: AC-6
	it('never links to a project page', () => {
		expect(home).not.toContain('href="/projects/');
	});
});

describe('home scripts (AC-17)', () => {
	// covers: AC-17
	it('holds only the two spec 0003 scripts: the theme script and the toggle', () => {
		const scripts = home.match(/<script[^>]*>/g) ?? [];

		expect(scripts).toEqual(['<script>', '<script type="module">']);
		expect(home).toMatch(/<script>\(function\(\)\{try\{var t=localStorage/);
		expect(home).not.toMatch(/<script[^>]*\bsrc=/);
	});
});
