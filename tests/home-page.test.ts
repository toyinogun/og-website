// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint. The
// container API cannot render the real collection's covers, so the collection
// is empty here (the page with no featured project, AC-5); the real cards are
// checked against the build (tests/build/) and in the browser (e2e/).
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Index from '../src/pages/index.astro';
import { HOME } from '../src/lib/home';
import { SITE } from '../src/lib/site';
import { firstParagraph } from '../src/lib/text';

vi.mock('astro:content', () => ({ getCollection: async () => [] }));

const bio = readFileSync(new URL('../src/content/bio.md', import.meta.url), 'utf8');

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

describe('home page', () => {
	let html: string;
	let main: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org' },
		});
		html = await container.renderToString(Index, {
			request: new Request('http://localhost:4321/'),
		});
		main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
	});

	// covers: AC-12
	it('uses the HOME title and description in the head', () => {
		expect(html).toContain(`<title>${escapeHtml(HOME.title)}</title>`);
		expect(html).toContain(`<meta name="description" content="${escapeHtml(HOME.description)}"`);
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/"');
	});

	// covers: AC-1, AC-16
	it('has exactly one h1, holding the HOME heading at display size', () => {
		const headings = main.match(/<h1[\s>][\s\S]*?<\/h1>/g) ?? [];

		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(headings).toEqual([`<h1 class="text-display">${escapeHtml(HOME.heading)}</h1>`]);
	});

	// covers: AC-1
	it('opens main with the intro: availability, heading, lead, then the call to action', () => {
		const positions = [
			main.indexOf('<div class="pt-12 md:pt-20">'),
			main.indexOf(`>${escapeHtml(HOME.availability)}</p>`),
			main.indexOf('<h1'),
			main.indexOf(`>${escapeHtml(HOME.lead)}</p>`),
			main.indexOf(`href="${SITE.contact.href}"`),
		];
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
		// The intro is the first thing inside the page Container.
		expect(main).toMatch(
			/^<main[^>]*>\s*<div class="mx-auto w-full px-5 md:px-8 max-w-page">\s*<div class="pt-12 md:pt-20">/,
		);
	});

	// covers: AC-3
	it('holds exactly two links to the contact address in main, both primary buttons', () => {
		const contactLinks = main.match(new RegExp(`<a href="${SITE.contact.href}"[^>]*>`, 'g')) ?? [];

		expect(contactLinks).toHaveLength(2);
		for (const link of contactLinks) expect(link).toContain('bg-accent');
		expect(main.match(/[\s"]bg-accent[\s"]/g)).toHaveLength(2);
		expect(main).not.toContain('target=');
	});

	// covers: AC-15
	it('gives both buttons the full width below sm and their natural width from sm', () => {
		const contactLinks = main.match(new RegExp(`<a href="${SITE.contact.href}"[^>]*>`, 'g')) ?? [];

		for (const link of contactLinks) {
			expect(link).toMatch(/\bw-full\b/);
			expect(link).toMatch(/\bsm:w-auto\b/);
			expect(link).toMatch(/\bsm:self-start\b/);
		}
	});

	// covers: AC-9
	it('ends main with the contact section: heading, closing text, then the call to action', () => {
		const lastSection = main.slice(main.lastIndexOf('<section'));

		expect(lastSection).toMatch(/^<section id="contact" aria-labelledby="contact-heading"/);
		expect(lastSection).toContain(`>${escapeHtml(HOME.closingHeading)}</h2>`);
		const text = lastSection.indexOf(`>${escapeHtml(HOME.closingText)}</p>`);
		const button = lastSection.indexOf(`href="${SITE.contact.href}"`);
		expect(text).toBeGreaterThan(-1);
		expect(button).toBeGreaterThan(text);
	});

	// covers: AC-10
	it('marks the Home nav link as the current page', () => {
		expect(html).toMatch(/<a href="\/" aria-current="page"/);
	});

	// covers: AC-8 (spec 0003)
	it('leaves the one main landmark to the base layout', () => {
		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
		expect(html).toContain('<main id="main" tabindex="-1"');
	});

	// covers: AC-2 (spec 0003)
	it('uses no opacity styling for its text', () => {
		expect(html).not.toMatch(/\bopacity-/);
	});

	// covers: key invariant (spec 0004): no link to a page that does not exist yet
	it('links to no page that has not shipped', () => {
		expect(html).not.toMatch(/href="\/(work|contact)\b/);
		expect(html).not.toMatch(/href="\/projects\//);
	});

	// covers: AC-7
	// covers: feature 10 (spec 0004, Follow-up)
	it('shows the first bio paragraph, and nothing after it, then More about me, in the About section', () => {
		const about = main.slice(
			main.indexOf('<section id="about"'),
			main.indexOf('<section id="contact"'),
		);
		const secondParagraph = bio.trim().split(/\n\s*\n/)[1] ?? '';

		expect(about).toMatch(/^<section id="about" aria-labelledby="about-heading"/);
		expect(about).toContain(`>${escapeHtml(HOME.aboutHeading)}</h2>`);
		expect(about.match(/<p[\s>]/g)).toHaveLength(1);
		expect(about).toContain(`<p class="max-w-measure">${escapeHtml(firstParagraph(bio))}</p>`);
		expect(secondParagraph.length).toBeGreaterThan(0);
		expect(html).not.toContain(escapeHtml(secondParagraph.split('. ')[0] ?? ''));
		const links = about.match(/<a [^>]*>[^<]*<\/a>/g) ?? [];
		expect(links).toHaveLength(1);
		expect(links[0]).toMatch(/^<a href="\/about"/);
		expect(links[0]).toContain(`>${escapeHtml(HOME.aboutLink)}</a>`);
		expect(about.indexOf('<a ')).toBeGreaterThan(about.indexOf(escapeHtml(firstParagraph(bio))));
	});

	// covers: AC-5
	it('keeps the intro, About and closing sections, and no work section, with no featured project', () => {
		expect(main).not.toContain('selected-work');
		expect(main.match(/<section /g)).toHaveLength(2);
		expect(main.indexOf('<h1')).toBeLessThan(main.indexOf('<section id="about"'));
	});
});
