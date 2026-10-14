import { describe, expect, it } from 'vitest';
import { absoluteUrl, jsonLdText, personGraph, robotsTxt, SHARE, SHARE_IMAGE_OPTIONS } from './seo';
import type { Site } from './site';

const SITE_URL = 'https://toyintest.org';
const sample: Pick<Site, 'name' | 'jobTitle' | 'country' | 'links'> = {
	name: 'Sample Person',
	jobTitle: 'Engineer',
	country: 'NL',
	links: [
		{ label: 'LinkedIn', href: 'https://linkedin.com/in/sample', kind: 'profile' },
		{ label: 'Email', href: 'mailto:someone@example.com', kind: 'email' },
		{ label: 'GitHub', href: 'https://github.com/sample', kind: 'profile' },
	],
};

describe('SHARE and SHARE_IMAGE_OPTIONS', () => {
	// covers: AC-2
	it('has site card alt text of 1 to 160 characters', () => {
		expect(SHARE.siteCardAlt.length).toBeGreaterThanOrEqual(1);
		expect(SHARE.siteCardAlt.length).toBeLessThanOrEqual(160);
	});

	// covers: AC-3
	it('makes a 1200 by 630 centre cropped JPEG on the paper colour', () => {
		expect(SHARE_IMAGE_OPTIONS).toEqual({
			width: 1200,
			height: 630,
			fit: 'cover',
			position: 'center',
			format: 'jpeg',
			quality: 80,
			background: '#FBF8F2',
		});
	});
});

describe('absoluteUrl', () => {
	// covers: AC-4
	it('resolves a path with a leading slash against the site', () => {
		expect(absoluteUrl('/_astro/x.jpg', SITE_URL)).toBe('https://toyintest.org/_astro/x.jpg');
	});

	it('resolves a path without a leading slash the same way', () => {
		expect(absoluteUrl('_astro/x.jpg', new URL(SITE_URL))).toBe(
			'https://toyintest.org/_astro/x.jpg',
		);
	});
});

describe('personGraph', () => {
	const graph = personGraph({
		site: SITE_URL,
		imageUrl: 'https://toyintest.org/_astro/c.jpg',
		info: sample,
	});
	const [person, website] = graph['@graph'];

	// covers: AC-13
	it('holds a Person and a WebSite, and nothing else', () => {
		expect(graph['@graph']).toHaveLength(2);
		expect(person).toEqual({
			'@type': 'Person',
			'@id': 'https://toyintest.org/#person',
			name: 'Sample Person',
			url: 'https://toyintest.org/',
			jobTitle: 'Engineer',
			address: { '@type': 'PostalAddress', addressCountry: 'NL' },
			sameAs: ['https://linkedin.com/in/sample', 'https://github.com/sample'],
			image: 'https://toyintest.org/_astro/c.jpg',
		});
		expect(website).toEqual({
			'@type': 'WebSite',
			'@id': 'https://toyintest.org/#website',
			name: 'Sample Person',
			url: 'https://toyintest.org/',
			author: { '@id': 'https://toyintest.org/#person' },
		});
	});

	// covers: AC-13
	it('never includes an email address', () => {
		expect(JSON.stringify(graph)).not.toMatch(/mailto:|@example\.com/);
	});

	it('defaults to the real SITE', () => {
		const real = personGraph({ site: SITE_URL, imageUrl: 'https://toyintest.org/x.jpg' });

		expect(real['@graph'][0]).toMatchObject({
			name: 'Toyin Ogunseinde',
			jobTitle: 'DevOps and infrastructure engineer',
		});
	});
});

describe('jsonLdText', () => {
	// covers: AC-14
	it('escapes every < so a string cannot close the script tag', () => {
		const text = jsonLdText({ a: '</script><script>x</script>' });

		expect(text).not.toContain('<');
		expect(JSON.parse(text)).toEqual({ a: '</script><script>x</script>' });
	});
});

describe('robotsTxt', () => {
	// covers: AC-11
	it('allows everyone, keeps /api/ out and names the sitemap, ending in one newline', () => {
		expect(robotsTxt('https://example.com')).toBe(
			'User-agent: *\nDisallow: /api/\n\nSitemap: https://example.com/sitemap-index.xml\n',
		);
	});
});
