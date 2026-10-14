// Checks the built site in dist/ against spec 0007 (search metadata and share
// cards). Run after `npm run build`, with `npm run test:build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { robotsTxt, SHARE } from '../../src/lib/seo';
import { SITE } from '../../src/lib/site';

const distUrl = new URL('../../dist/', import.meta.url);
const dist = distUrl.pathname;
const read = (path: string) => readFileSync(new URL(path, distUrl), 'utf8');
const content = new URL('../../src/content/projects/', import.meta.url);

/** Every built HTML file, as a site path (`index.html` is `/`) and its text. */
const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
	);
const pages = walk(dist)
	.filter((file) => file.endsWith('.html'))
	.map((file) => {
		const rel = file
			.slice(dist.length)
			.replace(/(^|\/)index\.html$/, '')
			.replace(/\.html$/, '');
		return { path: `/${rel}`, html: readFileSync(file, 'utf8') };
	});
const headOf = (html: string) => html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
const meta = (head: string, attr: 'name' | 'property', key: string) =>
	head.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const unescape = (text: string) => text.replaceAll('&#39;', "'").replaceAll('&amp;', '&');

/** The built page at `path`; fails the test when there is none. */
const pageAt = (path: string) => {
	const page = pages.find((candidate) => candidate.path === path);
	if (!page) throw new Error(`no built page at ${path}`);
	return page;
};

const projectIds = readdirSync(content, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.filter((id) => !/^draft: true$/m.test(readFileSync(new URL(`${id}/index.md`, content), 'utf8')));
const indexable = pages.filter((page) => page.path !== '/404');

describe('titles and descriptions (AC-1)', () => {
	it.each(pages)('$path has one title and a 50 to 160 character description', ({ html }) => {
		const head = headOf(html);
		const titles = head.match(/<title>[^<]+<\/title>/g) ?? [];
		const descriptions = head.match(/<meta name="description"/g) ?? [];
		const description = unescape(meta(head, 'name', 'description') ?? '').trim();

		expect(titles).toHaveLength(1);
		expect(descriptions).toHaveLength(1);
		expect(description.length).toBeGreaterThanOrEqual(50);
		expect(description.length).toBeLessThanOrEqual(160);
	});
});

describe('share image tags (AC-4, AC-5)', () => {
	it.each(indexable)('$path writes the five image tags and the large card', ({ html }) => {
		const head = headOf(html);

		expect(meta(head, 'property', 'og:image')).toMatch(
			/^https:\/\/toyintest\.org\/_astro\/[^"]+\.jpe?g$/,
		);
		expect(meta(head, 'property', 'og:image:type')).toBe('image/jpeg');
		expect(meta(head, 'property', 'og:image:width')).toBe('1200');
		expect(meta(head, 'property', 'og:image:height')).toBe('630');
		expect(meta(head, 'name', 'twitter:card')).toBe('summary_large_image');
	});

	it.each(['/', '/projects', '/services', '/about', '/contact'])(
		'%s shows the site card',
		(path) => {
			const head = headOf(pageAt(path).html);

			expect(unescape(meta(head, 'property', 'og:image:alt') ?? '')).toBe(SHARE.siteCardAlt);
		},
	);

	it.each(projectIds)('project %s shows its own cover, not the site card', (id) => {
		const head = headOf(pageAt(`/projects/${id}`).html);
		const home = headOf(pageAt('/').html);
		const alt = readFileSync(new URL(`${id}/index.md`, content), 'utf8').match(
			/^coverAlt: '?(.+?)'?$/m,
		)?.[1];

		expect(unescape(meta(head, 'property', 'og:image:alt') ?? '')).toBe(alt);
		expect(meta(head, 'property', 'og:image')).not.toBe(meta(home, 'property', 'og:image'));
	});
});

describe('share image files (AC-6)', () => {
	const files = [
		...new Set(
			indexable.flatMap(({ html }) => {
				const url = meta(headOf(html), 'property', 'og:image') ?? '';
				return [url.replace('https://toyintest.org', '')];
			}),
		),
	];

	it('emits one image for each of the site card and every project', () => {
		expect(files).toHaveLength(1 + projectIds.length);
	});

	it.each(files)('%s is a 1200 by 630 JPEG of at most 300 KB', async (file) => {
		const path = join(dist, file);
		const info = await sharp(path).metadata();

		expect(info.format).toBe('jpeg');
		expect([info.width, info.height]).toEqual([1200, 630]);
		expect(statSync(path).size).toBeLessThanOrEqual(300 * 1024);
	});
});

describe('the 404 page (AC-7)', () => {
	const head = headOf(read('404.html'));

	it('is told to stay out of search results and carries no canonical, og:url or image', () => {
		expect(head).toContain('<meta name="robots" content="noindex">');
		expect(head).not.toMatch(/rel="canonical"|og:url|og:image/);
	});

	it('is the only page with a robots meta tag', () => {
		for (const page of indexable) expect(headOf(page.html)).not.toContain('name="robots"');
	});
});

describe('sitemap (AC-8, AC-9, AC-10)', () => {
	const index = read('sitemap-index.xml');
	const entries = [...read('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const sameAddress = (a: string, b: string) => new URL(a).href === new URL(b).href;

	it('is an index pointing at sitemap-0.xml', () => {
		expect(index).toContain('<loc>https://toyintest.org/sitemap-0.xml</loc>');
	});

	it('lists exactly the indexable pages, with no trailing slash but the home origin', () => {
		const expected = [
			'https://toyintest.org/',
			'https://toyintest.org/projects',
			...projectIds.map((id) => `https://toyintest.org/projects/${id}`),
			'https://toyintest.org/services',
			'https://toyintest.org/about',
			'https://toyintest.org/contact',
		];

		expect([...entries].sort()).toEqual([...expected].sort());
		for (const entry of entries)
			expect(entry === 'https://toyintest.org/' || !entry.endsWith('/')).toBe(true);
		expect(entries.join()).not.toMatch(/404|styleguide|\/api\//);
		expect(read('sitemap-0.xml')).not.toMatch(/<(lastmod|changefreq|priority)>/);
	});

	it.each(indexable)('$path has a canonical link equal to its sitemap entry', ({ html }) => {
		const canonical = headOf(html).match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';

		expect(entries.some((entry) => sameAddress(entry, canonical))).toBe(true);
	});

	it.each(pages)('$path links the sitemap in its head', ({ html }) => {
		expect(headOf(html)).toContain('<link rel="sitemap" href="/sitemap-index.xml">');
	});
});

describe('robots.txt (AC-11)', () => {
	it('is exactly the allow all text with /api/ kept out', () => {
		expect(read('robots.txt')).toBe(
			'User-agent: *\nDisallow: /api/\n\nSitemap: https://toyintest.org/sitemap-index.xml\n',
		);
		expect(read('robots.txt')).toBe(robotsTxt('https://toyintest.org'));
	});
});

describe('person structured data (AC-13, AC-14)', () => {
	const blocks = (html: string) => html.match(/<script[^>]*application\/ld\+json[^>]*>/g) ?? [];

	it('is on the home page only', () => {
		for (const page of pages) expect(blocks(page.html)).toHaveLength(page.path === '/' ? 1 : 0);
	});

	it('holds exactly the Person and WebSite nodes, with no email address', () => {
		const html = pageAt('/').html;
		const text = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)?.[1] ?? '';
		const graph = JSON.parse(text)['@graph'];
		const image = meta(headOf(html), 'property', 'og:image');

		expect(blocks(html)[0]).not.toMatch(/\bsrc=/);
		expect(graph.map((node: { '@type': string }) => node['@type'])).toEqual(['Person', 'WebSite']);
		expect(Object.keys(graph[0]).sort()).toEqual(
			['@id', '@type', 'address', 'image', 'jobTitle', 'name', 'sameAs', 'url'].sort(),
		);
		expect(graph[0]).toMatchObject({
			'@id': 'https://toyintest.org/#person',
			name: SITE.name,
			jobTitle: 'DevOps and infrastructure engineer',
			address: { '@type': 'PostalAddress', addressCountry: 'NL' },
			sameAs: ['https://linkedin.com/in/toyin-ogunseinde', 'https://github.com/toyinogun'],
			image,
		});
		expect(Object.keys(graph[1]).sort()).toEqual(['@id', '@type', 'author', 'name', 'url']);
		expect(text).not.toMatch(/mailto:|@[a-z0-9-]+\.[a-z]+"/i);
	});
});

describe('covers above the fold (AC-15)', () => {
	const imgs = (html: string) => html.match(/<img[^>]*>/g) ?? [];
	const covers = (html: string) => imgs(html).filter((tag) => tag.includes('/_astro/'));

	it.each(['/', '/projects', ...projectIds.map((id) => `/projects/${id}`)])(
		'%s has one high priority cover and it is the first',
		(path) => {
			const tags = covers(pageAt(path).html);

			expect(tags.filter((tag) => tag.includes('fetchpriority="high"'))).toHaveLength(1);
			expect(tags[0]).toContain('fetchpriority="high"');
			expect(tags[0]).toContain('loading="eager"');
			for (const tag of tags.slice(1)) expect(tag).toContain('loading="lazy"');
		},
	);

	it.each(['/services', '/about', '/contact'])('%s has no high priority image', (path) => {
		expect(pageAt(path).html).not.toContain('fetchpriority');
	});
});

describe('still static (AC-16)', () => {
	it('has no Worker bundle or server entry in dist/', () => {
		expect(existsSync(new URL('_worker.js', distUrl))).toBe(false);
	});
});
