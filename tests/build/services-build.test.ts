// Checks the built Services page in dist/ against spec 0008. Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SERVICES_PAGE } from '../../src/lib/services';

const dist = new URL('../../dist/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

const page = read('services/index.html');
const head = page.slice(page.indexOf('<head>'), page.indexOf('</head>'));
const main = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
const section = (id: string) => {
	const start = main.indexOf(`<section id="${id}"`);
	return main.slice(start, main.indexOf('</section>', start));
};

/** The expected "Seen in" project titles per offer, from the real write ups (AC-4). */
const PROOF = {
	platforms: [
		'Production Kubernetes on Hetzner Cloud',
		'Deployer, a deploy platform for AI coding agents',
	],
	delivery: ['ShipSafe, trust scores for AI written code'],
	monitoring: ['Production Kubernetes on Hetzner Cloud'],
	security: [
		'Production Kubernetes on Hetzner Cloud',
		'Deployer, a deploy platform for AI coding agents',
		'ShipSafe, trust scores for AI written code',
	],
	tools: [
		'Deployer, a deploy platform for AI coding agents',
		'Mool, a self hosted screen recorder',
	],
} as const;

describe('services page build', () => {
	// covers: AC-1
	it('builds the page at dist/services/index.html', () => {
		expect(existsSync(new URL('services/index.html', dist))).toBe(true);
	});

	// covers: AC-10
	it('writes the title, description, share tags and canonical address', () => {
		expect(head).toContain(`<title>${escapeHtml(SERVICES_PAGE.title)}</title>`);
		expect(head).toContain(
			`<meta name="description" content="${escapeHtml(SERVICES_PAGE.description)}">`,
		);
		expect(head).toContain('<link rel="canonical" href="https://toyintest.org/services">');
		expect(head).toContain('<meta property="og:url" content="https://toyintest.org/services">');
		expect(head).toContain('<meta property="og:image" content="https://toyintest.org/_astro/');
	});

	// covers: AC-10
	it('carries no noindex and no structured data, and the sitemap lists the page', () => {
		expect(head).not.toContain('noindex');
		expect(page).not.toContain('application/ld+json');
		expect(read('sitemap-0.xml')).toContain('<loc>https://toyintest.org/services</loc>');
	});

	// covers: AC-4, AC-5, AC-14
	it('shows the five offers in order, each with its Seen in project links', () => {
		const offers = section('offers');
		const names = SERVICES_PAGE.offers.map((offer) => offer.name);
		const positions = names.map((name) => offers.indexOf(`>${escapeHtml(name)}</h3>`));

		expect(positions.every((position) => position > -1)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);

		SERVICES_PAGE.offers.forEach((offer, index) => {
			const end = positions[index + 1] ?? offers.length;
			const block = offers.slice(positions[index], end);
			const titles = [
				...block.matchAll(/<a href="\/projects\/[a-z0-9-]+"[^>]*>\s*([^<]+?)\s*<\/a>/g),
			].map((m) => m[1]);

			expect(titles, offer.id).toEqual(PROOF[offer.id as keyof typeof PROOF]);
			expect(block).toContain(`aria-label="Seen in: ${escapeHtml(offer.name)}"`);
		});
	});

	// covers: AC-14
	it('links only to project pages that exist in the build', () => {
		for (const [, path] of section('offers').matchAll(/href="(\/projects\/[a-z0-9-]+)"/g)) {
			expect(existsSync(new URL(`${path.slice(1)}/index.html`, dist)), path).toBe(true);
		}
	});

	// covers: AC-6
	it('shows the five steps as a numbered list', () => {
		const how = section('how');

		expect(how).toContain('list-decimal');
		expect(how.match(/<li>/g)).toHaveLength(5);
	});

	// covers: AC-7
	it('shows the pricing models with no digit or currency sign', () => {
		const pricing = section('pricing');

		expect(pricing.match(/<li>/g)).toHaveLength(2);
		expect(pricing.replace(/<[^>]*>/g, ' ')).not.toMatch(/[0-9€$£]/);
	});

	// covers: AC-13
	it('holds only the two base scripts and no image in main', () => {
		expect(page.match(/<script[\s>]/g)).toHaveLength(2);
		expect(main).not.toContain('<img');
	});

	// covers: AC-13
	it('loads nothing from another host: no outside src, stylesheet or preload', () => {
		const loads = [
			...page.matchAll(/<(?:script|img|iframe|source)[^>]*\ssrc="(https?:\/\/[^"]+)"/g),
			...page.matchAll(
				/<link[^>]*rel="(?:stylesheet|preload|modulepreload)"[^>]*href="(https?:\/\/[^"]+)"/g,
			),
		].map((m) => m[1]);

		expect(loads).toEqual([]);
	});
});
