# Verify: design system and UI foundation · spec 0003 · updated 2026-10-13
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. "Preview" means the production build served by `npx astro preview` (or `npx wrangler dev` for the Cloudflare 404 handling); "dev" means `astro dev`._

## UI / manual
- [x] Preview, device set to dark, JavaScript off: load `/` → no `data-theme` on `<html>`, dark paper background, no theme toggle visible → AC-4, AC-6
- [x] Preview, nothing stored, device light: load `/`, then switch the device to dark without reloading → the page turns dark and the toggle reads pressed (moon icon) → AC-4, AC-6
- [x] Preview, `localStorage.theme` set to `dark` on a light device: load `/` → `data-theme="dark"` is already set when `<body>` is created, first frame dark → AC-5
- [x] Preview, `localStorage.theme` set to `blue`, or a storage read that throws: load `/` → no `data-theme`, device theme shows, no console error → AC-5
- [x] Preview: press the toggle with a click, with Enter and with Space → the theme flips, `aria-pressed` and the icon follow, `localStorage.theme` holds the choice; reload and open an unknown path → the choice holds → AC-6, AC-19
- [x] Preview, storage writes throw: press the toggle → this page flips, no console error → AC-6
- [x] Preview: inspect `/` → body text is Inter Variable at 18px, h1 and the wordmark Source Serif 4 Variable, and every request goes to the site's own host → AC-7
- [x] Preview: inspect the DOM of `/` → skip link, header, `<main id="main" tabindex="-1">`, footer, in that order, one `<main>` → AC-8
- [x] Preview: press Tab from load → skip link (visible), wordmark, each nav link, theme toggle, each with a 2px solid focus ring, in both themes → AC-9, AC-10
- [x] Preview: activate the skip link → focus on `<main>`; next Tab → the first focusable element in main (the 404 page's button), never the header → AC-10
- [x] Header with a nav (the real header markup with nav items, under the built CSS): at 639px two rows, at 640px one row; the current page link has `aria-current="page"` → AC-11, AC-13
- [x] Footer: copyright line `© <build year> Toyin Ogunseinde`; with links, `rel="me"` on profile links → AC-12
- [x] Preview at 320, 360, 375, 639, 640, 768, 1024 and 1440px on `/` and the 404 page → no sideways scroll, no box wider than 72rem → AC-13
- [x] Dev `/styleguide` in both themes → every Container, Section, Stack, Grid and Button prop and variant renders to `design.md` sizes, gaps and states → AC-14, AC-18
- [x] Dev `/styleguide` → the sample Markdown renders through Prose with the mapped colours; the code block switches between GitHub light and dark when the toggle is pressed; the wide table scrolls inside its own box at 375px → AC-15, AC-13
- [x] Preview: navigate from the 404 page to `/` → the page cross fades and the header stays still; with reduced motion, no view transition and `document.getAnimations()` is empty on `pagereveal` → AC-16
- [x] Preview: the header wordmark reads "Toyin Ogunseinde" in Source Serif 4 and links to `/`; `/favicon.svg` shows the TO monogram, `/apple-touch-icon.png` is 180 by 180, and `/favicon.ico` is gone → AC-17
- [x] Preview and `wrangler dev`: request an unknown path → status 404 with "This page does not exist", the help line and a primary button to `/` → AC-19
- [x] Preview: axe scan at WCAG 2.2 AA on `/` and the 404 page in both themes, and on `/` with the skip link focused → zero violations; every header, footer and button target is at least 24 by 24px → AC-20

## Commands
- [x] `npm test` → passes, including `tests/design-contract.test.ts` (token drift, colour bans, contrast floor) → AC-1, AC-2, AC-3
- [x] Change one token value in `design.md` or `global.css`, run `npm test` → fails; revert → AC-1
- [x] `npm run build && npm run test:build` → passes: theme script first in `<head>`, three font faces at most 300 KB with two preloads, view transition rules in the CSS, no `styleguide` output, every nav href built → AC-5, AC-7, AC-11, AC-16, AC-18
- [x] `npm run test:e2e` → passes on desktop and mobile widths → AC-4 to AC-7, AC-9, AC-10, AC-13, AC-16, AC-19, AC-20

## Value sourcing
- [x] Wordmark text comes from `SITE.name`: it reads "Toyin Ogunseinde" → AC-17
- [x] Nav labels and order come from the `nav` prop; the current marker from `isCurrentPath` (a page inside a section marks the section; `/workshop` does not mark `/work`) → AC-11
- [x] Stored choice is read through `parseStoredTheme` inside `try`: `dark`, `light`, `blue`, nothing, and a throwing read each behave as AC-5 says → AC-5
- [x] Toggle state comes from `data-theme` plus the live `prefers-color-scheme`: change the device setting while unpinned, then while pinned → it follows, then it does not → AC-6
- [x] Footer year defaults to the build year → AC-12
- [x] Token values come from `design.md`: the contract test compares every row → AC-1
- [x] Contrast pairs come from *Contrast floor* in `design.md` → AC-3
- [x] Fonts come from the local npm packages: the built `@font-face` rules point only at `/_astro/fonts/` → AC-7
- [x] Code colours come from Shiki `github-light` and `github-dark` with `light-dark()` → AC-15
- [x] Favicon colours and letters come from *Brand marks*: `#24569f` square, `#fcfaf6` letters as paths, no `<text>` → AC-17
- [x] 404 copy is the fixed copy in AC-19 → AC-19

## Acceptance-criteria coverage
- AC-1 Commands 1, 2 · AC-2 Commands 1 · AC-3 Commands 1 · AC-4 UI 1, 2, 4 · AC-5 UI 3, 4, Commands 3 · AC-6 UI 1, 2, 5, 6 · AC-7 UI 7, Commands 3 · AC-8 UI 8 · AC-9 UI 9 · AC-10 UI 9, 10 · AC-11 UI 11, Commands 3 · AC-12 UI 12 · AC-13 UI 11, 13, 15 · AC-14 UI 14 · AC-15 UI 15 · AC-16 UI 16, Commands 3 · AC-17 UI 17 · AC-18 UI 14, Commands 3 · AC-19 UI 5, 18 · AC-20 UI 19
