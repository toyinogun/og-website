// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint.
import { existsSync, readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import About from '../src/pages/about.astro';
import { ABOUT, RESUME_PATH } from '../src/lib/about';
import { SITE } from '../src/lib/site';

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

/** Whether the cleaned resume is in public/: the button shows only then. */
const hasResume = existsSync(new URL(`../public${RESUME_PATH}`, import.meta.url));

/** The bio's paragraphs, from the one file the page imports. */
const paragraphs = readFileSync(new URL('../src/content/bio.md', import.meta.url), 'utf8')
	.trim()
	.split(/\n\s*\n/);

describe('about page', () => {
	let html: string;
	let main: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org', trailingSlash: 'never' },
		});
		html = await container.renderToString(About, {
			request: new Request('http://localhost:4321/about'),
		});
		main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
	});

	it('uses the ABOUT title and description in the head', () => {
		expect(html).toContain(`<title>${escapeHtml(ABOUT.title)}</title>`);
		expect(html).toContain(`<meta name="description" content="${escapeHtml(ABOUT.description)}"`);
		expect(html).toContain(`<meta property="og:title" content="${escapeHtml(ABOUT.title)}"`);
	});

	it('gives the page a canonical address without a trailing slash', () => {
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/about"');
	});

	it('sits in the reading column and opens with the intro', () => {
		expect(main).toMatch(
			/^<main[^>]*>\s*<div class="mx-auto w-full px-5 md:px-8 max-w-measure">\s*<div class="pt-12 md:pt-20">/,
		);
	});

	it('has exactly one h1, holding the ABOUT heading at page size, then the lead', () => {
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(main).toContain(`<h1 class="text-3xl">${escapeHtml(ABOUT.heading)}</h1>`);
		expect(main).toContain(`<p class="text-lg text-muted">${escapeHtml(ABOUT.lead)}</p>`);
	});

	it.runIf(hasResume)(
		'offers the resume as a secondary button that downloads the PDF, in the intro',
		() => {
			const intro = main.slice(
				main.indexOf('<div class="pt-12'),
				main.indexOf('<div class="prose'),
			);
			const resume = intro.match(new RegExp(`<a href="${RESUME_PATH}"[^>]*>`))?.[0] ?? '';

			expect(resume).toMatch(/\bdownload\b/);
			expect(resume).toContain('border-line');
			expect(resume).not.toContain('bg-accent');
			expect(intro).toContain(`>${escapeHtml(ABOUT.resumeLabel)}</a>`);
		},
	);

	it.runIf(!hasResume)('hides the resume button while the PDF is not in public/', () => {
		expect(html).not.toContain(RESUME_PATH);
		expect(html).not.toContain(escapeHtml(ABOUT.resumeLabel));
	});

	it('tells the whole story from bio.md through Prose, one paragraph each', () => {
		const prose = main.slice(main.indexOf('<div class="prose'), main.indexOf('<section'));

		expect(paragraphs.length).toBeGreaterThan(1);
		expect(prose.match(/<p[\s>]/g)).toHaveLength(paragraphs.length);
		for (const paragraph of paragraphs) {
			// Markdown renders straight apostrophes as typographic ones.
			expect(prose).toContain((paragraph.split(/[.:]/)[0] ?? '').replaceAll("'", '’'));
		}
	});

	it('lists every link out from SITE.links, in order, as rel="me" profiles', () => {
		const section = main.slice(
			main.indexOf('<section id="links"'),
			main.indexOf('<section id="contact"'),
		);
		const links = [...section.matchAll(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g)];

		expect(section).toContain(`>${escapeHtml(ABOUT.linksHeading)}</h2>`);
		expect(links.map((m) => [m[1], m[3]])).toEqual(
			SITE.links.map((link) => [link.href, link.label]),
		);
		for (const [i, link] of SITE.links.entries()) {
			if (link.kind === 'profile') expect(links[i]?.[2]).toContain('rel="me"');
		}
	});

	it('ends main with the contact section: heading, closing text, then the call to action', () => {
		const lastSection = main.slice(main.lastIndexOf('<section'));

		expect(lastSection).toMatch(/^<section id="contact" aria-labelledby="contact-heading"/);
		expect(lastSection).toContain(`>${escapeHtml(ABOUT.closingHeading)}</h2>`);
		const text = lastSection.indexOf(
			`<p class="max-w-measure">${escapeHtml(ABOUT.closingText)}</p>`,
		);
		const button = lastSection.indexOf(`href="${SITE.contact.href}"`);
		expect(text).toBeGreaterThan(-1);
		expect(button).toBeGreaterThan(text);
	});

	it('holds one primary button, the call to action, full width below sm', () => {
		const primary = main.match(/<a [^>]*[\s"]bg-accent[\s"][^>]*>/g) ?? [];

		expect(primary).toHaveLength(1);
		expect(primary[0]).toContain(`href="${SITE.contact.href}"`);
		expect(primary[0]).toMatch(/\bw-full\b/);
		expect(primary[0]).toMatch(/\bsm:w-auto\b/);
	});

	it('marks About as the current page, and no other', () => {
		expect(html).toMatch(/<a href="\/about" aria-current="page"/);
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
	});

	it('leaves the one main landmark to the base layout', () => {
		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
	});
});
