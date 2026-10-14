import { describe, expect, it } from 'vitest';
import { testimonialSchema } from './testimonial-schema';

const valid = {
	quote: 'Toyin rebuilt our cluster as code in three weeks.',
	name: 'Jane Doe',
	role: 'Engineering lead',
	company: 'Example BV',
	order: 10,
	permission: { date: '2026-11-02', via: 'email' },
};

const fails = (data: unknown) => !testimonialSchema.safeParse(data).success;

describe('testimonialSchema', () => {
	// covers: AC-2
	it('accepts a minimal and a full entry', () => {
		expect(testimonialSchema.safeParse(valid).success).toBe(true);
		expect(
			testimonialSchema.safeParse({
				...valid,
				profileUrl: 'https://www.example.com/in/janedoe',
				project: 'hetzner-talos-cluster',
			}).success,
		).toBe(true);
	});

	// covers: AC-2
	it('trims text before checking its length', () => {
		const parsed = testimonialSchema.parse({ ...valid, name: '  Jane Doe  ' });
		expect(parsed.name).toBe('Jane Doe');
		expect(fails({ ...valid, name: '   ' })).toBe(true);
		expect(fails({ ...valid, quote: `   ${'x'.repeat(19)}   ` })).toBe(true);
	});

	// covers: AC-2
	it('holds the quote to 20 to 320 characters and the other texts to 60', () => {
		expect(fails({ ...valid, quote: 'x'.repeat(19) })).toBe(true);
		expect(testimonialSchema.safeParse({ ...valid, quote: 'x'.repeat(20) }).success).toBe(true);
		expect(testimonialSchema.safeParse({ ...valid, quote: 'x'.repeat(320) }).success).toBe(true);
		expect(fails({ ...valid, quote: 'x'.repeat(321) })).toBe(true);
		for (const field of ['name', 'role', 'company'] as const) {
			expect(testimonialSchema.safeParse({ ...valid, [field]: 'x'.repeat(60) }).success).toBe(true);
			expect(fails({ ...valid, [field]: 'x'.repeat(61) })).toBe(true);
		}
	});

	// covers: AC-2
	it('rejects an unknown field, at the top and inside permission', () => {
		expect(fails({ ...valid, email: 'a@b.nl' })).toBe(true);
		expect(fails({ ...valid, permission: { ...valid.permission, note: 'x' } })).toBe(true);
	});

	// covers: AC-2
	it('requires profileUrl to be an https URL', () => {
		expect(fails({ ...valid, profileUrl: 'http://example.com/x' })).toBe(true);
		expect(fails({ ...valid, profileUrl: 'https://' })).toBe(true);
		expect(fails({ ...valid, profileUrl: 'example.com' })).toBe(true);
	});

	// covers: AC-2
	it('requires order to be a whole number of 1 or more', () => {
		expect(fails({ ...valid, order: 0 })).toBe(true);
		expect(fails({ ...valid, order: 1.5 })).toBe(true);
		expect(fails({ ...valid, order: '2' })).toBe(true);
	});

	// covers: AC-2
	it('requires permission, a real calendar date and a known channel', () => {
		const without = { ...valid, permission: undefined };
		expect(fails(without)).toBe(true);
		expect(fails({ ...valid, permission: { date: '2026-02-30', via: 'email' } })).toBe(true);
		expect(fails({ ...valid, permission: { date: '2026-2-3', via: 'email' } })).toBe(true);
		expect(fails({ ...valid, permission: { date: new Date('2026-11-02'), via: 'email' } })).toBe(
			true,
		);
		expect(fails({ ...valid, permission: { date: '2026-11-02', via: 'phone' } })).toBe(true);
		expect(
			testimonialSchema.safeParse({
				...valid,
				permission: { date: '2028-02-29', via: 'in-person' },
			}).success,
		).toBe(true);
	});
});
