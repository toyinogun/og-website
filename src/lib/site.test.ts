import { describe, expect, it } from 'vitest';
import { copyrightLine, isCurrentPath, LINKEDIN_URL, NAV_HREF_PATTERN, SITE } from './site';

describe('SITE', () => {
	it('names the site owner', () => {
		expect(SITE.name).toBe('Toyin Ogunseinde');
	});

	// covers: AC-13 (spec 0007)
	it('names the job title and the country for the Person data', () => {
		expect(SITE.jobTitle).toBe('DevOps and infrastructure engineer');
		expect(SITE.country).toBe('NL');
	});

	// covers: AC-11
	it('uses only plain path hrefs in the nav', () => {
		for (const item of SITE.nav) {
			expect(item.href).toMatch(NAV_HREF_PATTERN);
		}
	});

	// covers: AC-9 (spec 0005); feature 10; AC-4 (spec 0006)
	it('has Home, then Work at /projects, then About, then Contact, in the nav', () => {
		expect(SITE.nav).toEqual([
			{ label: 'Home', href: '/' },
			{ label: 'Work', href: '/projects' },
			{ label: 'About', href: '/about' },
			{ label: 'Contact', href: '/contact' },
		]);
	});

	// covers: AC-11 (spec 0004)
	it('links out to LinkedIn, then GitHub, both as profiles', () => {
		expect(SITE.links).toEqual([
			{ label: 'LinkedIn', href: 'https://linkedin.com/in/toyin-ogunseinde', kind: 'profile' },
			{ label: 'GitHub', href: 'https://github.com/toyinogun', kind: 'profile' },
		]);
	});

	// covers: AC-4 (spec 0006)
	it('sends the call to action to the contact form', () => {
		expect(SITE.contact).toEqual({ label: 'Send me a message', href: '/contact' });
	});

	// covers: AC-4 (spec 0006)
	it('points the call to action at a page in the nav', () => {
		expect(SITE.nav.map((item) => item.href)).toContain(SITE.contact.href);
	});

	// covers: AC-11 (spec 0004); AC-4 (spec 0006)
	it('uses LINKEDIN_URL for the footer link', () => {
		expect(LINKEDIN_URL).toBe('https://linkedin.com/in/toyin-ogunseinde');
		expect(SITE.links.find((link) => link.label === 'LinkedIn')?.href).toBe(LINKEDIN_URL);
	});

	// covers: AC-3 (spec 0004)
	it('points the call to action at an https address or a plain site path', () => {
		expect(SITE.contact.href).toMatch(/^(https:\/\/|\/)/);
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

	// covers: AC-9 (spec 0005): project pages (feature 9) sit under Work
	it('marks Work current on a project page', () => {
		expect(isCurrentPath('/projects/deployer', '/projects')).toBe(true);
		expect(isCurrentPath('/projects', '/projects')).toBe(true);
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
