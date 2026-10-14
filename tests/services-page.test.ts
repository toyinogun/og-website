// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint. The
// collection is stood in for with minimal entries. Drafts are left to the build
// test (AC-14: import.meta.env.DEV is true here); the real proof is checked
// against the build (tests/build/) and in the browser (e2e/).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Services from '../src/pages/services.astro';
import { SERVICES_PAGE } from '../src/lib/services';
import { SITE } from '../src/lib/site';

vi.mock('astro:content', () => {
	const entry = (id: string, order: number, draft: boolean) => ({
		id,
		collection: 'projects',
		data: { title: `Title of ${id}`, order, draft, services: ['ci-cd'] },
	});
	return {
		getCollection: async () => [entry('second', 20, false), entry('first', 10, false)],
	};
});

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#39;');

describe('services page', () => {
	let html: string;
	let main: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org', trailingSlash: 'never' },
		});
		html = await container.renderToString(Services, {
			request: new Request('http://localhost:4321/services'),
		});
		main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
	});

	// covers: AC-10
	it('uses the SERVICES_PAGE title and description, canonical address and no noindex', () => {
		expect(html).toContain(`<title>${escapeHtml(SERVICES_PAGE.title)}</title>`);
		expect(html).toContain(
			`<meta name="description" content="${escapeHtml(SERVICES_PAGE.description)}"`,
		);
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/services"');
		expect(html).toContain('<meta property="og:url" content="https://toyintest.org/services"');
		expect(html).not.toContain('noindex');
		expect(html).not.toContain('application/ld+json');
	});

	// covers: AC-1, AC-12
	it('has exactly one h1, with the eyebrow, heading and lead in the intro', () => {
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(main).toContain(
			`<p class="text-sm text-muted">${escapeHtml(SERVICES_PAGE.availability)}</p>`,
		);
		expect(main).toContain(`<h1 class="text-3xl">${SERVICES_PAGE.heading}</h1>`);
		expect(main).toContain(`<p class="text-lg text-muted">${escapeHtml(SERVICES_PAGE.lead)}</p>`);
		expect(main.indexOf('<h1')).toBeLessThan(main.indexOf('<section'));
	});

	// covers: AC-1, AC-5, AC-6, AC-7, AC-8
	it('orders the sections offers, how, pricing, contact', () => {
		const ids = [...main.matchAll(/<section id="([a-z]+)"/g)].map((m) => m[1]);

		expect(ids).toEqual(['offers', 'how', 'pricing', 'contact']);
	});

	// covers: AC-5
	it('lists the five offers in order with proof in the order of `order`', () => {
		const offers = main.slice(
			main.indexOf('<section id="offers"'),
			main.indexOf('<section id="how"'),
		);

		for (const offer of SERVICES_PAGE.offers)
			expect(offers).toContain(`>${escapeHtml(offer.name)}</h3>`);
		const delivery = offers.slice(offers.indexOf(SERVICES_PAGE.offers[1].name));
		expect(delivery.indexOf('Title of first')).toBeGreaterThan(-1);
		expect(delivery.indexOf('Title of first')).toBeLessThan(delivery.indexOf('Title of second'));
	});

	// covers: AC-6
	it('holds the five steps in an ordered list', () => {
		const how = main.slice(
			main.indexOf('<section id="how"'),
			main.indexOf('<section id="pricing"'),
		);

		expect(how).toContain('<ol class="');
		expect(how).toContain('list-decimal');
		expect(how.match(/<li>/g)).toHaveLength(5);
		SERVICES_PAGE.steps.forEach((step) => expect(how).toContain(`>${escapeHtml(step.title)}</h3>`));
	});

	// covers: AC-7
	it('holds two pricing models and the note, with no digit or currency sign', () => {
		const pricing = main.slice(
			main.indexOf('<section id="pricing"'),
			main.indexOf('<section id="contact"'),
		);
		const text = pricing.replace(/<[^>]*>/g, ' ');

		expect(pricing.match(/<li>/g)).toHaveLength(2);
		expect(pricing).toContain(escapeHtml(SERVICES_PAGE.pricingNote));
		expect(text).not.toMatch(/[0-9€$£]/);
	});

	// covers: AC-8
	it('ends main with the contact section and holds exactly two contact links, both primary buttons', () => {
		const last = main.slice(main.lastIndexOf('<section'));
		const links = main.match(new RegExp(`<a href="${SITE.contact.href}"[^>]*>`, 'g')) ?? [];

		expect(last).toMatch(/^<section id="contact" aria-labelledby="contact-heading"/);
		expect(last).toContain(`>${escapeHtml(SERVICES_PAGE.closingHeading)}</h2>`);
		expect(last).toContain(`<p class="max-w-measure">${escapeHtml(SERVICES_PAGE.closingText)}</p>`);
		expect(links).toHaveLength(2);
		for (const link of links) {
			expect(link).toMatch(/\bw-full\b/);
			expect(link).toMatch(/\bsm:w-auto\b/);
		}
	});

	// covers: AC-9
	it('marks Services as the current page, and nothing else', () => {
		expect(html).toMatch(/<a href="\/services" aria-current="page"/);
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
	});

	// covers: AC-13
	it('has no image in main', () => {
		expect(main).not.toContain('<img');
	});
});
