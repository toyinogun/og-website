import { describe, expect, it } from 'vitest';
import { contrastRatio, parseOklch } from './color';

describe('parseOklch', () => {
	// covers: AC-3
	it('parses the token format, L as a fraction', () => {
		expect(parseOklch('oklch(46% 0.13 258)')).toEqual({ l: 0.46, c: 0.13, h: 258 });
	});

	it('accepts extra whitespace and the range ends', () => {
		expect(parseOklch('  oklch(  0%   0  0 )  ')).toEqual({ l: 0, c: 0, h: 0 });
		expect(parseOklch('oklch(100% .4 360)')).toEqual({ l: 1, c: 0.4, h: 360 });
	});

	// covers: AC-3
	it.each([
		'',
		'oklch(46 0.13 258)',
		'oklch(46% 0.13)',
		'oklch(46%, 0.13, 258)',
		'oklch(101% 0.1 10)',
		'oklch(50% 0.1 361)',
		'oklch(-1% 0.1 10)',
		'oklch(50% -0.1 10)',
		'oklch(50% 0.1 10 / 50%)',
		'OKLCH(50% 0.1 10)',
		'#24569f',
		'light-dark(oklch(98.5% 0.006 85), oklch(17% 0.006 65))',
	])('rejects %j', (value) => {
		expect(parseOklch(value)).toBeNull();
	});
});

describe('contrastRatio', () => {
	// covers: AC-3
	it('gives 21 for white on black', () => {
		expect(contrastRatio('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBeCloseTo(21, 2);
	});

	// covers: AC-3
	it('gives 1 for a colour against itself', () => {
		expect(contrastRatio('oklch(46% 0.13 258)', 'oklch(46% 0.13 258)')).toBe(1);
	});

	it('is symmetric', () => {
		const a = 'oklch(23% 0.012 65)';
		const b = 'oklch(98.5% 0.006 85)';

		expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
	});

	// covers: AC-3
	it('gives NaN when either value fails to parse', () => {
		expect(contrastRatio('garbage', 'oklch(0% 0 0)')).toBeNaN();
		expect(contrastRatio('oklch(0% 0 0)', 'rgb(0 0 0)')).toBeNaN();
	});

	it('matches a known sRGB pair: #777777 on white is about 4.48', () => {
		// #777777 is oklch(56.87% 0 0): linear luminance 0.184, so 1.05 / 0.234.
		expect(contrastRatio('oklch(56.87% 0 0)', 'oklch(100% 0 0)')).toBeCloseTo(4.48, 1);
	});
});
