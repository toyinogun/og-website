import { describe, expect, it } from 'vitest';
import {
	effectiveTheme,
	nextTheme,
	parseStoredTheme,
	THEME_INIT_SCRIPT,
	THEME_STORAGE_KEY,
} from './theme';

describe('parseStoredTheme', () => {
	// covers: AC-5
	it.each(['light', 'dark'] as const)('accepts %s', (value) => {
		expect(parseStoredTheme(value)).toBe(value);
	});

	// covers: AC-5
	it.each([null, '', 'blue', 'Dark', ' light', 'light ', 'system'])(
		'treats %j as no choice',
		(value) => {
			expect(parseStoredTheme(value)).toBeNull();
		},
	);
});

describe('effectiveTheme', () => {
	// covers: AC-4
	it('follows the device when nothing is stored', () => {
		expect(effectiveTheme(null, true)).toBe('dark');
		expect(effectiveTheme(null, false)).toBe('light');
	});

	// covers: AC-5, AC-6
	it('prefers the stored choice over the device', () => {
		expect(effectiveTheme('light', true)).toBe('light');
		expect(effectiveTheme('dark', false)).toBe('dark');
	});
});

describe('nextTheme', () => {
	// covers: AC-6
	it('returns the other theme', () => {
		expect(nextTheme('light')).toBe('dark');
		expect(nextTheme('dark')).toBe('light');
	});
});

describe('THEME_STORAGE_KEY', () => {
	it('is "theme"', () => {
		expect(THEME_STORAGE_KEY).toBe('theme');
	});
});

describe('THEME_INIT_SCRIPT', () => {
	// Runs the script against a fake document and storage, so it cannot drift
	// from parseStoredTheme.
	function run(getItem: (key: string) => string | null) {
		const attributes = new Map<string, string>();
		const document = {
			documentElement: {
				setAttribute: (name: string, value: string) => attributes.set(name, value),
			},
		};
		const keys: string[] = [];
		const localStorage = {
			getItem: (key: string) => {
				keys.push(key);
				return getItem(key);
			},
		};
		new Function('document', 'localStorage', THEME_INIT_SCRIPT)(document, localStorage);
		return { theme: attributes.get('data-theme'), keys };
	}

	// covers: AC-5
	it.each(['light', 'dark'])('sets data-theme for stored %s', (value) => {
		expect(run(() => value).theme).toBe(value);
	});

	// covers: AC-5
	it('reads the theme key', () => {
		expect(run(() => null).keys).toEqual(['theme']);
	});

	// covers: AC-4, AC-5
	it.each([null, 'blue', ''])('leaves the attribute absent for stored %j', (value) => {
		expect(run(() => value).theme).toBeUndefined();
	});

	// covers: AC-5
	it('leaves the attribute absent and does not throw when the read throws', () => {
		const result = run(() => {
			throw new Error('SecurityError');
		});

		expect(result.theme).toBeUndefined();
	});

	it('agrees with parseStoredTheme for every case', () => {
		for (const value of ['light', 'dark', 'blue', '', null]) {
			expect(run(() => value).theme ?? null).toBe(parseStoredTheme(value));
		}
	});
});
