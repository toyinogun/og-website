// Testimonials (spec 0009; design.md, Component values: Testimonials).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import { testimonialView, type Testimonial, type TestimonialView } from '../lib/testimonials';
import Testimonials from './Testimonials.astro';

const view = (id: string, over: Partial<TestimonialView> = {}): TestimonialView => ({
	id,
	quote: `Quote of ${id}.`,
	name: `Name ${id}`,
	attribution: 'Lead, Example BV',
	...over,
});

describe('Testimonials', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create();
	});

	const render = (testimonials: TestimonialView[], projectLabel?: string) =>
		container.renderToString(Testimonials, {
			props: { heading: 'What people say', id: 'testimonials', projectLabel, testimonials },
		});

	// covers: AC-7, AC-11
	it('renders nothing for an empty list', async () => {
		expect((await render([])).trim()).toBe('');
	});

	// covers: AC-7
	it('renders a labelled section with an h2, a ul and one figure per quote, in order', async () => {
		const html = await render([view('a'), view('b')]);

		expect(html).toMatch(/^\s*<section id="testimonials" aria-labelledby="testimonials-heading"/);
		expect(html).toContain('<h2 id="testimonials-heading" class="mb-6">What people say</h2>');
		expect(html).not.toContain('<h3');
		expect(html.match(/<li>/g)).toHaveLength(2);
		expect(html.match(/<figure>/g)).toHaveLength(2);
		expect(html.match(/<blockquote /g)).toHaveLength(2);
		expect(html.match(/<figcaption /g)).toHaveLength(2);
		expect(html.indexOf('Quote of a')).toBeLessThan(html.indexOf('Quote of b'));
	});

	// covers: AC-8
	it('sets one quote at text-2xl and two or more at text-xl, plain, with no quotation marks', async () => {
		const one = await render([view('a')]);
		const two = await render([view('a'), view('b')]);

		expect(one).toMatch(/<p class="[^"]*font-serif[^"]*\btext-2xl\b[^"]*">Quote of a\.<\/p>/);
		expect(one).not.toContain('text-xl');
		expect(two.match(/\btext-xl\b/g)).toHaveLength(2);
		expect(two).not.toContain('text-2xl');
		for (const html of [one, two]) {
			expect(html).toContain('border-l-2 border-line pl-5');
			expect(html).toContain('max-w-measure');
			expect(html).not.toContain('italic');
			expect(html).not.toMatch(/[“”"]Quote of/);
		}
	});

	// covers: AC-7
	it('links the name only when there is a profile URL', async () => {
		const html = await render([view('a', { profileUrl: 'https://example.com/a' }), view('b')]);

		expect(html).toMatch(/<a href="https:\/\/example.com\/a"[^>]*min-h-6[^>]*>\s*Name a\s*<\/a>/);
		expect(html.match(/<a /g)).toHaveLength(1);
		expect(html).toContain('Name b');
	});

	// covers: AC-7
	it('shows the project line only with both a project and a project label', async () => {
		const withProject = view('a', { project: { title: 'Cluster', href: '/projects/cluster' } });

		const both = await render([withProject], 'On');
		expect(both).toMatch(/On\s*<a href="\/projects\/cluster"[^>]*>\s*Cluster\s*<\/a>/);

		expect(await render([withProject])).not.toContain('Cluster');
		expect(await render([view('a')], 'On')).not.toMatch(/>On\b/);
	});

	// covers: AC-7, AC-8
	it('shows the attribution in muted small text and adds no image or card chrome', async () => {
		const html = await render([view('a')]);

		expect(html).toContain('<p class="text-sm text-muted">Lead, Example BV</p>');
		expect(html).toContain('text-base font-semibold text-text');
		expect(html).not.toMatch(/<img|shadow|bg-|rounded/);
	});

	// covers: AC-13
	it('shows nothing from permission when fed a real entry through testimonialView', async () => {
		const entry = {
			id: 'jane-doe',
			collection: 'testimonials',
			data: {
				quote: 'Toyin rebuilt our cluster as code in three weeks.',
				name: 'Jane Doe',
				role: 'Lead',
				company: 'Example BV',
				order: 1,
				permission: { date: '2026-11-02', via: 'in-person' },
			},
		} as unknown as Testimonial;
		const html = await render([testimonialView(entry, [])]);

		expect(html).toContain('Jane Doe');
		expect(html).not.toContain('2026-11-02');
		expect(html).not.toContain('in-person');
		expect(html).not.toContain('permission');
	});
});
