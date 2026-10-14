import { describe, expect, it } from 'vitest';
import { WORK, type WorkCopy } from './work';

/** The length range each value must fit, after trimming (spec 0005, AC-2). */
const LIMITS: Readonly<Record<keyof WorkCopy, readonly [min: number, max: number]>> = {
	title: [1, 60],
	description: [50, 160],
	heading: [1, 60],
	lead: [1, 160],
	emptyText: [1, 80],
	closingHeading: [1, 40],
	closingText: [1, 120],
};

describe('WORK', () => {
	// covers: AC-2
	it('has a limit for every value, and a value for every limit', () => {
		expect(Object.keys(WORK).sort()).toEqual(Object.keys(LIMITS).sort());
	});

	// covers: AC-2, AC-11
	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, [min, max]) => {
		const value = WORK[key as keyof WorkCopy].trim();

		expect(value.length).toBeGreaterThanOrEqual(min);
		expect(value.length).toBeLessThanOrEqual(max);
	});

	// covers: AC-2
	it('keeps the contact target out of the empty line, since it can change', () => {
		expect(WORK.emptyText).not.toMatch(/linkedin/i);
	});
});
