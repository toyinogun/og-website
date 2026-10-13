# Design system

The visual language of toyintest.org. Decided in [spec 0003](docs/specs/0003-design-system/index.md); this file is the reference you build to. When a page needs something this file does not cover, add it here first (through `/architect`), then build it.

**Feel:** quiet editorial. Type leads, white space does the arranging, one accent colour is used sparingly. The work and the write ups carry the page; the design stays out of their way.

## Rules every component follows

1. **Colour comes only from the tokens below.** No raw hex, `rgb()`, `hsl()` or `oklch()` values outside `src/styles/global.css`. Two exemptions: the code colours Shiki generates for code blocks, and fixed brand files in `public/` (the favicons).
2. **Theme lives in the tokens, not in components.** Each colour token holds both its light and its dark value through CSS `light-dark()`. Components never use the Tailwind `dark:` variant for colour, so a new component works in both themes the moment it uses a token.
3. **Opacity modifiers** (`bg-accent/10` and similar) are allowed only on decorative surfaces, never on text, borders of controls or anything a reader must see.
4. **Every interactive element is reachable by keyboard and shows the focus ring** when focused from the keyboard. Never remove an outline without replacing it.
5. **Motion is optional.** Everything still works, and nothing moves, when the visitor's device asks for reduced motion.
6. **No accessibility standard is committed** (your decision, recorded in the scope). The contrast floor below is a design quality rule, not a compliance claim.
7. **Browser support:** browsers from 2024 on (Chrome 123, Safari 17.5, Firefox 120 and newer), because the tokens rely on `light-dark()`. Older browsers ignore the colour tokens and show their own default colours (black text on white), which stays readable. No fallback is built.

## Token tables

The design contract test reads the three tables marked `token-table` below. Each table sits between a `<!-- token-table:<name>:start -->` and a `<!-- token-table:<name>:end -->` marker. In every row, the first cell is the token name in a code span and each value cell holds exactly one code span; anything outside code spans is commentary the test ignores. The test fails on a malformed row, a duplicate token, a missing token, a value that differs from `global.css`, or a row count other than the one stated above the table.

## Colour

Two warm neutrals (paper and ink) and one ink blue accent. Values are OKLCH (a colour format where the first number is perceived lightness, so the light and dark values are easy to compare).

Rows: 8.

<!-- token-table:colour:start -->
| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `oklch(98.5% 0.006 85)` | `oklch(17% 0.006 65)` | page background (warm paper, warm near black) |
| `--color-surface` | `oklch(96.5% 0.008 85)` | `oklch(21% 0.007 65)` | quiet raised areas: inline code, the skip link, callouts |
| `--color-text` | `oklch(23% 0.012 65)` | `oklch(93% 0.01 85)` | body text and headings |
| `--color-muted` | `oklch(47% 0.012 65)` | `oklch(72% 0.01 80)` | secondary text: dates, captions, nav links at rest, footer, quotes |
| `--color-line` | `oklch(89% 0.01 80)` | `oklch(32% 0.008 65)` | hairline borders and dividers |
| `--color-accent` | `oklch(46% 0.13 258)` | `oklch(76% 0.1 255)` | links, the focus ring, primary buttons |
| `--color-accent-strong` | `oklch(39% 0.13 258)` | `oklch(84% 0.08 255)` | hover and pressed state of the accent |
| `--color-on-accent` | `oklch(98.5% 0.006 85)` | `oklch(17% 0.006 65)` | text on an accent background |
<!-- token-table:colour:end -->

In `global.css` each row becomes one declaration inside `@theme static`, for example `--color-bg: light-dark(oklch(98.5% 0.006 85), oklch(17% 0.006 65));`.

**Contrast floor** (checked by a test, both themes): `--color-text`, `--color-muted` and `--color-accent` on `--color-bg` and on `--color-surface` reach at least 4.5 to 1; `--color-on-accent` on `--color-accent` and on `--color-accent-strong` reaches at least 4.5 to 1; `--color-accent` (the focus ring) on `--color-bg` reaches at least 3 to 1.

The accent appears in at most three places on any screen: links, the focus ring and one primary button. Everything else is paper, ink and muted ink.

## Theme

- **First visit:** the site follows the device setting (light or dark), live: if the device switches while the page is open, the page follows.
- **Toggle:** one button in the header flips between light and dark. The choice is remembered on this device (`localStorage` key `theme`, value `light` or `dark`) and wins over the device setting from then on. Clearing site data returns to the device setting.
- **Effective theme** (what the visitor sees) is the remembered choice if there is a valid one, else the device setting.
- **Mechanism:** `:root` sets `color-scheme: light dark`, so with no attribute the tokens follow the device. `data-theme="light"` or `data-theme="dark"` on `<html>` pins `color-scheme` to one value. The attribute is set **only** for a valid remembered choice or after a toggle press; otherwise it is absent.
- **No flash:** a tiny inline script, the first script in `<head>` and before any stylesheet, applies a valid remembered choice before the body exists.
- **Storage failures:** if reading fails, the page follows the device. If saving fails, the pressed choice holds for the current page only.
- **Without JavaScript:** the site still follows the device setting (pure CSS) and the toggle stays hidden because it could not work.

## Type

| Role | Font | Notes |
|---|---|---|
| Headings h1 to h4, the wordmark | Source Serif 4 Variable | weight 600; `-0.01em` letter spacing at `2xl` and above |
| Body, UI, buttons, nav, h5, h6 | Inter Variable | weight 400 body, 600 for `strong`, buttons, h5, h6 and the current nav item; italic for `em` |
| Code | the system monospace stack | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` at `0.9em`; no third font file |

**Font files:** both fonts are self hosted from the site's own domain through Astro's `fonts` config with the **local** provider, reading the Latin WOFF2 files inside the `@fontsource-variable/inter` and `@fontsource-variable/source-serif-4` npm packages. The build never fetches fonts over the network. Exactly three faces ship:

| Face | File (inside the package) | Weight range | Preloaded |
|---|---|---|---|
| Inter Variable, normal | `files/inter-latin-wght-normal.woff2` | `100 900` | yes |
| Inter Variable, italic | `files/inter-latin-wght-italic.woff2` | `100 900` | no |
| Source Serif 4 Variable, normal | `files/source-serif-4-latin-wght-normal.woff2` | `200 900` | yes |

Fallbacks: Inter falls back to `system-ui, sans-serif`, Source Serif 4 to `Georgia, serif`, with Astro's size adjusted fallback faces so the layout does not jump. `font-display: swap`. A build test lists the emitted faces and fails if their combined size exceeds 300 KB.

Rows: 7.

<!-- token-table:type:start -->
| Token | Size | Line height | Used for |
|---|---|---|---|
| `--text-sm` | `0.9375rem` | `1.5` | captions, dates, footer, tags (15px) |
| `--text-base` | `1.125rem` | `1.65` | body text, h5, h6 (18px, about 65 characters per line in the reading column) |
| `--text-lg` | `1.25rem` | `1.6` | lead paragraphs, the wordmark, h4 (20px) |
| `--text-xl` | `1.5rem` | `1.35` | h3 (24px) |
| `--text-2xl` | `1.875rem` | `1.25` | h2 (30px) |
| `--text-3xl` | `2.5rem` | `1.15` | h1 on inner pages (40px) |
| `--text-display` | `clamp(2.5rem, 1.75rem + 3vw, 4rem)` | `1.05` | the one hero heading on the home page |
<!-- token-table:type:end -->

In `global.css` each row becomes `--text-<size>` and `--text-<size>--line-height` inside `@theme static`, after `--text-*: initial;` clears Tailwind's stock sizes. There is no size below `--text-sm`.

## Space and layout

Spacing uses Tailwind's default 0.25rem step (`p-4` is 1rem). The layout primitives pin the few sizes pages actually need, so pages do not invent their own.

Rows: 6.

<!-- token-table:layout:start -->
| Token | Value | Used for |
|---|---|---|
| `--container-page` | `72rem` | widest box on any page, gutters included |
| `--container-measure` | `42rem` | the reading column (prose, case studies, About), gutters included |
| `--radius-sm` | `0.375rem` | buttons, the focus ring, inline code |
| `--radius-md` | `0.75rem` | images and cards |
| `--duration-fast` | `150ms` | hover and focus colour changes |
| `--duration-page` | `200ms` | the cross fade between pages |
<!-- token-table:layout:end -->

The containers and radii live in `@theme static`. The two durations live in a plain `:root` block and are used through `var()` (Tailwind does not turn them into utilities).

- **Page gutter:** `1.25rem` each side on phones, `2rem` from `md` (48rem) up, applied inside the container's max width (border box).
- **Section rhythm:** `4rem` above and below a section on phones, `6rem` from `md` up.
- **Stack gaps:** `sm` 0.75rem · `md` 1.5rem · `lg` 3rem · `xl` 5rem. **Grid gaps:** `md` 1.5rem · `lg` 3rem.
- **Breakpoints:** Tailwind defaults (`sm` 40rem, `md` 48rem, `lg` 64rem). Pages are designed phone first and must not scroll sideways at any width from 320px up; only code blocks and tables may scroll sideways, inside their own box.
- **Borders and depth:** 1px `--color-line` hairlines only. No shadows.

## Motion

- Links, buttons and nav items change colour or underline over `--duration-fast`.
- Moving between pages cross fades over `--duration-page`, using the browser's own view transitions between documents (`@view-transition { navigation: auto; }`). The header has its own transition name (`site-header`) with animation switched off on its group and on its old and new snapshots, so it swaps instantly and stays still while the content fades. Browsers without support just navigate normally.
- With reduced motion requested, page transitions are switched off (`navigation: none`) and every transition and view transition animation is set to none.

## Components

Built by feature 4. Pages in Release 1 add their own (the project card and tag chip belong to the work listing, feature 8).

| Component | File | What it is |
|---|---|---|
| Base layout | `src/layouts/BaseLayout.astro` | the document: theme script, fonts, skip link, header, `<main id="main" tabindex="-1">`, footer. Pages put their content straight into its slot and never add their own `<main>` |
| Skip link | inside the base layout | "Skip to content", the first thing Tab reaches; hidden until focused, then shown top left on `--color-surface` |
| Site header | `src/components/SiteHeader.astro` | wordmark, nav, theme toggle. Takes `nav` (the layout passes `SITE.nav`) |
| Theme toggle | `src/components/ThemeToggle.astro` | a 2.5rem square icon button, accessible name "Dark theme", `aria-pressed` true when the effective theme is dark; shows a moon when dark, a sun when light (inline SVG) |
| Site footer | `src/components/SiteFooter.astro` | links out and a copyright line. Takes `links` (the layout passes `SITE.links`) and an optional `year` |
| Container | `src/components/Container.astro` | centres content at `page` or `measure` width with the page gutter. Never nested |
| Section | `src/components/Section.astro` | a `<section>` with the section rhythm and an optional heading |
| Stack | `src/components/Stack.astro` | vertical spacing between children at one of the four gaps |
| Grid | `src/components/Grid.astro` | up to 3 columns: one on phones, `min(cols, 2)` from `md`, `cols` from `lg` |
| Prose | `src/components/Prose.astro` | styles rendered Markdown in the reading column |
| Button | `src/components/Button.astro` | `primary` or `secondary`; `<a>` when given `href`, otherwise `<button>` |
| 404 page | `src/pages/404.astro` | "This page does not exist", one line of help, a primary Button home |

### Component values

| Part | Values |
|---|---|
| Button, both variants | min height `2.75rem`, inline padding `1.125rem`, `--text-base` Inter 600, `--radius-sm`, 1px border, colour change over `--duration-fast` |
| Button, primary | rest: background `accent`, text `on-accent`, border `accent`. Hover and active: background and border `accent-strong` |
| Button, secondary | rest: transparent background, text `text`, border `line`. Hover: border and text `accent`. Active: border and text `accent-strong` |
| Header | `1.25rem` padding top and bottom, hairline below. From `sm` up: one row, wordmark left, nav and toggle right, `1.5rem` apart. Below `sm`: wordmark and toggle on row one, nav on row two (no second row when the nav is empty). Nav links `1.25rem` apart across, `0.5rem` between wrapped lines; links wrap, never hide. The wordmark may wrap onto two lines |
| Nav link | `--text-base` Inter, `muted`, no underline. Hover: `text`. Current page: `text`, weight 600, 2px `accent` underline, `aria-current="page"` |
| Footer | `2.5rem` padding top and bottom, hairline above, `--text-sm` `muted`. Links on one wrapping line `1rem` apart, copyright line below with `0.75rem` between |
| Link (in text) | `accent`, underline at 1px with `0.2em` offset; hover `accent-strong` with a 2px underline |
| Focus ring | `outline: 2px solid var(--color-accent); outline-offset: 3px;` on `:focus-visible`, everywhere |
| Skip link | `--color-surface` background, `text` colour, `0.75rem 1rem` padding, `--radius-sm`, fixed `1rem` from the top left while focused |

### Prose

Built on `@tailwindcss/typography`, with its colour variables mapped so `prose-invert` is never needed:

| Variable | Token |
|---|---|
| `--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-bold`, `--tw-prose-code`, `--tw-prose-kbd` | `text` |
| `--tw-prose-lead`, `--tw-prose-counters`, `--tw-prose-bullets`, `--tw-prose-quotes`, `--tw-prose-captions` | `muted` |
| `--tw-prose-links` | `accent` |
| `--tw-prose-hr`, `--tw-prose-quote-borders`, `--tw-prose-th-borders`, `--tw-prose-td-borders`, `--tw-prose-kbd-shadows` | `line` |
| `--tw-prose-pre-code`, `--tw-prose-pre-bg` | not set: Shiki owns code block colours and background |

Overrides of the plugin defaults:
- Sizes: body `--text-base`, h1 `--text-3xl`, h2 `--text-2xl`, h3 `--text-xl`, h4 `--text-lg` (all serif 600), h5 and h6 `--text-base` Inter 600. Heading margins keep the plugin's proportions.
- Quotes: 2px `line` left border, `muted` text, not italic, no added quotation marks.
- Inline code: `surface` background, `--radius-sm`, `0.1em 0.35em` padding, `0.9em` monospace, no added backticks.
- Code blocks: Shiki `github-light` and `github-dark` with `defaultColor: 'light-dark()'`, `--radius-md`, scroll sideways inside their own box.
- Tables: `display: block; overflow-x: auto;` so a wide table scrolls inside its own box; `line` borders.
- Images: `max-width: 100%`, `height: auto`, `--radius-md`. Figures are written as HTML inside the Markdown (`<figure>` with `<figcaption>`); captions `--text-sm` `muted`.
- Long words and URLs wrap (`overflow-wrap: break-word`).

## Brand marks

- **Wordmark:** "Toyin Ogunseinde" in Source Serif 4, weight 600, `--text-lg`. No logo file.
- **Favicon:** `public/favicon.svg`, a 64 by 64 view box holding a rounded square (corner radius 14) filled `#24569f` (the light theme accent) with the letters TO in `#fcfaf6` (the light paper). The letters are Source Serif 4 at weight 600, **outlined into paths** so the icon looks the same everywhere without the font. Source Serif 4 is under the SIL Open Font License, credited in a comment in the SVG. `public/apple-touch-icon.png` (180 by 180) is rendered from that SVG. Astro's default `favicon.ico` is removed. These fixed colours are one of the two exemptions in rule 1.

## Style guide

`/styleguide` shows every token and every component (all props and variants), plus a sample Markdown block covering every Prose element (h2 to h6, lists, a quote, inline code, a code block, a table, a figure, a long URL), in the active theme, switched with the header toggle. It exists on the local dev server only and is never in the production build.
