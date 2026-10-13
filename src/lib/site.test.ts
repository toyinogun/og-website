import { describe, expect, it } from 'vitest';
import { copyrightLine, isCurrentPath, NAV_HREF_PATTERN, SITE } from './site';

describe('SITE', () => {
	it('names the site owner', () => {
		expect(SITE.name).toBe('Toyin Ogunseinde');
	});

	// covers: AC-11
	it('uses only plain path hrefs in the nav', () => {
		for (const item of SITE.nav) {
			expect(item.href).toMatch(NAV_HREF_PATTERN);
		}
	});

	it('uses https profile links and mailto email links in the footer', () => {
		for (const link of SITE.links) {
			expect(link.href).toMatch(link.kind === 'profile' ? /^https:\/\// : /^mailto:/);
		}
	});
});

describe('NAV_HREF_PATTERN', () => {
	// covers: AC-11
	it.each(['/', '/work', '/work/some-project', '/about-me', '/a1'])('accepts %s', (href) => {
		expect(href).toMatch(NAV_HREF_PATTERN);
	});

	// covers: AC-11
	it.each(['', 'work', '/work/', '/work?x=1', '/work#top', '/Work', '//work', 'https://x.org/'])(
		'rejects %j',
		(href) => {
			expect(href).not.toMatch(NAV_HREF_PATTERN);
		},
	);
});

describe('isCurrentPath', () => {
	// covers: AC-11
	it('matches the same path, with or without one trailing slash', () => {
		expect(isCurrentPath('/work', '/work')).toBe(true);
		expect(isCurrentPath('/work/', '/work')).toBe(true);
	});

	// covers: AC-11
	it('matches pages inside a section', () => {
		expect(isCurrentPath('/work/some-project', '/work')).toBe(true);
		expect(isCurrentPath('/work/some-project/', '/work')).toBe(true);
	});

	// covers: AC-11
	it('does not match a path that only shares a prefix', () => {
		expect(isCurrentPath('/workshop', '/work')).toBe(false);
	});

	// covers: AC-11
	it('matches home only on the home page', () => {
		expect(isCurrentPath('/', '/')).toBe(true);
		expect(isCurrentPath('/work', '/')).toBe(false);
	});

	it('does not match unrelated paths', () => {
		expect(isCurrentPath('/about', '/work')).toBe(false);
	});
});

describe('copyrightLine', () => {
	// covers: AC-12
	it('formats the year and name', () => {
		expect(copyrightLine('Toyin Ogunseinde', 2026)).toBe('© 2026 Toyin Ogunseinde');
	});
});
