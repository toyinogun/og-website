import { describe, expect, it } from 'vitest';
import {
	checkProjectRefs,
	collectionTestimonialProblems,
	findContactDetails,
} from './testimonial-checks';

const data = (over: Partial<Record<'quote' | 'name' | 'role' | 'company', string>> = {}) => ({
	quote: 'Toyin rebuilt our cluster as code in three weeks.',
	name: 'Jane Doe',
	role: 'Engineering lead',
	company: 'Example BV',
	...over,
});

describe('findContactDetails', () => {
	// covers: AC-4
	it('returns nothing for clean text, including short numbers and years', () => {
		expect(
			findContactDetails({
				id: 'a',
				data: data({ quote: 'In 2024 we cut 40 hours a week, across 3 teams, 12 clusters.' }),
			}),
		).toEqual([]);
	});

	// covers: AC-4, AC-17
	it('flags an email inside the quote text', () => {
		const problems = findContactDetails({
			id: 'a',
			data: data({ quote: 'Great work, mail me at jane@example.com for more.' }),
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatchObject({ rule: 'contact-details', ids: ['a'] });
		expect(problems[0]?.message).toContain('quote');
	});

	// covers: AC-4, AC-17
	it('flags a phone number written +31 6 12 34 56 78, and other separators', () => {
		for (const phone of ['+31 6 12 34 56 78', '(020) 123-4567', '020.123.4567', '020/1234567']) {
			const problems = findContactDetails({ id: 'a', data: data({ company: `Example ${phone}` }) });
			expect(problems, phone).toHaveLength(1);
			expect(problems[0]?.message).toContain('company');
		}
	});

	// covers: AC-4
	it('returns one problem per offending field', () => {
		const problems = findContactDetails({
			id: 'a',
			data: data({ name: 'Jane a@b.nl', role: '0612345678' }),
		});
		expect(problems.map((p) => p.message.split(' ')[0])).toEqual(['name', 'role']);
	});
});

describe('checkProjectRefs', () => {
	const known = new Set(['alpha', 'beta']);

	// covers: AC-4
	it('passes entries with no project or a known one', () => {
		expect(checkProjectRefs([{ id: 'a' }, { id: 'b', project: 'alpha' }], known)).toEqual([]);
	});

	// covers: AC-3, AC-4
	it('returns an unknown-project problem for an id with no folder', () => {
		const problems = checkProjectRefs([{ id: 'a', project: 'gone' }], known);
		expect(problems).toEqual([expect.objectContaining({ rule: 'unknown-project', ids: ['a'] })]);
		expect(problems[0]?.message).toContain('gone');
	});
});

describe('collectionTestimonialProblems', () => {
	const entry = (id: string, order: number, project?: string) => ({
		id,
		data: { ...data(), order, project },
	});

	// covers: AC-3
	it('is empty for a sound collection and for no entries', () => {
		expect(collectionTestimonialProblems([], new Set())).toEqual([]);
		expect(
			collectionTestimonialProblems(
				[entry('jane-doe', 1, 'alpha'), entry('bo-li', 2)],
				new Set(['alpha']),
			),
		).toEqual([]);
	});

	// covers: AC-3
	it('reports a bad file name, a shared order, an unknown project and contact details', () => {
		const problems = collectionTestimonialProblems(
			[
				entry('Jane_Doe', 1),
				entry('bo-li', 1),
				entry('kim-ng', 2, 'nope'),
				{ id: 'al-ba', data: { ...data({ role: 'a@b.nl' }), order: 3 } },
			],
			new Set(),
		);
		expect(problems.map((p) => p.rule).sort()).toEqual([
			'contact-details',
			'duplicate-order',
			'slug',
			'unknown-project',
		]);
	});
});
