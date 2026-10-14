import { describe, expect, it } from 'vitest';
import { NOT_FOUND } from './not-found';

describe('NOT_FOUND', () => {
	// covers: AC-1
	it('keeps every word inside its limit', () => {
		expect(NOT_FOUND.title.length).toBeGreaterThan(0);
		expect(NOT_FOUND.title.length).toBeLessThanOrEqual(60);
		expect(NOT_FOUND.description.length).toBeGreaterThanOrEqual(50);
		expect(NOT_FOUND.description.length).toBeLessThanOrEqual(160);
		expect(NOT_FOUND.heading.length).toBeGreaterThan(0);
		expect(NOT_FOUND.heading.length).toBeLessThanOrEqual(60);
		expect(NOT_FOUND.text.length).toBeGreaterThan(0);
		expect(NOT_FOUND.text.length).toBeLessThanOrEqual(160);
		expect(NOT_FOUND.buttonLabel.length).toBeGreaterThan(0);
		expect(NOT_FOUND.buttonLabel.length).toBeLessThanOrEqual(40);
	});
});
