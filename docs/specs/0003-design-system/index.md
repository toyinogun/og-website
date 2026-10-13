# 0003. Design system and UI foundation

**Date**: 2026-10-13
**Status**: Proposed

## Summary

The site gets one quiet editorial look: warm paper and ink colours, one ink blue accent, Source Serif 4 headings over Inter body text at 18px, and generous white space. Light and dark theme are built into the colour tokens themselves, so every component works in both from day one; the site follows the device setting, and a header toggle lets a visitor override it and remembers the choice. This feature builds the tokens, the fonts, the theme, the base layout with header and footer, the layout building blocks, prose styles and buttons, plus a style guide page on the dev server. [`design.md`](../../../design.md) is the reference every later page builds to.

## Requirements

**User stories**:
- As a hiring or client reader, I want the site to look calm, deliberate and easy to read on my phone or laptop, in the theme my device uses, so that the work is what I notice.
- As a reader who prefers the other theme, I want to switch it once and have the site remember, so that I am not fighting it on every page.
- As a keyboard user, I want to skip the header, reach every control and always see where focus is, so that I can use the site without a mouse.
- As the site owner, I want every later page built from the same tokens and components, so that the site stays consistent without me policing it.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `src/styles/global.css` defines every token listed in `design.md` (colour, type, layout tables) with exactly the values listed there. Each colour token holds its light and dark value in one `light-dark()` declaration. A Vitest contract test reads both files and fails on any missing token or value mismatch.
- **AC-2**: No file under `src/components/` or `src/layouts/` contains a raw colour value (hex, `rgb(`, `hsl(`, `oklch(`) or a Tailwind `dark:` class. Checked by the same contract test.
- **AC-3**: In both themes, the contrast pairs listed under *Contrast floor* in `design.md` reach their ratio (4.5 to 1, or 3 to 1 for the focus ring), computed from the token values by a pure function under Vitest.
- **AC-4**: With no remembered choice, a page loads in the device theme: a visitor whose device prefers dark gets the dark tokens, otherwise light. This holds with JavaScript disabled too.
- **AC-5**: A remembered choice (`localStorage` key `theme`, value `light` or `dark`) is applied by an inline script in `<head>` that runs before any stylesheet or body content, so the page never paints in the wrong theme first. Any other stored value is ignored and the device theme applies.
- **AC-6**: The theme toggle in the header flips the theme on click, Enter or Space; updates `aria-pressed` (true when dark); stores the choice; and the choice survives a reload and navigation to another page. If storage is unavailable (it throws), the toggle still flips the current page and no error reaches the console. With JavaScript disabled the toggle is not shown.
- **AC-7**: Body text renders in Inter at 18px and headings and the wordmark in Source Serif 4, both served from the site's own origin. Loading any page makes no request to a third party font host.
- **AC-8**: `BaseLayout` renders, in order: the skip link, the site header, `<main id="main">` holding the page slot, and the site footer. Its existing behaviour (title, optional description, canonical URL, `lang="en"`) is unchanged. The placeholder home page renders inside it without its own `<main>`.
- **AC-9**: Keyboard: the first Tab focuses the "Skip to content" link, which becomes visible and, when activated, moves focus to `<main>`. Tab then reaches the wordmark, each nav link and the theme toggle, in that order. Every focusable element shows the focus ring from `design.md` when focused from the keyboard, in both themes.
- **AC-10**: The header renders one nav link per entry in `SITE.nav` (`src/lib/site.ts`), marks the link matching the current path with `aria-current="page"`, and renders no `<nav>` element when `SITE.nav` is empty. A contract test fails when any `SITE.nav` path has no built page in `dist/`.
- **AC-11**: The footer renders one link per entry in `SITE.links` (label and `https://` or `mailto:` URL, `rel="me"` on profile links) and the line `© <build year> Toyin Ogunseinde`. With an empty `SITE.links` it renders the copyright line alone.
- **AC-12**: At every viewport width from 320px to 1440px no page scrolls sideways. Below 40rem the header shows the wordmark and toggle on one row and the nav on a second row; from 40rem up, one row. Content never exceeds 72rem wide.
- **AC-13**: `Container`, `Section`, `Stack`, `Grid`, `Prose` and `Button` exist with the typed props in *Feature design*, each with a documented `Props` interface, and render the sizes and variants `design.md` lists. `Button` renders `<a href>` when given `href`, otherwise `<button>` with `type="button"` unless another type is passed.
- **AC-14**: `Prose` styles headings, paragraphs, lists, quotes, inline code, code blocks, figures with captions and tables using only tokens, in both themes. Fenced code in Markdown is highlighted with `github-light` in light and `github-dark` in dark, switching with the toggle.
- **AC-15**: Hover and focus colour changes take `--duration-fast`. Navigating between pages cross fades over `--duration-page` where the browser supports view transitions between documents, with the header held still. With `prefers-reduced-motion: reduce`, there is no transition or cross fade.
- **AC-16**: The header wordmark reads "Toyin Ogunseinde" in Source Serif 4 and links to `/`. `public/favicon.svg` is the TO monogram, `public/apple-touch-icon.png` is 180 by 180, the layout links both, and Astro's default `favicon.ico` and its link are gone.
- **AC-17**: `/styleguide` on the dev server shows every colour token, every type size and every component from `design.md`, in whichever theme is active. `npm run build` produces no `/styleguide` page in `dist/`.

## Decision

**Chosen option**: Option 2: Semantic tokens with `light-dark()`, custom components, Tailwind for layout

Colour, type and spacing live as Tailwind 4 `@theme` tokens in `global.css`, each colour holding both theme values through CSS `light-dark()`; a small set of typed Astro components wraps them, fonts come through Astro's built in font support from npm packages, and page transitions use the browser's native view transitions between documents.

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: no persisted data. Two constants and one browser value:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `SITE` | `src/lib/site.ts` | `{ readonly name: string; readonly nav: readonly NavItem[]; readonly links: readonly OutLink[] }` | `name` is `'Toyin Ogunseinde'`. `nav` starts empty; each page feature (7 to 11) adds its own entry when its page ships, so the live site never links to a missing page |
| `NavItem` | `src/lib/site.ts` | `{ readonly label: string; readonly href: \`/${string}\` }` | `href` is a site path; order of the array is the order on screen |
| `OutLink` | `src/lib/site.ts` | `{ readonly label: string; readonly href: string; readonly kind: 'profile' \| 'email' }` | `href` starts with `https://` (profile) or `mailto:` (email). Values come from you (see Value sourcing) |
| Theme choice | browser `localStorage`, key `theme` | `'light' \| 'dark'` | absent means follow the device. Written only by the toggle |

**State transitions**: the page theme.
- On load: stored `light`/`dark` → that theme; anything else → the device theme (`prefers-color-scheme`).
- Toggle: `light` → `dark` → `light`, each press storing the new value.
- Device setting changes while no choice is stored: the page follows it live (pure CSS through `color-scheme: light dark`). Once a choice is stored, device changes are ignored.

**API surface** (pure helpers and component props; no endpoints):

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `resolveTheme` | `(stored: string \| null, prefersDark: boolean) => Theme` | `'light' \| 'dark'` | `src/lib/theme.ts`. The inline head script inlines the same three line logic; a unit test runs the script source against the same cases so the two cannot drift |
| `nextTheme` | `(current: Theme) => Theme` | the other theme | `src/lib/theme.ts` |
| `THEME_STORAGE_KEY` | `'theme'` | constant | `src/lib/theme.ts` |
| `isCurrentPath` | `(pathname: string, href: string) => boolean` | true when equal after trimming one trailing slash, or when `pathname` starts with `href + '/'` (so `/work/x` marks Work) and `href` is not `/` | `src/lib/site.ts` |
| `copyrightLine` | `(name: string, year: number) => string` | `© 2026 Toyin Ogunseinde` | `src/lib/site.ts`; the footer passes the build year |
| `contrastRatio` | `(a: string, b: string) => number` | WCAG relative luminance ratio of two `oklch(L% C H)` strings | `src/lib/color.ts`, with `parseOklch`, used by the contract test only; returns `NaN` for an unparsable value rather than throwing |
| `BaseLayout` | `{ title: string; description?: string }` | document | unchanged props |
| `Container` | `{ width?: 'page' \| 'measure'; as?: 'div' \| 'article' \| 'header' \| 'footer'; class?: string }` | | default `page`, `div` |
| `Section` | `{ heading?: string; headingLevel?: 2 \| 3; id?: string; class?: string }` | `<section>` | with `heading`, renders it and sets `aria-labelledby` |
| `Stack` | `{ gap?: 'sm' \| 'md' \| 'lg' \| 'xl'; as?: 'div' \| 'ul' \| 'ol'; class?: string }` | | default `md` |
| `Grid` | `{ cols?: 1 \| 2 \| 3; gap?: 'md' \| 'lg'; as?: 'div' \| 'ul'; class?: string }` | | default `2`, `md` |
| `Prose` | `{ class?: string }` | `<div>` at measure width | wraps rendered Markdown |
| `Button` | `{ variant?: 'primary' \| 'secondary'; href?: string; type?: 'button' \| 'submit'; class?: string }` | `<a>` or `<button>` | default `primary` |
| `ThemeToggle`, `SiteHeader`, `SiteFooter` | no props | | read `SITE` and `Astro.url` |

`class` passes extra Tailwind classes through for one off layout tweaks; it never carries colour.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Header | wordmark text | `SITE.name` |
| Header | nav labels and paths | `SITE.nav`, filled by each page feature |
| Header | current page marker | `isCurrentPath(Astro.url.pathname, item.href)` |
| Theme script, toggle | stored choice | `localStorage.getItem('theme')`, read inside `try` |
| Theme script | device preference | `matchMedia('(prefers-color-scheme: dark)').matches` |
| Every token | colour, type, layout values | the tables in `design.md`, mirrored in `global.css` (AC-1) |
| Footer | links out | `SITE.links`; the URLs are yours to give (asked at spec approval). Until given, the list is empty and the footer shows the copyright line only |
| Footer | year | `new Date().getFullYear()` read in `SiteFooter.astro` at build time (the edge), passed to `copyrightLine`. A site built in December shows that year until the next build, which is fine for a site rebuilt on every push |
| Fonts | font files | `@fontsource-variable/inter` and `@fontsource-variable/source-serif-4` npm packages, read at build by Astro's `fontProviders.npm()` |
| Code highlighting | colours | Shiki themes `github-light` and `github-dark`, set in `astro.config.mjs` |
| Page title and description | head tags | page props, unchanged from spec 0001 |

**Key invariants**:
- Colour values exist in exactly one place, `global.css`, and match `design.md` (AC-1, AC-2).
- The theme is never applied by a component; only `color-scheme` on `<html>` changes, and the tokens follow.
- Every page renders exactly one `<main>`, provided by `BaseLayout`.
- The production build contains no style guide and no link to a page that does not exist.
- All new code is static: the only JavaScript shipped is the inline theme script and the toggle's small module script.

**Security model**: a public, read only static site; nothing here reads or stores personal data. The one stored value is the theme word in the visitor's own browser. The inline script is static text with no interpolated values. If a Content Security Policy is added later (not in scope), it needs a hash for the inline theme script; noted in Follow-up.

**Configuration required**: no environment variables or credentials. New packages: `@fontsource-variable/inter`, `@fontsource-variable/source-serif-4`, `@tailwindcss/typography` (dependencies).

**Implementation notes** (decided here so the build does not have to):
- **Tokens:** in `global.css`, `:root { color-scheme: light dark; }`, `:root[data-theme='light'] { color-scheme: light; }`, `:root[data-theme='dark'] { color-scheme: dark; }`. Declare raw values once as `--color-*: light-dark(<light>, <dark>)` inside `@theme`, so Tailwind generates `bg-bg`, `text-text`, `text-muted`, `border-line`, `text-accent` and so on. Override the Tailwind `--text-*` scale with the `design.md` sizes and line heights, and add `--text-display`, `--container-page`, `--container-measure`, `--radius-sm`, `--radius-md`. Clear Tailwind's default colour palette (`--color-*: initial;`) so only design tokens exist as colour utilities.
- **Dark variant:** declare `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` for non colour edge cases (an image that needs a different treatment). AC-2 still bans it in components; a page that genuinely needs it records why in a comment.
- **Fonts:** Astro `fonts` config with `provider: fontProviders.npm()`, families `Inter` (`cssVariable: '--font-inter'`) and `Source Serif 4` (`cssVariable: '--font-source-serif'`), weights `400 700` and `600` respectively (variable ranges), Latin subset, normal style only plus Inter italic for emphasis. `<Font cssVariable=… preload />` for both in `BaseLayout`. In `@theme`, `--font-sans: var(--font-inter)` and `--font-serif: var(--font-source-serif)`; `body` uses sans, `h1` to `h4` use serif.
- **Theme script:** an `is:inline` `<script>` placed first in `<head>` after the charset and viewport meta, before `<Font>` and the stylesheet: read storage in `try`, resolve, set `document.documentElement.dataset.theme`. The toggle starts `hidden` and its module script removes `hidden`, wires the click, writes storage in `try`, and updates `aria-pressed`.
- **Prose:** `@plugin "@tailwindcss/typography";` with the `prose` colour variables (`--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-links`, `--tw-prose-code`, `--tw-prose-pre-bg`, and so on) mapped to the tokens, so `prose-invert` is never needed. Headings in serif, max width `--container-measure`.
- **Code blocks:** `markdown.shikiConfig` with `themes: { light: 'github-light', dark: 'github-dark' }` and `defaultColor: 'light-dark()'` so the code colours follow `color-scheme` like everything else. If the installed Shiki rejects that value, use `defaultColor: false` and one CSS rule per theme on `[data-theme]` plus the `prefers-color-scheme` media query, and note it in the commit.
- **View transitions:** `@view-transition { navigation: auto; }` and `::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--duration-page); }`; `SiteHeader` gets `view-transition-name: site-header`. Inside `@media (prefers-reduced-motion: reduce)`, set `@view-transition { navigation: none; }` and transitions to `none`. Do not add Astro's `<ClientRouter />`.
- **Style guide:** an inline integration in `astro.config.mjs` whose `astro:config:setup` hook calls `injectRoute({ pattern: '/styleguide', entrypoint: './src/dev/styleguide.astro' })` only when `command === 'dev'`. The page file lives outside `src/pages/` so the static build never sees it.
- **Icons:** sun and moon as inline SVG copied from Lucide (ISC licence, credited in a comment), `aria-hidden="true"`. No icon package.
- **Favicon:** hand written SVG; render `apple-touch-icon.png` once with a one off `sharp` call (already installed with Astro) and commit the PNG. No new tooling remains in the repository.

**Critical test scenarios**:
- Happy path: on a dark preferring device with JavaScript off, the home page background computes to the dark `--color-bg`; with JavaScript on, pressing the toggle switches to light, reload keeps light, verifies **AC-4**, **AC-5**, **AC-6**
- Failure case: `localStorage` throws on read and write; the page loads in the device theme, the toggle still flips it, no console error, verifies **AC-5**, **AC-6**
- Failure case: a stored value of `blue` is ignored and the device theme applies, verifies **AC-5**
- Keyboard: Tab from page load lands on the visible skip link, Enter moves focus to `main`, further Tabs reach wordmark then toggle, each with a computed outline of 2px, verifies **AC-9**
- Drift: changing one value in `design.md` or `global.css` fails `npm test`, verifies **AC-1**
- Layout: at 320px and 375px, `document.documentElement.scrollWidth` equals the viewport width, verifies **AC-12**
- Build: `dist/` has no `styleguide` output and makes no request to a font host, verifies **AC-7**, **AC-17**
- Auth/permission: not applicable; a public static site with no protected surface.

## Build plan

Skateboard: the first milestone alone gives the live site its whole look (theme, fonts, header, footer, on the existing home page); the next two grow the kit pages need, then the polish and the checking tools.

**Milestone 1: the look, live on every page**
1. Add `@fontsource-variable/inter` and `@fontsource-variable/source-serif-4`; configure Astro `fonts` with the npm provider, satisfies **AC-7**
2. Write the tokens in `global.css` from `design.md` (colour with `light-dark()`, type scale, layout, radius, durations, `color-scheme` rules, focus ring, link style, dark custom variant), satisfies **AC-1**, **AC-4**
3. Create `src/lib/theme.ts` (`resolveTheme`, `nextTheme`, `THEME_STORAGE_KEY`) with `theme.test.ts`, and `src/lib/site.ts` (`SITE` with empty `nav` and `links`, `isCurrentPath`, `copyrightLine`) with `site.test.ts`, satisfies **AC-5**, **AC-10**, **AC-11**
4. Update `BaseLayout.astro`: inline theme script first in head, `<Font>` tags, skip link, `SiteHeader`, `<main id="main">`, `SiteFooter`; extend `BaseLayout.test.ts` for the order and the unchanged head tags, satisfies **AC-5**, **AC-8**
5. Build `SiteHeader.astro` (wordmark, nav from `SITE.nav`, two row layout below `sm`) and `ThemeToggle.astro`, and `SiteFooter.astro`, satisfies **AC-6**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-16**
6. Remove the home page's own `<main>` and opacity styling so it renders through the layout with tokens, satisfies **AC-8**

**Milestone 2: the building blocks for pages**
7. Build `Container`, `Section`, `Stack`, `Grid` and `Button` with documented `Props`, satisfies **AC-13**
8. Add `@tailwindcss/typography`, map its colour variables to tokens, build `Prose`, and set the Shiki dual themes in `astro.config.mjs`, satisfies **AC-14**

**Milestone 3: polish and the checks**
9. Add view transitions, the motion durations and the reduced motion overrides, satisfies **AC-15**
10. Draw `favicon.svg`, render `apple-touch-icon.png`, link both, delete `public/favicon.ico` and its link, satisfies **AC-16**
11. Add the dev only style guide (`src/dev/styleguide.astro` and the injecting integration), satisfies **AC-17**
12. Add `src/lib/color.ts` (`parseOklch`, `contrastRatio`) with tests, and `tests/design-contract.test.ts`: token drift against `design.md`, the raw colour and `dark:` ban, the contrast floor, every `SITE.nav` path built, no `styleguide` in `dist/`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**, **AC-17**
13. Add `e2e/design-system.spec.ts`: device theme with and without JavaScript, toggle and persistence across reload and navigation, broken storage, keyboard order and focus ring, no sideways scroll at 320px, no third party font requests, reduced motion, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-12**, **AC-15**

## Consequences

**Positive**:
- Every later page is assembled from tested parts in both themes, so features 7 to 11 spend their time on content, not on look.
- Theme is close to free for future components: use a token and it works in dark.
- `design.md` and the code cannot drift silently; the contract test fails first.
- No third party requests at all: fonts, icons and code colours are all served from your domain.

**Negative / tradeoffs**:
- `light-dark()` needs a 2024 or newer browser (Chrome 123, Safari 17.5, Firefox 120). Older browsers get the light values only. Acceptable for this audience; noted, not mitigated.
- Two font files (about 100 to 150 KB together, cached after the first visit) is the price of the serif and sans pairing.
- Page cross fades are skipped in browsers without view transitions between documents (Firefox at the time of writing); those visitors just get instant navigation.
- The nav starts empty. Until feature 7 to 11 pages ship, the header shows only the wordmark and the toggle. This is deliberate: a live site linking to missing pages is worse.
- Three new dependencies to keep updated.

**Neutral**:
- Pages stop writing their own `<main>`; `BaseLayout` owns it.
- A new folder, `src/dev/`, holds the dev only style guide; it is outside the folder convention in `AGENTS.md` and `/sync` should record it.

## Follow-up

- [ ] Footer links: you supply the label and URL of each link out (for example GitHub, LinkedIn, email), asked at spec approval. Empty until then.
- [ ] Each page feature (7 home, 8 work, 9 project detail, 10 about, 11 contact) adds its `SITE.nav` entry when its page ships, and its spec says so.
- [ ] Feature 8 designs the project card and tag chip on these tokens; feature 9 renders case studies through `Prose`.
- [ ] If a Content Security Policy is ever added, it needs the hash of the inline theme script.
- [ ] `/sync`: record `design.md` and `src/dev/` in `AGENTS.md` (the folder convention and a pointer to `design.md` as the UI source of truth).

## Rationale

Reasoning, options and references: see [rationale.md](rationale.md).
