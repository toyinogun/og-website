# Design system

The visual language of toyintest.org. Decided in [spec 0003](docs/specs/0003-design-system/index.md); this file is the reference you build to. When a page needs something this file does not cover, add it here first (through `/architect`), then build it.

**Feel:** quiet editorial. Type leads, white space does the arranging, one accent colour is used sparingly. The work and the write ups carry the page; the design stays out of their way.

## Rules every component follows

1. **Colour comes only from the tokens below.** No raw hex, `rgb()` or `oklch()` values outside `src/styles/global.css`.
2. **Theme lives in the tokens, not in components.** Each colour token holds both its light and its dark value through CSS `light-dark()`. Components never use the Tailwind `dark:` variant for colour, so a new component works in both themes the moment it uses a token.
3. **Every interactive element is reachable by keyboard and shows the focus ring** when focused from the keyboard. Never remove an outline without replacing it.
4. **Motion is optional.** Everything still works, and nothing moves, when the visitor's device asks for reduced motion.
5. **No accessibility standard is committed** (your decision, recorded in the scope). The contrast floor below is a design quality rule, not a compliance claim.

## Colour

Two warm neutrals (paper and ink) and one ink blue accent. Values are OKLCH (a colour format where the first number is perceived lightness, so the light and dark values are easy to compare).

<!-- token-table: colour. The design contract test reads this table; keep one token per row, values exactly as in global.css. -->
| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `oklch(98.5% 0.006 85)` | `oklch(17% 0.006 65)` | page background (warm paper, warm near black) |
| `--color-surface` | `oklch(96.5% 0.008 85)` | `oklch(21% 0.007 65)` | quiet raised areas: code blocks, the skip link, callouts |
| `--color-text` | `oklch(23% 0.012 65)` | `oklch(93% 0.01 85)` | body text and headings |
| `--color-muted` | `oklch(47% 0.012 65)` | `oklch(72% 0.01 80)` | secondary text: dates, captions, nav links at rest, footer |
| `--color-line` | `oklch(89% 0.01 80)` | `oklch(32% 0.008 65)` | hairline borders and dividers |
| `--color-accent` | `oklch(46% 0.13 258)` | `oklch(76% 0.1 255)` | links, the focus ring, primary buttons |
| `--color-accent-strong` | `oklch(39% 0.13 258)` | `oklch(84% 0.08 255)` | hover and pressed state of the accent |
| `--color-on-accent` | `oklch(98.5% 0.006 85)` | `oklch(17% 0.006 65)` | text on an accent background |

**Contrast floor** (checked by a test, both themes): `--color-text`, `--color-muted` and `--color-accent` on `--color-bg` and on `--color-surface` reach at least 4.5 to 1; `--color-on-accent` on `--color-accent` and on `--color-accent-strong` reaches at least 4.5 to 1; `--color-accent` (the focus ring) on `--color-bg` reaches at least 3 to 1.

The accent appears in at most three places on any screen: links, the focus ring and one primary button. Everything else is paper, ink and muted ink.

## Theme

- **First visit:** the site follows the device setting (light or dark).
- **Toggle:** one button in the header flips between light and dark. The choice is remembered on this device (`localStorage` key `theme`, value `light` or `dark`) and wins over the device setting from then on. Clearing site data returns to the device setting.
- **No flash:** a tiny inline script in `<head>` applies the remembered choice before the page paints.
- **Without JavaScript:** the site still follows the device setting (that part is pure CSS), and the toggle stays hidden because it could not work.
- **Mechanism:** `:root` sets `color-scheme: light dark`; the script sets `data-theme="light"` or `data-theme="dark"` on `<html>`, which pins `color-scheme` to that one value, and every `light-dark()` token follows.
- Code blocks use Shiki's `github-light` and `github-dark` themes and switch with the rest of the page.

## Type

| Role | Font | Notes |
|---|---|---|
| Headings, the wordmark | Source Serif 4 (variable) | weight 600; `-0.01em` letter spacing at `2xl` and above |
| Body, UI, buttons, nav | Inter (variable) | weight 400 body, 600 for emphasis, buttons and the current nav item |
| Code | the system monospace stack | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; no third font file |

Both fonts are self hosted from the site's own domain (Astro's built in font support, reading the `@fontsource-variable` npm packages). Only the Latin subset is shipped, both are preloaded, and Astro's adjusted fallback fonts keep the layout from jumping while they load.

<!-- token-table: type. Size / line height. -->
| Token | Size | Line height | Used for |
|---|---|---|---|
| `--text-sm` | `0.9375rem` (15px) | `1.5` | captions, dates, footer, tags |
| `--text-base` | `1.125rem` (18px) | `1.65` | body text (about 65 characters per line in the reading column) |
| `--text-lg` | `1.25rem` (20px) | `1.6` | lead paragraphs, the wordmark |
| `--text-xl` | `1.5rem` (24px) | `1.35` | h3 |
| `--text-2xl` | `1.875rem` (30px) | `1.25` | h2 |
| `--text-3xl` | `2.5rem` (40px) | `1.15` | h1 on inner pages |
| `--text-display` | `clamp(2.5rem, 1.75rem + 3vw, 4rem)` | `1.05` | the one hero heading on the home page |

There is no size below `--text-sm`.

## Space and layout

Spacing uses Tailwind's default 0.25rem step (`p-4` is 1rem). The layout primitives pin the few sizes pages actually need, so pages do not invent their own.

<!-- token-table: layout -->
| Token | Value | Used for |
|---|---|---|
| `--container-page` | `72rem` | widest content on any page |
| `--container-measure` | `42rem` | the reading column (prose, case studies, About) |
| `--radius-sm` | `0.375rem` | buttons, the focus ring, small chips |
| `--radius-md` | `0.75rem` | images and cards |
| `--duration-fast` | `150ms` | hover and focus colour changes |
| `--duration-page` | `200ms` | the cross fade between pages |

- **Page gutter:** `1.25rem` each side on phones, `2rem` from `md` (48rem) up.
- **Section rhythm:** `4rem` above and below a section on phones, `6rem` from `md` up.
- **Stack gaps:** `sm` 0.75rem · `md` 1.5rem · `lg` 3rem · `xl` 5rem.
- **Breakpoints:** Tailwind defaults (`sm` 40rem, `md` 48rem, `lg` 64rem). Pages are designed phone first and must not scroll sideways at any width from 320px up.
- **Borders and depth:** 1px `--color-line` hairlines only. No shadows.

## Motion

- Links, buttons and nav items change colour or underline over `--duration-fast`.
- Moving between pages cross fades over `--duration-page`, using the browser's own view transitions between documents (`@view-transition { navigation: auto; }`). The header keeps its own transition name so it stays still while the content fades. Browsers without support just navigate normally.
- With reduced motion requested, both are switched off.

## Components

Built by feature 4. Pages in Release 1 add their own (the project card and tag chip belong to the work listing, feature 8).

| Component | File | What it is |
|---|---|---|
| Base layout | `src/layouts/BaseLayout.astro` | the document: fonts, theme script, skip link, header, `<main id="main">`, footer. Pages put their content straight into its slot and never add their own `<main>` |
| Skip link | inside the base layout | "Skip to content", the first thing Tab reaches; hidden until focused, then shown top left on `--color-surface` |
| Site header | `src/components/SiteHeader.astro` | wordmark (your name in Source Serif 4, links home), nav, theme toggle. One row from `sm` up; below `sm` the wordmark and toggle share the first row and the nav sits on a second row. No menu button |
| Theme toggle | `src/components/ThemeToggle.astro` | a 40px icon button, `aria-pressed` true in dark, accessible name "Dark theme"; sun and moon icons as inline SVG |
| Site footer | `src/components/SiteFooter.astro` | your links out and a copyright line, muted text above a hairline |
| Container | `src/components/Container.astro` | centres content at `page` (72rem) or `measure` (42rem) width with the page gutter |
| Section | `src/components/Section.astro` | a `<section>` with the section rhythm and an optional heading |
| Stack | `src/components/Stack.astro` | vertical spacing between children at one of the four gaps |
| Grid | `src/components/Grid.astro` | 1, 2 or 3 columns; always one column on phones, 2 from `md`, 3 from `lg` |
| Prose | `src/components/Prose.astro` | styles rendered Markdown (headings, paragraphs, lists, quotes, code, figures, tables) in the reading column |
| Button | `src/components/Button.astro` | `primary` (accent fill) or `secondary` (hairline outline); renders `<a>` when given `href`, otherwise `<button>` |

**Links:** accent colour, underlined with a 0.2em offset, underline thickens on hover. Nav links are muted with no underline; the current page is text colour with a 2px accent underline and `aria-current="page"`.

**Focus ring:** `outline: 2px solid var(--color-accent); outline-offset: 3px;` on `:focus-visible`, everywhere.

## Brand marks

- **Wordmark:** "Toyin Ogunseinde" in Source Serif 4, weight 600, `--text-lg`. No logo file.
- **Favicon:** `public/favicon.svg`, a "TO" monogram in paper coloured Source Serif letters on an ink blue rounded square, readable on light and dark browser tabs. Plus `public/apple-touch-icon.png` (180 by 180) rendered once from it. Astro's default `favicon.ico` is removed.

## Style guide

`/styleguide` shows every token and component in both themes. It exists on the local dev server only and is never in the production build.
