// Checks the built contact page in dist/ (feature 11, spec 0006), and that the
// form adds nothing to any other page. Run after `npm run build`, with
// `npm run test:build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACT } from '../../src/lib/contact';

const dist = new URL('../../dist/', import.meta.url);
const distPath = fileURLToPath(dist);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

/** Every file under dist/, as paths relative to it. */
const filesUnder = (dir: string): readonly string[] =>
	readdirSync(join(distPath, dir)).flatMap((name) => {
		const path = dir ? `${dir}/${name}` : name;
		return statSync(join(distPath, path)).isDirectory() ? filesUnder(path) : [path];
	});

const files = filesUnder('');
const pages = files.filter((path) => path.endsWith('.html'));
const page = read('contact/index.html');
const head = page.slice(page.indexOf('<head>'), page.indexOf('</head>'));

describe('contact page head', () => {
	// covers: AC-1
	it('builds the page at dist/contact/index.html, served at /contact', () => {
		expect(existsSync(new URL('contact/index.html', dist))).toBe(true);
	});

	// covers: AC-2
	it('uses the CONTACT title and description, and the share tags from them', () => {
		expect(head).toContain(`<title>${escapeHtml(CONTACT.title)}</title>`);
		expect(head).toContain(
			`<meta name="description" content="${escapeHtml(CONTACT.description)}">`,
		);
		expect(head).toContain(`<meta property="og:title" content="${escapeHtml(CONTACT.title)}">`);
		expect(head).toContain('<link rel="canonical" href="https://toyintest.org/contact">');
		expect(head).toContain('<meta property="og:url" content="https://toyintest.org/contact">');
	});
});

describe('contact page scripts (AC-24)', () => {
	const contactScripts = page.match(/<script[^>]*\bsrc="([^"]+)"/g) ?? [];

	// covers: AC-24
	it('adds exactly one bundled module script to the spec 0003 two', () => {
		const tags = page.match(/<script[^>]*>/g) ?? [];

		expect(tags.slice(0, 2)).toEqual(['<script>', '<script type="module">']);
		expect(tags).toHaveLength(3);
		expect(contactScripts).toHaveLength(1);
		expect(contactScripts[0]).toMatch(/^<script type="module" src="\/_astro\/[^"]+\.js"/);
	});

	// covers: AC-11, AC-24
	it('loads Turnstile explicitly from Cloudflare, from the form script only', () => {
		const src = (contactScripts[0] ?? '').match(/src="\/([^"]+)"/)?.[1] ?? '';
		const bundle = read(src);

		expect(bundle).toContain(
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
		);
	});

	// covers: AC-11, AC-24
	it('mentions Turnstile in the form script alone, which only the contact page loads', () => {
		const src = (contactScripts[0] ?? '').match(/src="\/([^"]+)"/)?.[1] ?? '';
		const mentioning = files.filter((path) => read(path).includes('challenges.cloudflare.com'));

		expect(mentioning).toEqual([src]);
		expect(pages.filter((path) => read(path).includes(src))).toEqual(['contact/index.html']);
		expect(
			pages.filter((path) => path !== 'contact/index.html' && read(path).includes('turnstile')),
		).toEqual([]);
	});

	// covers: AC-24
	it.each(pages.filter((path) => path !== 'contact/index.html'))(
		'keeps %s to the spec 0003 scripts, with no script file',
		(path) => {
			const html = read(path);

			expect(html).not.toMatch(/<script[^>]*\bsrc=/);
			expect(html).not.toContain('contact-form');
		},
	);
});

describe('no Turnstile test key ships (AC-19)', () => {
	// covers: AC-19
	it('holds no Cloudflare test site key or secret in any built file', () => {
		const withTestKey = files
			.filter((path) => /\.(html|js|css|json|txt|xml|svg)$/.test(path))
			.filter((path) => /\b[123]x0{5,}/.test(read(path)));

		expect(withTestKey).toEqual([]);
	});

	// covers: AC-19
	it('gives the form a site key', () => {
		expect(page).toMatch(/<form id="contact-form"[^>]*data-site-key="[^"]+"/);
	});
});
