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

/**
 * The site's one call to action: what the button says and where it goes.
 * `href` is an `https://` address or a plain site path (spec 0004).
 */
export interface ContactAction {
	readonly label: string;
	readonly href: string;
}

/** The shape of `SITE`. */
export interface Site {
	readonly name: string;
	readonly nav: readonly NavItem[];
	readonly links: readonly OutLink[];
	readonly contact: ContactAction;
}

/** The pattern every `SITE.nav` href matches: a plain path, no query, hash or trailing slash. */
export const NAV_HREF_PATTERN = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;

/** The owner's LinkedIn profile, written once for the footer and the call to action. */
const LINKEDIN_URL = 'https://linkedin.com/in/toyin-ogunseinde';

/**
 * The site's name, header nav, footer links and call to action.
 * Each page feature adds its nav entry when its page ships, so the live site
 * never links to a missing page. `contact` moves to `/contact` when the
 * contact form ships (feature 11).
 */
export const SITE: Site = {
	name: 'Toyin Ogunseinde',
	nav: [
		{ label: 'Home', href: '/' },
		{ label: 'Work', href: '/projects' },
		{ label: 'About', href: '/about' },
	],
	links: [
		{ label: 'LinkedIn', href: LINKEDIN_URL, kind: 'profile' },
		{ label: 'GitHub', href: 'https://github.com/toyinogun', kind: 'profile' },
	],
	contact: { label: 'Message me on LinkedIn', href: LINKEDIN_URL },
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
