// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint. The
// container API cannot render the real collection's covers, so the collection
// is empty here (the empty state, AC-4); the real cards are checked against
// the build (tests/build/) and in the browser (e2e/).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Projects from '../src/pages/projects/index.astro';
import { SITE } from '../src/lib/site';
import { WORK } from '../src/lib/work';

vi.mock('astro:content', () => ({ getCollection: async () => [] }));

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

describe('work listing page', () => {
	let html: string;
	let main: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org', trailingSlash: 'never' },
		});
		html = await container.renderToString(Projects, {
			request: new Request('http://localhost:4321/projects'),
		});
		main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
	});

	// covers: AC-11
	it('uses the WORK title and description in the head', () => {
		expect(html).toContain(`<title>${escapeHtml(WORK.title)}</title>`);
		expect(html).toContain(`<meta name="description" content="${escapeHtml(WORK.description)}"`);
	});

	// covers: AC-10
	it('gives the page a canonical address without a trailing slash', () => {
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/projects"');
		expect(html).toContain('<meta property="og:url" content="https://toyintest.org/projects"');
	});

	// covers: AC-1, AC-13
	it('has exactly one h1, holding the WORK heading at page size', () => {
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(main).toContain(`<h1 class="text-3xl">${escapeHtml(WORK.heading)}</h1>`);
	});

	// covers: AC-1
	it('opens the page Container with the intro: heading then lead, no eyebrow and no action', () => {
		expect(main).toMatch(
			/^<main[^>]*>\s*<div class="mx-auto w-full px-5 md:px-8 max-w-page">\s*<div class="pt-12 md:pt-20">/,
		);
		const intro = main.slice(main.indexOf('<div class="pt-12'), main.indexOf('<section'));
		expect(intro.match(/<p[\s>]/g)).toHaveLength(1);
		expect(intro).toContain(`<p class="text-lg text-muted">${escapeHtml(WORK.lead)}</p>`);
		expect(intro).not.toContain('<a ');
	});

	// covers: AC-4
	it('shows the empty line in the projects section, with no list, card or button', () => {
		const projects = main.slice(
			main.indexOf('<section id="projects"'),
			main.indexOf('<section id="contact"'),
		);

		expect(projects).toMatch(/^<section id="projects" class="py-16 md:py-24">/);
		expect(projects).not.toContain('<h2');
		expect(projects.match(/<p[\s>]/g)).toHaveLength(1);
		expect(projects).toContain(`<p class="max-w-measure">${escapeHtml(WORK.emptyText)}</p>`);
		expect(projects).not.toMatch(/<(ul|article|a|button)[\s>]/);
	});

	// covers: AC-4, AC-5
	it('ends main with the contact section: heading, closing text, then the call to action', () => {
		const lastSection = main.slice(main.lastIndexOf('<section'));

		expect(lastSection).toMatch(/^<section id="contact" aria-labelledby="contact-heading"/);
		expect(lastSection).toContain(`>${escapeHtml(WORK.closingHeading)}</h2>`);
		const text = lastSection.indexOf(
			`<p class="max-w-measure">${escapeHtml(WORK.closingText)}</p>`,
		);
		const button = lastSection.indexOf(`href="${SITE.contact.href}"`);
		expect(text).toBeGreaterThan(-1);
		expect(button).toBeGreaterThan(text);
	});

	// covers: AC-5, AC-12
	it('holds exactly one contact link in main, the one primary button, full width below sm', () => {
		const contactLinks = main.match(new RegExp(`<a href="${SITE.contact.href}"[^>]*>`, 'g')) ?? [];

		expect(contactLinks).toHaveLength(1);
		expect(contactLinks[0]).toContain('bg-accent');
		expect(contactLinks[0]).toMatch(/\bw-full\b/);
		expect(contactLinks[0]).toMatch(/\bsm:w-auto\b/);
		expect(contactLinks[0]).toMatch(/\bsm:self-start\b/);
		expect(main.match(/[\s"]bg-accent[\s"]/g)).toHaveLength(1);
	});

	// covers: AC-9
	it('marks Work as the current page, and not Home', () => {
		expect(html).toMatch(/<a href="\/projects" aria-current="page"/);
		expect(html).not.toMatch(/<a href="\/" aria-current="page"/);
	});

	// covers: AC-8 (spec 0003)
	it('leaves the one main landmark to the base layout', () => {
		expect(html.match(/<main[\s>]/g)).toHaveLength(1);
	});
});
