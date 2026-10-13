// Light and dark theme helpers (spec 0003). The page follows the device setting
// unless the visitor has pinned a theme with the header toggle; the pin is the
// `data-theme` attribute on <html>, restored from localStorage on load.

/** One of the two themes the colour tokens hold. */
export type Theme = 'light' | 'dark';

/** The localStorage key that holds a remembered theme choice. */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Reads a stored or attribute value as a theme.
 * Returns `null` for anything that is not exactly `light` or `dark`, which
 * means "follow the device".
 */
export const parseStoredTheme = (stored: string | null): Theme | null =>
	stored === 'light' || stored === 'dark' ? stored : null;

/** The theme the visitor sees: the pinned choice if any, else the device setting. */
export const effectiveTheme = (stored: Theme | null, prefersDark: boolean): Theme =>
	stored ?? (prefersDark ? 'dark' : 'light');

/** The other theme, the one a toggle press switches to. */
export const nextTheme = (current: Theme): Theme => (current === 'dark' ? 'light' : 'dark');

/**
 * Source of the inline head script that restores a remembered theme before
 * `<body>` exists, so the first frame is already right. It mirrors
 * `parseStoredTheme` (a unit test runs it against fakes so the two cannot
 * drift) and swallows a read that throws, leaving the device theme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
