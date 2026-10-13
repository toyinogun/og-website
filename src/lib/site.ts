// Site wide constants and the small helpers the header and footer use
// (spec 0003, Feature design).

/** One header nav entry. `href` is a plain site path such as `/work`. */
export interface NavItem {
	readonly label: string;
	readonly href: `/${string}`;
}

/** One footer link out: a profile (`https://`) or an email (`mailto:`). */
export interface OutLink {
	readonly label: string;
	readonly href: string;
	readonly kind: 'profile' | 'email';
}

/** The shape of `SITE`. */
export interface Site {
	readonly name: string;
	readonly nav: readonly NavItem[];
	readonly links: readonly OutLink[];
}

/** The pattern every `SITE.nav` href matches: a plain path, no query, hash or trailing slash. */
export const NAV_HREF_PATTERN = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;

/**
 * The site's name, header nav and footer links.
 * `nav` starts empty: each page feature adds its entry when its page ships,
 * so the live site never links to a missing page. `links` stays empty until
 * the owner supplies profile and email links.
 */
export const SITE: Site = {
	name: 'Toyin Ogunseinde',
	nav: [],
	links: [],
};

/**
 * Whether a nav `href` is the current page (or a section the page sits in).
 * One trailing slash is ignored on `pathname`; `/` only matches itself.
 */
export const isCurrentPath = (pathname: string, href: string): boolean => {
	const path = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
	return path === href || (href !== '/' && path.startsWith(`${href}/`));
};

/** The footer copyright line, for example `© 2026 Toyin Ogunseinde`. */
export const copyrightLine = (name: string, year: number): string => `© ${year} ${name}`;
