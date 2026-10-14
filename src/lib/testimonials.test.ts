import { describe, expect, it } from 'vitest';
import type { Project } from './projects';
import {
	HOME_TESTIMONIAL_LIMIT,
	attributionLine,
	homeTestimonials,
	sortTestimonials,
	testimonialView,
	testimonialsFor,
	type Testimonial,
} from './testimonials';

const quote = (id: string, order: number, project?: string): Testimonial =>
	({
		id,
		collection: 'testimonials',
		data: {
			quote: `Quote of ${id} is long enough.`,
			name: `Name ${id}`,
			role: 'Lead',
			company: 'Example BV',
			order,
			project,
			profileUrl: id === 'a' ? 'https://example.com/a' : undefined,
			permission: { date: '2026-11-02', via: 'email' },
		},
	}) as unknown as Testimonial;

const project = (id: string, title: string): Project =>
	({ id, collection: 'projects', data: { title } }) as unknown as Project;

describe('sortTestimonials', () => {
	// covers: AC-6
	it('sorts by order, lowest first, without mutating the input', () => {
		const input = [quote('c', 30), quote('a', 10), quote('b', 20)];
		const copy = [...input];
		expect(sortTestimonials(input).map((e) => e.id)).toEqual(['a', 'b', 'c']);
		expect(input).toEqual(copy);
	});
});

describe('homeTestimonials', () => {
	// covers: AC-6
	it('limits to three', () => {
		expect(HOME_TESTIMONIAL_LIMIT).toBe(3);
		const sorted = ['a', 'b', 'c', 'd', 'e'].map((id, i) => quote(id, i + 1));
		expect(homeTestimonials(sorted).map((e) => e.id)).toEqual(['a', 'b', 'c']);
		expect(homeTestimonials(sorted.slice(0, 2))).toHaveLength(2);
		expect(homeTestimonials([])).toEqual([]);
	});
});

describe('testimonialsFor', () => {
	// covers: AC-6
	it('returns every quote for the project, in the given order, with no cap', () => {
		const sorted = [
			quote('a', 1, 'x'),
			quote('b', 2, 'y'),
			quote('c', 3, 'x'),
			quote('d', 4, 'x'),
			quote('e', 5, 'x'),
			quote('f', 6),
		];
		expect(testimonialsFor('x', sorted).map((e) => e.id)).toEqual(['a', 'c', 'd', 'e']);
		expect(testimonialsFor('none', sorted)).toEqual([]);
	});
});

describe('attributionLine', () => {
	// covers: AC-6
	it('joins role and company', () => {
		expect(attributionLine({ role: 'Lead', company: 'Example BV' })).toBe('Lead, Example BV');
	});
});

describe('testimonialView', () => {
	// covers: AC-6, AC-13
	it('builds the render shape and never carries permission', () => {
		const view = testimonialView(quote('a', 1), []);
		expect(view).toMatchObject({
			id: 'a',
			quote: 'Quote of a is long enough.',
			name: 'Name a',
			profileUrl: 'https://example.com/a',
			attribution: 'Lead, Example BV',
		});
		expect(view.project).toBeUndefined();
		expect(JSON.stringify(view)).not.toContain('permission');
		expect(JSON.stringify(view)).not.toContain('2026-11-02');
	});

	// covers: AC-6, AC-9
	it('adds the project title and link only when the project is in the given list', () => {
		const entry = quote('b', 2, 'x');
		expect(testimonialView(entry, [project('x', 'Project X')]).project).toEqual({
			title: 'Project X',
			href: '/projects/x',
		});
		expect(testimonialView(entry, [project('y', 'Project Y')]).project).toBeUndefined();
	});
});
