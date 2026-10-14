// Search and share metadata (spec 0007): the share image options, the Person
// data block and the robots.txt text. Pure helpers; `BaseLayout` does the
// image work and the pages hand over what they know.
import type { ImageMetadata } from 'astro';
import { SITE, type Site } from './site';

/** An image to share and the words that describe it. */
export interface ShareImageSource {
	readonly src: ImageMetadata;
	readonly alt: string;
}

/** A JSON-LD `@graph` document. */
export interface JsonLdGraph {
	readonly '@context': 'https://schema.org';
	readonly '@graph': readonly Readonly<Record<string, unknown>>[];
}

/** The words only the share cards need. `siteCardAlt` is held to 1 to 160 characters by `seo.test.ts`. */
export const SHARE = {
	siteCardAlt:
		'Toyin Ogunseinde, DevOps and infrastructure engineer: I build infrastructure that stays up.',
} as const;

/**
 * How every share image is made (AC-3): 1200 by 630 JPEG, centre cropped, with
 * the covers' paper colour behind any transparent pixels. The one place the
 * share image size lives.
 */
export const SHARE_IMAGE_OPTIONS = {
	width: 1200,
	height: 630,
	fit: 'cover',
	position: 'center',
	format: 'jpeg',
	quality: 80,
	background: '#FBF8F2',
} as const;

/** Turns a path such as `/_astro/x.jpg` into an absolute address on `site`. */
export const absoluteUrl = (path: string, site: URL | string): string =>
	new URL(path.startsWith('/') ? path : `/${path}`, site).href;

/** Input for `personGraph`. */
export interface PersonGraphInput {
	readonly site: URL | string;
	readonly imageUrl: string;
	/** Who the data describes; defaults to `SITE`. Tests pass a sample. */
	readonly info?: Pick<Site, 'name' | 'jobTitle' | 'country' | 'links'>;
}

/**
 * The home page's structured data (AC-13): a `Person` and the `WebSite` they
 * wrote. Only `profile` links go in `sameAs`, so no email address can leak.
 */
export const personGraph = ({ site, imageUrl, info = SITE }: PersonGraphInput): JsonLdGraph => {
	const origin = absoluteUrl('/', site);
	const personId = `${origin}#person`;
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Person',
				'@id': personId,
				name: info.name,
				url: origin,
				jobTitle: info.jobTitle,
				address: { '@type': 'PostalAddress', addressCountry: info.country },
				sameAs: info.links.filter((link) => link.kind === 'profile').map((link) => link.href),
				image: imageUrl,
			},
			{
				'@type': 'WebSite',
				'@id': `${origin}#website`,
				name: info.name,
				url: origin,
				author: { '@id': personId },
			},
		],
	};
};

/** `JSON.stringify` with every `<` escaped, so no text can close the script tag (AC-14). */
export const jsonLdText = (data: unknown): string =>
	JSON.stringify(data).replaceAll('<', '\\u003c');

/** The `robots.txt` body (AC-11): everyone welcome, `/api/` kept out, the sitemap named. */
export const robotsTxt = (site: URL | string): string =>
	`User-agent: *\nDisallow: /api/\n\nSitemap: ${absoluteUrl('/sitemap-index.xml', site)}\n`;
