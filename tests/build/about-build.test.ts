// Checks the built About page in dist/ (feature 10). Run after
// `npm run build`, with `npm run test:build`.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ABOUT, RESUME_PATH } from '../../src/lib/about';

const dist = new URL('../../dist/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, dist), 'utf8');
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

const page = read('about/index.html');
const head = page.slice(page.indexOf('<head>'), page.indexOf('</head>'));

describe('about page head', () => {
	it('builds the page at dist/about/index.html, served at /about', () => {
		expect(existsSync(new URL('about/index.html', dist))).toBe(true);
	});

	it('uses the ABOUT title and description, and the share tags from them', () => {
		expect(head).toContain(`<title>${escapeHtml(ABOUT.title)}</title>`);
		expect(head).toContain(`<meta name="description" content="${escapeHtml(ABOUT.description)}">`);
		expect(head).toContain(`<meta property="og:title" content="${escapeHtml(ABOUT.title)}">`);
		expect(head).toContain(
			`<meta property="og:description" content="${escapeHtml(ABOUT.description)}">`,
		);
		expect(head).toContain('<meta property="og:url" content="https://toyintest.org/about">');
		expect(head).not.toMatch(/og:image|twitter:image/);
	});
});

describe('about page resume', () => {
	const file = new URL(RESUME_PATH.slice(1), dist);
	const hasResume = existsSync(new URL(`../../public${RESUME_PATH}`, import.meta.url));

	it.runIf(hasResume)('ships the resume PDF the download button points at', () => {
		expect(page).toContain(`href="${RESUME_PATH}"`);
		expect(existsSync(file)).toBe(true);
		expect(readFileSync(file).subarray(0, 5).toString('latin1')).toBe('%PDF-');
	});

	it.runIf(!hasResume)('links to no resume while the PDF is not in public/', () => {
		expect(existsSync(file)).toBe(false);
		expect(page).not.toContain(RESUME_PATH);
		expect(page).not.toContain(escapeHtml(ABOUT.resumeLabel));
	});
});

describe('about page scripts', () => {
	it('holds only the two spec 0003 scripts: the theme script and the toggle', () => {
		const scripts = page.match(/<script[^>]*>/g) ?? [];

		expect(scripts).toEqual(['<script>', '<script type="module">']);
		expect(page).not.toMatch(/<script[^>]*\bsrc=/);
	});
});
