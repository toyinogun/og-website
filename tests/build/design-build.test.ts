// Checks the production build in dist/ against spec 0003. Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/lib/site';

const dist = new URL('../../dist/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const exists = (path: string) => existsSync(new URL(path, dist));

const PAGES = ['index.html', '404.html'] as const;
const headOf = (html: string) => html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

describe('the build exists', () => {
	it('has dist/index.html (run npm run build first)', () => {
		expect(exists('index.html')).toBe(true);
	});
});

describe('nav links (AC-11)', () => {
	// covers: AC-11
	it.each(SITE.nav.map((item) => [item.href] as const))('builds a page for %s', (href) => {
		expect(exists(href === '/' ? 'index.html' : `${href.slice(1)}/index.html`)).toBe(true);
	});

	it('runs with the nav as it is today', () => {
		expect(Array.isArray(SITE.nav)).toBe(true);
	});
});

describe('no style guide in production (AC-18)', () => {
	// covers: AC-18
	it('emits nothing named styleguide', () => {
		const all = (dir: URL): readonly string[] =>
			readdirSync(dir).flatMap((name) => {
				const url = new URL(name, dir);
				return statSync(url).isDirectory() ? all(new URL(`${name}/`, dir)) : [url.pathname];
			});

		expect(all(dist).filter((path) => path.includes('styleguide'))).toEqual([]);
	});
});

describe.each(PAGES)('head of %s', (page) => {
	const head = headOf(read(page));

	// covers: AC-5
	it('puts the theme script first, before every stylesheet link and style', () => {
		const firstScript = head.indexOf('<script');
		expect(head.slice(firstScript)).toMatch(/^<script>\(function\(\)\{try\{var t=localStorage/);
		const styles = [...head.matchAll(/<style|<link rel="stylesheet"/g)].map((m) => m.index);
		expect(styles.length).toBeGreaterThan(0);
		expect(styles.every((index) => index > firstScript)).toBe(true);
	});

	// covers: AC-7
	it('preloads exactly the two normal faces', () => {
		const preloads = [...head.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map(
			(m) => m[1],
		);
		const normalFaces = [...head.matchAll(/src:url\("([^"]+)"\)[^}]*font-style:normal/g)].map(
			(m) => m[1],
		);

		expect(preloads).toHaveLength(2);
		expect([...preloads].sort()).toEqual([...new Set(normalFaces)].sort());
	});

	// covers: AC-7
	it('loads fonts only from the site itself', () => {
		const urls = [...head.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);

		expect(urls.length).toBeGreaterThan(0);
		expect(urls.every((url) => url.startsWith('/_astro/fonts/'))).toBe(true);
	});

	// covers: AC-17
	it('links the SVG favicon and the touch icon, and no favicon.ico', () => {
		expect(head).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
		expect(head).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
		expect(head).not.toContain('favicon.ico');
	});
});

describe('font faces (AC-7)', () => {
	const head = headOf(read('index.html'));
	const faces = [...head.matchAll(/@font-face\{([^}]*)\}/g)]
		.map((m) => m[1])
		.filter((face) => face.includes('url("'));
	const files = [...new Set(faces.map((face) => /url\("([^"]+)"\)/.exec(face)?.[1] ?? ''))];

	// covers: AC-7
	it('emits exactly three faces: Inter normal and italic, Source Serif 4 normal', () => {
		const described = faces
			.map((face) => {
				const family = /font-family:"([^"-]+)/.exec(face)?.[1];
				const style = /font-style:(\w+)/.exec(face)?.[1];
				const weight = /font-weight:([\d ]+);/.exec(face)?.[1];
				return `${family} ${style} ${weight}`;
			})
			.sort();

		expect(described).toEqual([
			'Inter Variable italic 100 900',
			'Inter Variable normal 100 900',
			'Source Serif 4 Variable normal 200 900',
		]);
		expect(files).toHaveLength(3);
	});

	// covers: AC-7
	it('ships three font files of at most 300 KB together', () => {
		const fonts = readdirSync(new URL('_astro/fonts/', dist));
		const total = files
			.map((url) => statSync(new URL(url.slice(1), dist)).size)
			.reduce((sum, size) => sum + size, 0);

		expect(fonts).toHaveLength(3);
		expect(total).toBeLessThanOrEqual(300 * 1024);
	});
});

describe('motion rules in the built CSS (AC-16)', () => {
	const css = readdirSync(new URL('_astro/', dist))
		.filter((name) => name.endsWith('.css'))
		.map((name) => read(`_astro/${name}`))
		.join('\n');
	const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));

	// covers: AC-16
	it('turns on cross document view transitions and times the root cross fade', () => {
		expect(css).toContain('@view-transition{navigation:auto}');
		expect(css).toMatch(
			/::view-transition-old\(root\),::view-transition-new\(root\)\{animation-duration:var\(--duration-page\)\}/,
		);
	});

	// covers: AC-16
	it('keeps the header still during a transition', () => {
		expect(css).toContain(
			'::view-transition-group(site-header),::view-transition-old(site-header),::view-transition-new(site-header){animation:none}',
		);
	});

	// covers: AC-16
	it('switches transitions and animations off under reduced motion', () => {
		expect(reduced).toMatch(
			/^@media \(prefers-reduced-motion:reduce\)\{@view-transition\{navigation:none\}/,
		);
		expect(reduced).toContain(
			'::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none}',
		);
		expect(reduced).toMatch(/\*,:before,:after\{transition:none\}/);
	});

	// covers: AC-16
	it('times hover and focus colour changes with --duration-fast', () => {
		expect(css).toContain('transition-duration:var(--duration-fast)');
	});
});
