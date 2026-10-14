import { describe, expect, it } from 'vitest';
import { HOME, type HomeCopy } from './home';

/** The length range each value must fit, after trimming (spec 0004, AC-2). */
const LIMITS: Readonly<Record<keyof HomeCopy, readonly [min: number, max: number]>> = {
	title: [1, 60],
	description: [50, 160],
	availability: [1, 50],
	heading: [1, 60],
	lead: [1, 160],
	workHeading: [1, 40],
	testimonialsHeading: [1, 40],
	testimonialsProjectLabel: [1, 20],
	aboutHeading: [1, 40],
	aboutLink: [1, 40],
	closingHeading: [1, 40],
	closingText: [1, 120],
};

describe('HOME', () => {
	// covers: AC-2
	it('has a limit for every value, and a value for every limit', () => {
		expect(Object.keys(HOME).sort()).toEqual(Object.keys(LIMITS).sort());
	});

	// covers: AC-2, AC-12
	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, [min, max]) => {
		const value = HOME[key as keyof HomeCopy].trim();

		expect(value.length).toBeGreaterThanOrEqual(min);
		expect(value.length).toBeLessThanOrEqual(max);
	});
});
