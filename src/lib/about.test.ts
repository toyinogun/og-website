import { describe, expect, it } from 'vitest';
import { ABOUT, RESUME_PATH, type AboutCopy } from './about';
import { NAV_HREF_PATTERN } from './site';

/** The length range each value must fit, after trimming. */
const LIMITS: Readonly<Record<keyof AboutCopy, readonly [min: number, max: number]>> = {
	title: [1, 60],
	description: [50, 160],
	heading: [1, 60],
	lead: [1, 160],
	resumeLabel: [1, 40],
	linksHeading: [1, 40],
	closingHeading: [1, 40],
	closingText: [1, 120],
};

describe('ABOUT', () => {
	it('has a limit for every value, and a value for every limit', () => {
		expect(Object.keys(ABOUT).sort()).toEqual(Object.keys(LIMITS).sort());
	});

	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, [min, max]) => {
		const value = ABOUT[key as keyof AboutCopy].trim();

		expect(value.length).toBeGreaterThanOrEqual(min);
		expect(value.length).toBeLessThanOrEqual(max);
	});

	it('keeps the contact target out of the closing text, since it can change', () => {
		expect(ABOUT.closingText).not.toMatch(/linkedin/i);
	});

	it('says the download is a PDF', () => {
		expect(ABOUT.resumeLabel).toMatch(/\bPDF\b/);
	});
});

describe('RESUME_PATH', () => {
	it('is a PDF at the site root, with no trailing slash', () => {
		expect(RESUME_PATH).toMatch(/^\/[a-z0-9-]+\.pdf$/);
	});

	it('is not a page address, so the nav rules never mistake it for one', () => {
		expect(RESUME_PATH).not.toMatch(NAV_HREF_PATTERN);
	});
});
