// Checks the built work listing in dist/ against spec 0005. Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORK } from '../../src/lib/work';

const dist = new URL('../../dist/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

const page = read('projects/index.html');
const head = page.slice(page.indexOf('<head>'), page.indexOf('</head>'));
const main = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
const cards = main.match(/<article>[\s\S]*?<\/article>/g) ?? [];
const chipsOf = (card: string) =>
	[
		...(card.match(/<ul aria-label="Stack"[\s\S]*?<\/ul>/)?.[0] ?? '').matchAll(
			/<li[^>]*>([^<]+)<\/li>/g,
		),
	].map((m) => m[1]);

describe('work listing head (AC-10, AC-11)', () => {
	// covers: AC-1
	it('builds the page at dist/projects/index.html', () => {
		expect(existsSync(new URL('projects/index.html', dist))).toBe(true);
	});

	// covers: AC-11
	it('uses the WORK title and description, and the share tags from them', () => {
		expect(head).toContain(`<title>${escapeHtml(WORK.title)}</title>`);
		expect(head).toContain(`<meta name="description" content="${escapeHtml(WORK.description)}">`);
		expect(head).toContain(`<meta property="og:title" content="${escapeHtml(WORK.title)}">`);
		expect(head).toContain(
			`<meta property="og:description" content="${escapeHtml(WORK.description)}">`,
		);
		expect(head).not.toMatch(/og:image|twitter:image/);
	});

	// covers: AC-10
	it('gives the canonical link and og:url without a trailing slash', () => {
		expect(head).toContain('<link rel="canonical" href="https://toyintest.org/projects">');
		expect(head).toContain('<meta property="og:url" content="https://toyintest.org/projects">');
	});

	// covers: AC-10
	it('keeps the home canonical at the bare origin', () => {
		expect(read('index.html')).toContain('<link rel="canonical" href="https://toyintest.org/">');
	});
});

describe('work listing cards (AC-3, AC-6, AC-14)', () => {
	const images = main.match(/<img[^>]*>/g) ?? [];

	// covers: AC-3
	it('shows every published project in order, featured or not, with an h2 title', () => {
		const titles = cards.map(
			(card) => card.match(/<h2 class="text-xl"><a [^>]*>([^<]+)<\/a><\/h2>/)?.[1],
		);

		expect(titles).toEqual([
			'Production Kubernetes on Hetzner Cloud',
			'Deployer, a deploy platform for AI coding agents',
			'ShipSafe, trust scores for AI written code',
			'Mool, a self hosted screen recorder',
		]);
	});

	// covers: AC-6, AC-7
	it('gives every card its stack chips, five on the Hetzner card', () => {
		expect(chipsOf(cards[0] ?? '')).toEqual([
			'Kubernetes',
			'Talos Linux',
			'Terraform',
			'Hetzner Cloud',
			'Argo CD',
		]);
		expect(chipsOf(cards[2] ?? '')).toEqual(['Go', 'Docker']);
		for (const card of cards) {
			expect(chipsOf(card).length).toBeGreaterThan(0);
			expect(chipsOf(card).length).toBeLessThanOrEqual(5);
		}
	});

	// covers: AC-6
	it('keeps the chips off the home page', () => {
		expect(read('index.html')).not.toContain('aria-label="Stack"');
	});

	// covers: AC-14
	it('serves each cover at 400, 800 and 1200 pixels, with width and height, from the site', () => {
		expect(images).toHaveLength(4);
		for (const img of images) {
			const srcset = img.match(/srcset="([^"]*)"/)?.[1] ?? '';
			const widths = [...srcset.matchAll(/ (\d+)w/g)].map((m) => m[1]);
			expect(widths).toEqual(['400', '800', '1200']);
			expect(img).toMatch(/\bwidth="\d+" height="\d+"/);
			for (const url of srcset.split(',').map((part) => part.trim().split(' ')[0] ?? '')) {
				expect(url).toMatch(/^\/_astro\//);
				expect(existsSync(new URL(url.slice(1), dist)), url).toBe(true);
			}
		}
	});
});

describe('work listing scripts (AC-14)', () => {
	// covers: AC-14
	it('holds only the two spec 0003 scripts: the theme script and the toggle', () => {
		const scripts = page.match(/<script[^>]*>/g) ?? [];

		expect(scripts).toEqual(['<script>', '<script type="module">']);
		expect(page).not.toMatch(/<script[^>]*\bsrc=/);
	});
});
