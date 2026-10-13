import { describe, expect, it } from 'vitest';
import {
	KINDS,
	LINK_KINDS,
	SERVICES,
	STACK,
	kindLabel,
	linkKindLabel,
	serviceLabel,
	stackLabel,
	vocabularyKeys,
} from './vocabulary';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('vocabulary maps (spec 0002)', () => {
	// covers: AC-9
	it('fixes the kinds', () => {
		expect(KINDS).toEqual({
			client: 'Client work',
			employer: 'Employer work',
			personal: 'Personal project',
			'open-source': 'Open source',
		});
	});

	// covers: AC-9
	it('fixes the link kinds', () => {
		expect(LINK_KINDS).toEqual({
			live: 'Live site',
			code: 'Code',
			'app-store': 'App Store',
			video: 'Video',
			article: 'Article',
		});
	});

	// covers: AC-9
	it.each([
		['STACK', STACK],
		['SERVICES', SERVICES],
		['KINDS', KINDS],
		['LINK_KINDS', LINK_KINDS],
	])('%s has at least one key, every key kebab case, every name non empty', (_, map) => {
		const entries = Object.entries(map);

		expect(entries.length).toBeGreaterThan(0);
		entries.forEach(([key, name]) => {
			expect(key).toMatch(KEBAB);
			expect(name.trim()).not.toBe('');
		});
	});
});

describe('vocabularyKeys', () => {
	it('returns the keys of a map in order', () => {
		expect(vocabularyKeys(KINDS)).toEqual(['client', 'employer', 'personal', 'open-source']);
	});
});

describe('label helpers', () => {
	// covers: AC-9
	it('return the display name for each list', () => {
		expect(stackLabel('typescript')).toBe('TypeScript');
		expect(serviceLabel('api-design')).toBe('API design');
		expect(kindLabel('open-source')).toBe('Open source');
		expect(linkKindLabel('app-store')).toBe('App Store');
	});
});
