# 0003. Design system and UI foundation

**Date**: 2026-10-13
**Status**: Accepted

## Summary

The site gets one quiet editorial look: warm paper and ink colours, one ink blue accent, Source Serif 4 headings over Inter body text at 18px, and generous white space. Light and dark theme are built into the colour tokens themselves, so every component works in both from day one; the site follows the device setting, and a header toggle lets a visitor override it and remembers the choice. This feature builds the tokens, the self hosted fonts, the theme, the base layout with header and footer, the layout building blocks, prose styles, buttons, a 404 page, and a style guide on the dev server. [`design.md`](../../../design.md) is the reference every later page builds to, and a test keeps it and the CSS in step.

## Requirements

**User stories**:
- As a hiring or client reader, I want the site to look calm, deliberate and easy to read on my phone or laptop, in the theme my device uses, so that the work is what I notice.
- As a reader who prefers the other theme, I want to switch it once and have the site remember, so that I am not fighting it on every page.
- As a keyboard user, I want to skip the header, reach every control and always see where focus is, so that I can use the site without a mouse.
- As a visitor who follows a broken link, I want a page in the site's design that takes me home, so that I do not land on a bare error.
- As the site owner, I want every later page built from the same tokens and components, so that the site stays consistent without me policing it.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `src/styles/global.css` defines every token in the three `design.md` token tables with exactly the listed values: colours as one `light-dark()` declaration each and the type and layout tokens inside `@theme static`, the type line heights as `--text-<size>--line-height`, and the two durations in a `:root` block. A Vitest contract test parses the tables by the rules under *Token tables* in `design.md` and fails on a malformed or duplicate row, a missing or extra token, a value mismatch, or a row count that differs from the stated one.
- **AC-2**: No file under `src/components/`, `src/layouts/`, `src/pages/` or `src/dev/` contains a raw colour value (hex, `rgb(`, `hsl(`, `oklch(`), a Tailwind `dark:` class, or an opacity modifier on a text or border colour utility (`text-<token>/`, `border-<token>/`). Shiki's generated code colours and the files in `public/` are exempt. Checked by the same contract test.
- **AC-3**: In both themes, every contrast pair listed under *Contrast floor* in `design.md` reaches its ratio (4.5 to 1, or 3 to 1 for the focus ring), computed by `contrastRatio` from the token values. The test asserts each ratio is a finite number before comparing it.
- **AC-4**: With no valid remembered choice, `<html>` has no `data-theme` attribute and the page shows the device theme: dark tokens when the device prefers dark, otherwise light. If the device setting changes while the page is open, the page follows without a reload. This holds with JavaScript disabled too.
- **AC-5**: With `localStorage` key `theme` set to `light` or `dark`, the inline head script sets `data-theme` to that value before `<body>` is created, so the first frame is already in that theme. Any other stored value, or a read that throws, leaves the attribute absent (AC-4 applies). In the built HTML this script is the first `<script>` in `<head>` and comes before every stylesheet `<link>` and `<style>`.
- **AC-6**: The theme toggle flips the effective theme on click, Enter or Space: it sets `data-theme` on `<html>`, stores the choice, sets `aria-pressed` (true when the effective theme is dark) and shows a moon when dark, a sun when light. The choice survives a reload and navigation to another page. If storing throws, the new theme still applies to the current page and no error reaches the console. While no choice is stored, a device setting change updates `aria-pressed` and the icon. With JavaScript disabled the toggle is not shown.
- **AC-7**: Body text renders in Inter Variable at 18px and headings h1 to h4 and the wordmark in Source Serif 4 Variable. The built site emits exactly the three font faces listed in `design.md`, preloads exactly the two normal faces, and their combined size is at most 300 KB. The build reads the fonts from the local npm packages through Astro's `local` font provider, and loading a page makes no request to any host other than the site's own.
- **AC-8**: `BaseLayout` renders, in order: the skip link, the site header, `<main id="main" tabindex="-1">` holding the page slot, and the site footer. Its existing behaviour (title, optional description, canonical URL, `lang="en"`) is unchanged. The placeholder home page renders inside it without its own `<main>`.
- **AC-9**: From page load, successive Tab presses focus the "Skip to content" link (visible while focused), then the wordmark, then each nav link in order, then the theme toggle.
- **AC-10**: Activating the skip link moves focus to `<main>`; the next Tab focuses the first focusable element inside `<main>`, or the first footer link when `<main>` has none, and never returns to the header. Every focusable element shows the focus ring from `design.md` (a computed 2px solid outline) when focused from the keyboard, in both themes.
- **AC-11**: `SiteHeader` renders one link per item of its `nav` prop in order, marks the item for which `isCurrentPath(Astro.url.pathname, href)` is true with `aria-current="page"`, and renders no `<nav>` element and no second row when `nav` is empty. Every `SITE.nav` href matches `^/([a-z0-9-]+(/[a-z0-9-]+)*)?$` (a plain path, no query, hash or trailing slash). A build test fails when a `SITE.nav` href has no built page (`/` is `dist/index.html`, `/x` is `dist/x/index.html`).
- **AC-12**: `SiteFooter` renders one link per item of its `links` prop (`rel="me"` on `profile` links) and the line `copyrightLine(SITE.name, year)`, where `year` defaults to the build year. With an empty `links` it renders the copyright line alone.
- **AC-13**: At viewport widths 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels, on the home page and the 404 page, `document.documentElement.scrollWidth` equals the viewport width. At 639px the header shows two rows when the nav is not empty; at 640px, one row. No content box exceeds 72rem. Code blocks and tables wider than the column scroll inside their own box.
- **AC-14**: `Container`, `Section`, `Stack`, `Grid` and `Button` have the props and defaults in *Feature design*, each with a documented `Props` interface, and render the sizes, gaps, columns and states in `design.md` (*Space and layout*, *Component values*). `Button` renders `<a href>` when given `href`, otherwise `<button>` with `type="button"` unless `submit` is passed.
- **AC-15**: `Prose` applies the variable mapping and overrides in `design.md` (*Prose*) in both themes. Fenced code in Markdown is highlighted with Shiki `github-light` and `github-dark` through `defaultColor: 'light-dark()'` and switches with the toggle.
- **AC-16**: Hover and focus colour changes take `--duration-fast`. Where the browser supports view transitions between documents, navigating between pages cross fades the root over `--duration-page` while the `site-header` group and its old and new snapshots have no animation. With `prefers-reduced-motion: reduce`, page navigation runs no view transition and no animations. The built CSS contains these rules, and in Chromium `document.getAnimations()` is empty on `pagereveal` under reduced motion.
- **AC-17**: The header wordmark reads "Toyin Ogunseinde" in Source Serif 4 and links to `/`. `public/favicon.svg` is the monogram in `design.md` with its letters as paths (no `<text>` element), `public/apple-touch-icon.png` is 180 by 180, the layout links both, and Astro's default `favicon.ico` and its link are gone.
- **AC-18**: On the dev server, `/styleguide` renders every colour token, every type size, every component with each prop value and variant, and the sample Markdown listed in `design.md`, in the active theme. `npm run build` produces no `styleguide` output in `dist/`.
- **AC-19**: `src/pages/404.astro` renders on `BaseLayout` with the title "Page not found", the heading "This page does not exist", one line of help and a primary `Button` linking to `/`. `wrangler.jsonc` sets `assets.not_found_handling` to `"404-page"`, and requesting an unknown path from the production preview returns status 404 with this page.
- **AC-20**: The site targets WCAG 2.2 level AA. An `@axe-core/playwright` scan with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` reports zero violations on the home page and the 404 page in both themes, and on the home page with the skip link focused. Every link, button and toggle in the header, footer and `Button` has a rendered target of at least 24 by 24 CSS pixels, or the spacing exception in WCAG 2.2 success criterion 2.5.8 applies.

## Decision

**Chosen option**: Option 2: Semantic tokens with `light-dark()`, custom components, Tailwind for layout

Colour, type and spacing live as Tailwind 4 `@theme static` tokens in `global.css`, each colour holding both theme values through CSS `light-dark()`; a small set of typed Astro components wraps them; fonts come from local npm packages through Astro's font support; and page transitions use the browser's native view transitions between documents.

## Feature design

**Data model sketch**: no persisted data. Constants, props and one browser value:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `SITE` | `src/lib/site.ts` | `{ readonly name: string; readonly nav: readonly NavItem[]; readonly links: readonly OutLink[] }` | `name` is `'Toyin Ogunseinde'`. `nav` starts empty; each page feature (7 to 11) adds its own entry when its page ships, so the live site never links to a missing page. `links` starts empty until you supply your profile and email links |
| `NavItem` | `src/lib/site.ts` | `{ readonly label: string; readonly href: \`/${string}\` }` | `href` matches the AC-11 pattern; array order is screen order |
| `OutLink` | `src/lib/site.ts` | `{ readonly label: string; readonly href: string; readonly kind: 'profile' \| 'email' }` | `href` starts with `https://` (profile) or `mailto:` (email) |
| Theme choice | browser `localStorage`, key `theme` | `'light' \| 'dark'` | absent or any other value means follow the device. Written only by the toggle |

**State transitions** (the page theme):
- Load: stored `light` or `dark` → `data-theme` set to it (pinned). Anything else, or a read error → no attribute (following the device).
- Following the device: the effective theme is the live `prefers-color-scheme` value; a device change updates the page (CSS) and the toggle's pressed state and icon (a `change` listener on the media query).
- Toggle press, from either state → pinned to `nextTheme(effective)`, `data-theme` set, choice stored (a storage error is swallowed; the pin lasts for this page).
- Pinned: device changes are ignored.

**API surface** (pure helpers and component props; no endpoints):

| Name | Signature | Returns | Notes |
|---|---|---|---|
| `parseStoredTheme` | `(stored: string \| null) => Theme \| null` | the theme, or `null` for anything not exactly `light` or `dark` | `src/lib/theme.ts` |
| `effectiveTheme` | `(stored: Theme \| null, prefersDark: boolean) => Theme` | stored if present, else from the device | `src/lib/theme.ts` |
| `nextTheme` | `(current: Theme) => Theme` | the other theme | `src/lib/theme.ts` |
| `THEME_STORAGE_KEY` | `'theme'` | constant | `src/lib/theme.ts` |
| `THEME_INIT_SCRIPT` | `string` | the inline head script source | `src/lib/theme.ts`; inlined with `set:html`. It applies `parseStoredTheme` logic inside `try`. A unit test evaluates it against a fake `document` and `localStorage` for stored `light`, `dark`, `blue`, nothing, and a throwing read, so it cannot drift from the helpers |
| `isCurrentPath` | `(pathname: string, href: string) => boolean` | after removing one trailing slash from `pathname` (unless it is `/`): true when equal to `href`, or when `href` is not `/` and `pathname` starts with `href + '/'` | `src/lib/site.ts` |
| `copyrightLine` | `(name: string, year: number) => string` | `© 2026 Toyin Ogunseinde` | `src/lib/site.ts` |
| `parseOklch` | `(value: string) => Readonly<{ l: number; c: number; h: number }> \| null` | parsed values, `l` as a 0 to 1 fraction | `src/lib/color.ts`. Accepts exactly `oklch(<L>% <C> <H>)` with optional extra whitespace: L a number from 0 to 100, C a number of at least 0, H a number from 0 to 360. Anything else returns `null` |
| `contrastRatio` | `(a: string, b: string) => number` | ratio from 1 to 21, or `NaN` if either value fails to parse | `src/lib/color.ts`. OKLCH to OKLab (`a = C cos h`, `b = C sin h`), OKLab to linear sRGB with the standard OKLab matrices, each channel clamped to 0 to 1, luminance `0.2126 R + 0.7152 G + 0.0722 B` on the linear values (no second gamma step), ratio `(lighter + 0.05) / (darker + 0.05)`. Tests: `oklch(100% 0 0)` against `oklch(0% 0 0)` is 21 (within 0.01), a colour against itself is 1, garbage gives `NaN` |
| `BaseLayout` | `{ title: string; description?: string }` | document | unchanged props |
| `SiteHeader` | `{ nav: readonly NavItem[] }` | header | the layout passes `SITE.nav` |
| `SiteFooter` | `{ links: readonly OutLink[]; year?: number }` | footer | the layout passes `SITE.links`; `year` defaults to `new Date().getFullYear()` read in the component at build time (the edge) |
| `ThemeToggle` | none | button | |
| `Container` | `{ width?: 'page' \| 'measure'; as?: 'div' \| 'article' \| 'header' \| 'footer'; class?: string }` | | defaults `page`, `div` |
| `Section` | `{ heading?: string; headingLevel?: 2 \| 3; id?: string; class?: string }` | `<section>` | `headingLevel` defaults to 2. When `heading` is given, `id` is required (a type union enforces it), the heading gets `id="<id>-heading"` and the section `aria-labelledby` it |
| `Stack` | `{ gap?: 'sm' \| 'md' \| 'lg' \| 'xl'; as?: 'div' \| 'ul' \| 'ol'; class?: string }` | | defaults `md`, `div` |
| `Grid` | `{ cols?: 1 \| 2 \| 3; gap?: 'md' \| 'lg'; as?: 'div' \| 'ul'; class?: string }` | | defaults `2`, `md`, `div`. One column on phones, `min(cols, 2)` from `md`, `cols` from `lg` |
| `Prose` | `{ class?: string }` | `<div>` at measure width | wraps rendered Markdown |
| `Button` | `{ variant?: 'primary' \| 'secondary'; href?: string; type?: 'button' \| 'submit'; class?: string }` | `<a>` or `<button>` | default `primary`; no disabled state |

`class` passes extra Tailwind classes through for one off layout tweaks; it never carries colour.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Header | wordmark text | `SITE.name` |
| Header | nav labels and paths | `nav` prop, from `SITE.nav`, filled by each page feature |
| Header | current page marker | `isCurrentPath(Astro.url.pathname, item.href)` |
| Theme script, toggle | stored choice | `parseStoredTheme(localStorage.getItem('theme'))`, read inside `try` |
| Toggle | effective theme, pressed state, icon | `effectiveTheme(parseStoredTheme(document.documentElement.dataset.theme ?? null), matchMedia('(prefers-color-scheme: dark)').matches)`, refreshed on the media query's `change` event while unpinned |
| Every token | colour, type, layout values | the token tables in `design.md`, mirrored in `global.css` (AC-1) |
| Contrast pairs | which pairs and thresholds | *Contrast floor* in `design.md` |
| Footer | links out | `links` prop, from `SITE.links` (empty until you supply them) |
| Footer | year | `year` prop, defaulting to the build year |
| Fonts | font files | the three WOFF2 files in `design.md`, from `@fontsource-variable/inter` and `@fontsource-variable/source-serif-4`, through `fontProviders.local()` |
| Prose | element styles | the *Prose* table and overrides in `design.md` |
| Code highlighting | colours and background | Shiki `github-light` and `github-dark`, `defaultColor: 'light-dark()'`, in `astro.config.mjs` |
| Favicon | colours, geometry, letter shapes | *Brand marks* in `design.md`; glyph outlines taken once from Source Serif 4 at weight 600 |
| Style guide | sample content | written in `src/dev/styleguide.astro` itself, covering the list in `design.md` |
| 404 page | title, heading, help text | fixed copy in AC-19 |
| Page title and description | head tags | page props, unchanged from spec 0001 |

**Key invariants**:
- Colour values exist in exactly one place, `global.css`, and match `design.md` (AC-1, AC-2), apart from the two named exemptions.
- `data-theme` is present only for a valid remembered choice or after a toggle press; no component applies a theme.
- Every page renders exactly one `<main>`, provided by `BaseLayout`.
- The production build contains no style guide, no test fixture, and no link to a page that does not exist.
- The only JavaScript shipped is the inline theme script and the toggle's small module script. The build makes no network requests for fonts.

**Security model**: a public, read only static site; nothing here reads or stores personal data. The one stored value is the theme word in the visitor's own browser. The inline script is a static string constant with no interpolated values. If a Content Security Policy is added later (not in scope), it needs a hash for the inline theme script; noted in Follow-up.

**Configuration required**: no environment variables or credentials. New packages: `@fontsource-variable/inter`, `@fontsource-variable/source-serif-4`, `@tailwindcss/typography` (dependencies). `wrangler.jsonc` gains `assets.not_found_handling: "404-page"` (free, static).

**Implementation notes** (decided here so the build does not have to):
- **Tokens:** in `global.css`, `@theme static { --color-*: initial; --text-*: initial; … }` then the token declarations from `design.md`. Outside it: `:root { color-scheme: light dark; --duration-fast: 150ms; --duration-page: 200ms; }`, `:root[data-theme='light'] { color-scheme: light; }`, `:root[data-theme='dark'] { color-scheme: dark; }`. Fonts: `--font-sans: var(--font-inter)`, `--font-serif: var(--font-source-serif)`, `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Base: `body` sans `--text-base` on `bg` in `text`; `h1` to `h4` serif 600.
- **Dark variant:** declare `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` for future non colour edge cases only. AC-2 bans it in the listed folders.
- **Fonts:** Astro `fonts` config with two families, both `provider: fontProviders.local()`: `Inter Variable` (`cssVariable: '--font-inter'`, fallbacks `['system-ui', 'sans-serif']`, variants normal and italic, weight `'100 900'`) and `Source Serif 4 Variable` (`cssVariable: '--font-source-serif'`, fallbacks `['Georgia', 'serif']`, one normal variant, weight `'200 900'`). Each variant's `src` is the package import path from `design.md`, for example `'@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'`. `display: 'swap'`. In `BaseLayout`, `<Font cssVariable="--font-inter" preload={[{ style: 'normal' }]} />` and `<Font cssVariable="--font-source-serif" preload />`, or the equivalent that preloads only the two normal faces in the installed Astro.
- **Head order:** charset, viewport, then `<script is:inline set:html={THEME_INIT_SCRIPT} />`, then `<Font>` tags, then the rest. The contract is the built HTML (AC-5), checked by a build test; if Astro hoists the stylesheet above the script, move the script or the CSS import until the built order is right.
- **Toggle script:** a module script in `ThemeToggle.astro`: unhide the button, compute the effective theme, set `aria-pressed` and the icon, listen to clicks and to the media query `change` event while unpinned. The pin is the `data-theme` attribute itself (present means pinned), so the script holds no mutable state of its own. Writes go through `try`; on failure the attribute still pins this page.
- **Prose:** `@plugin "@tailwindcss/typography";` with the variables and overrides from `design.md`.
- **Code blocks:** `markdown.shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: 'light-dark()' }`. The cross check confirmed the installed Shiki supports this; no fallback branch.
- **View transitions:** `@view-transition { navigation: auto; }`; `::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--duration-page); }`; `SiteHeader` has `view-transition-name: site-header`; `::view-transition-group(site-header), ::view-transition-old(site-header), ::view-transition-new(site-header) { animation: none; }`. Under `@media (prefers-reduced-motion: reduce)`: `@view-transition { navigation: none; }`, `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }`, and `*, *::before, *::after { transition: none; }`. Do not add Astro's `<ClientRouter />`.
- **Style guide:** an inline integration named `og-website:styleguide` in `astro.config.mjs`; its `astro:config:setup` hook calls `injectRoute({ pattern: '/styleguide', entrypoint: new URL('./src/dev/styleguide.astro', import.meta.url) })` only when `command === 'dev'`. The page file lives outside `src/pages/` so the static build never sees it.
- **Icons:** sun and moon as inline SVG copied from Lucide (ISC licence, credited in a comment), `aria-hidden="true"`. No icon package.
- **Favicon:** outline the TO glyphs once with a one off script (for example `npx` running `fontkit` against the Source Serif 4 variable file at weight 600), paste the paths into the hand written SVG, render the PNG once with `sharp` (already installed with Astro), and commit both files. No new tooling stays in the repository.
- **404 page:** `src/pages/404.astro`, content inside `Container width="measure"` and `Stack`. Its tests go in `tests/not-found-page.test.ts` (pages are tested from `tests/`).
- **Tests and CI:** `npm test` stays source only: Vitest excludes `tests/build/`. A new script `test:build` (`vitest run --config vitest.build.config.ts`) runs `tests/build/*.test.ts` against an existing `dist/`. CI gains two steps after `npm test`: `npm run build`, then `npm run test:build`.

**Critical test scenarios**:
- Happy path: on a dark preferring device with JavaScript off, the home page background computes to the dark `--color-bg`; with JavaScript on, pressing the toggle switches to light, reload keeps light, and navigating to an unknown path (the 404 page) keeps light, verifies **AC-4**, **AC-5**, **AC-6**, **AC-19**
- No flash: an init script records `data-theme` at the moment `<body>` is created; for stored `dark` and stored `light` it already holds that value, verifies **AC-5**
- Live device change: with nothing stored, switching the emulated colour scheme changes the background and the toggle's `aria-pressed` without a reload, verifies **AC-4**, **AC-6**
- Failure cases, each separate: stored `blue` is ignored; a throwing read leaves the device theme; a throwing write still flips the page with no console error, verifies **AC-5**, **AC-6**
- Keyboard: Tab from load reaches skip link, wordmark, then toggle (nav empty); Enter on the skip link focuses `main`; the next Tab lands in main or the footer; each focus shows a 2px outline, verifies **AC-9**, **AC-10**
- Drift: changing one value in `design.md` or `global.css` fails `npm test`, verifies **AC-1**
- Layout: the eight widths on the home and 404 pages show no sideways scroll, verifies **AC-13**
- Build: `dist/` has no `styleguide` output, the head order is right, exactly three font faces totalling at most 300 KB with two preloads, and the CSS holds the view transition rules, verifies **AC-5**, **AC-7**, **AC-16**, **AC-18**
- Accessibility: the axe scan at WCAG 2.2 AA on the home and 404 pages in both themes finds nothing, and every header, footer and button target measures at least 24 by 24 pixels, verifies **AC-20**
- Auth/permission: not applicable; a public static site with no protected surface.

## Build plan

Skateboard: the first milestone alone gives the live site its whole look (theme, fonts, header, footer, a 404 page) on what already exists; the next two grow the kit pages need, then the polish and the checks.

**Milestone 1: the look, live on every page**
1. Add `@fontsource-variable/inter` and `@fontsource-variable/source-serif-4`; configure Astro `fonts` with the local provider and the three faces, satisfies **AC-7**
2. Write the tokens and base styles in `global.css` from `design.md` (colour with `light-dark()`, type scale, layout, durations, `color-scheme` rules, focus ring, links, dark custom variant), satisfies **AC-1**, **AC-4**
3. Create `src/lib/theme.ts` (`parseStoredTheme`, `effectiveTheme`, `nextTheme`, `THEME_STORAGE_KEY`, `THEME_INIT_SCRIPT`) with `theme.test.ts`, and `src/lib/site.ts` (`SITE` with empty `nav` and `links`, `isCurrentPath`, `copyrightLine`) with `site.test.ts` including the nav href pattern, satisfies **AC-4**, **AC-5**, **AC-11**, **AC-12**
4. Update `BaseLayout.astro`: head order, `<Font>` tags, skip link, `SiteHeader`, `<main id="main" tabindex="-1">`, `SiteFooter`; extend `BaseLayout.test.ts` for the order and the unchanged head tags, satisfies **AC-5**, **AC-8**
5. Build `SiteHeader.astro`, `ThemeToggle.astro` and `SiteFooter.astro` per *Component values*, with container tests for empty and filled `nav` and `links`, satisfies **AC-6**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-17**
6. Remove the home page's own `<main>` and opacity styling; add `src/pages/404.astro` with `tests/not-found-page.test.ts`; set `assets.not_found_handling` in `wrangler.jsonc`, satisfies **AC-8**, **AC-19**

**Milestone 2: the building blocks for pages**
7. Build `Container`, `Section`, `Stack`, `Grid` and `Button` with documented `Props` and container tests for every default and variant, satisfies **AC-14**
8. Add `@tailwindcss/typography`, map its variables and overrides, build `Prose`, and set the Shiki dual themes in `astro.config.mjs`, satisfies **AC-15**

**Milestone 3: polish and the checks**
9. Add the view transition and reduced motion rules, satisfies **AC-16**
10. Outline the monogram, write `favicon.svg`, render `apple-touch-icon.png`, link both, delete `public/favicon.ico` and its link, satisfies **AC-17**
11. Add the dev only style guide (`src/dev/styleguide.astro` and the named integration) with a container render test, satisfies **AC-18**
12. Add `src/lib/color.ts` (`parseOklch`, `contrastRatio`) with tests, and `tests/design-contract.test.ts` (token drift, raw colour, `dark:` and opacity bans, contrast floor), satisfies **AC-1**, **AC-2**, **AC-3**
13. Add `vitest.build.config.ts`, the `test:build` script, the two CI steps, and `tests/build/design-build.test.ts` (nav paths built, no style guide, head order, font faces and size, preloads, view transition rules), satisfies **AC-5**, **AC-7**, **AC-11**, **AC-16**, **AC-18**
14. Add `e2e/design-system.spec.ts`: device theme with and without JavaScript, live device change, no flash, toggle and persistence across reload and the 404 page, each storage failure, keyboard order and focus ring, the width sweep, third party requests, reduced motion animations, the 404 status, the WCAG 2.2 AA axe scan in both themes (add `@axe-core/playwright` as a dev dependency) and the 24 pixel target sizes, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-13**, **AC-16**, **AC-19**, **AC-20**

## Consequences

**Positive**:
- Every later page is assembled from tested parts in both themes, so features 7 to 11 spend their time on content, not on look.
- Theme is close to free for future components: use a token and it works in dark.
- `design.md` and the code cannot drift silently; the contract test fails first.
- No third party requests at all, at build or in the browser: fonts, icons and code colours are all served from your domain.
- Mistyped links land on a page in your design instead of a bare error.

**Negative / tradeoffs**:
- Browsers older than 2024 are outside support: they ignore the colour tokens and show default black on white. Readable, not designed.
- Three font files, up to 300 KB together (cached after the first visit), are the price of the serif and sans pairing.
- Page cross fades are skipped in browsers without view transitions between documents (Firefox at the time of writing); those visitors just get instant navigation.
- The nav starts empty. Until the page features ship, the header shows only the wordmark and the toggle. Deliberate: a live site linking to missing pages is worse.
- Three new dependencies to keep updated, and a second Vitest config plus two CI steps (a full build in CI adds about a minute).

**Neutral**:
- Pages stop writing their own `<main>`; `BaseLayout` owns it.
- A new folder, `src/dev/`, holds the dev only style guide; it is outside the folder convention in `AGENTS.md` and `/sync` should record it.
- Tests that need `dist/` now live in `tests/build/` and run with `npm run test:build`.

## Follow-up

- [ ] Footer links: you supply the label and URL of each link out (for example GitHub, LinkedIn, email). Empty until then.
- [ ] Each page feature (7 home, 8 work, 9 project detail, 10 about, 11 contact) adds its `SITE.nav` entry when its page ships, and its spec says so.
- [ ] Feature 8 designs the tag chip on these tokens (the project card moved to feature 7, [spec 0004](../0004-home-page/index.md)); feature 9 renders case studies through `Prose` and decides how figures in Markdown get optimised images.
- [ ] If a Content Security Policy is ever added, it needs the hash of the inline theme script.
- [ ] `/sync`: record `design.md`, `src/dev/` and `npm run test:build` in `AGENTS.md`.

## Rationale

Reasoning, options and references: see [rationale.md](rationale.md).
