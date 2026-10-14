// Checks the built project pages in dist/ against feature 9's Done when and
// spec 0002 (Value sourcing, follow up for feature 9). Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROJECT_PAGE } from '../../src/lib/project-page';

const dist = new URL('../../dist/', import.meta.url);
const content = new URL('../../src/content/projects/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

/** One frontmatter line's value, quotes removed. Enough for the plain fields read here. */
const field = (source: string, name: string) =>
	source.match(new RegExp(`^${name}: '?(.+?)'?$`, 'm'))?.[1] ?? '';

const ids = readdirSync(content, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);
const published = ids.filter(
	(id) => !/^draft: true$/m.test(readFileSync(new URL(`${id}/index.md`, content), 'utf8')),
);

const pageOf = (id: string) => {
	const html = read(`projects/${id}/index.html`);
	return {
		html,
		head: html.slice(html.indexOf('<head>'), html.indexOf('</head>')),
		main: html.slice(html.indexOf('<main'), html.indexOf('</main>')),
		source: readFileSync(new URL(`${id}/index.md`, content), 'utf8'),
	};
};

describe('project pages exist for every published write up, and only those', () => {
	it('builds dist/projects/<id>/index.html for each published id', () => {
		expect(published.length).toBeGreaterThan(0);
		for (const id of published) {
			expect(existsSync(new URL(`projects/${id}/index.html`, dist)), id).toBe(true);
		}
	});

	it('builds no page for a draft and no other project page', () => {
		const built = readdirSync(new URL('projects/', dist), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);

		expect(built.sort()).toEqual([...published].sort());
	});
});

describe.each(published)('the %s page', (id) => {
	const { head, main, source } = pageOf(id);
	const title = field(source, 'title');
	const summary = field(source, 'summary');

	it('passes its own title and description to the head and share tags', () => {
		const pageTitle = escapeHtml(`${title}, by Toyin Ogunseinde`);

		expect(head).toContain(`<title>${pageTitle}</title>`);
		expect(head).toContain(`<meta name="description" content="${escapeHtml(summary)}">`);
		expect(head).toContain(`<meta property="og:title" content="${pageTitle}">`);
		expect(head).toContain(`<meta property="og:description" content="${escapeHtml(summary)}">`);
	});

	it('gives the canonical link and og:url without a trailing slash', () => {
		const url = `https://toyintest.org/projects/${id}`;

		expect(head).toContain(`<link rel="canonical" href="${url}">`);
		expect(head).toContain(`<meta property="og:url" content="${url}">`);
	});

	it('has one h1, the write up title, inside one article', () => {
		expect(main.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(main).toContain(`<h1 class="text-3xl">${escapeHtml(title)}</h1>`);
		expect(main.match(/<article[\s>]/g)).toHaveLength(1);
	});

	it('renders the three case study sections through Prose, in order', () => {
		const prose = main.slice(main.indexOf('<div class="prose">'));
		const positions = ['Problem', 'Approach', 'Outcome'].map((heading) =>
			prose.indexOf(`<h2 id="${heading.toLowerCase()}">${heading}</h2>`),
		);

		expect(main).toContain('<div class="prose">');
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	it('shows the at a glance panel and the full stack, in write up order', () => {
		const stackKeys = [
			...(source.match(/^stack:\n((?: {2}- .+\n)+)/m)?.[1] ?? '').matchAll(/- (.+)/g),
		];
		const chips = main.match(/<ul aria-label="Stack"[\s\S]*?<\/ul>/)?.[0] ?? '';

		expect(main).toContain(`>${PROJECT_PAGE.glanceHeading}</h2>`);
		expect(main).toContain(`>${PROJECT_PAGE.roleTerm}</dt>`);
		expect(chips.match(/<li[\s>]/g)).toHaveLength(stackKeys.length);
	});

	it('links to every write up link, live work or code', () => {
		const urls = [...source.matchAll(/^ {4}url: (https:\/\/\S+)$/gm)].map((m) => m[1]);

		for (const url of urls) {
			expect(main).toContain(`<a href="${url}"`);
		}
	});

	it('serves the cover at 640, 1000 and 1400 pixels from the site, with width and height', () => {
		const cover = main.match(/<img[^>]*>/)?.[0] ?? '';
		const srcset = cover.match(/srcset="([^"]*)"/)?.[1] ?? '';

		expect([...srcset.matchAll(/ (\d+)w/g)].map((m) => m[1])).toEqual(['640', '1000', '1400']);
		expect(cover).toMatch(/\bwidth="\d+" height="\d+"/);
		for (const url of srcset.split(',').map((part) => part.trim().split(' ')[0] ?? '')) {
			expect(url).toMatch(/^\/_astro\//);
			expect(existsSync(new URL(url.slice(1), dist)), url).toBe(true);
		}
	});

	it('ends with the contact section and the one call to action', () => {
		const lastSection = main.slice(main.lastIndexOf('<section'));

		expect(lastSection).toMatch(/^<section id="contact"/);
		expect(lastSection).toContain(`>${escapeHtml(PROJECT_PAGE.closingHeading)}</h2>`);
		expect(main.match(/[\s"]bg-accent[\s"]/g)).toHaveLength(1);
	});
});

describe('card titles link to the project pages', () => {
	it.each(['projects/index.html', 'index.html'])('on %s, without a trailing slash', (path) => {
		const hrefs = [...read(path).matchAll(/<h[23] class="text-xl"><a href="([^"]+)"/g)].map(
			(m) => m[1],
		);

		expect(hrefs.length).toBeGreaterThan(0);
		for (const href of hrefs) {
			expect(href).toMatch(/^\/projects\/[a-z0-9-]+$/);
			expect(published).toContain(href.slice('/projects/'.length));
		}
	});
});
