# 0003. Design system and UI foundation: rationale

## Context

The site exists to win work from two readers, a hiring manager and a prospective client, and both judge it in seconds. Right now it is one unstyled placeholder page. Release 1 adds four pages (home, work, project detail, about) plus a contact form, built one feature at a time and probably by different sessions. Without a shared visual language each page invents its own sizes, colours and spacing, and the site reads as assembled rather than designed.

You asked for light and dark theme. Theme is cheap only when it is part of the foundation: if components are written against fixed colours first, every one of them has to be revisited later. You did not ask for an accessibility target, so none is committed, but keyboard use and visible focus are in the scope's "done when" for this feature.

The stack is fixed by spec 0001: Astro 7, fully static, Tailwind CSS 4, served from Cloudflare at zero cost. Anything here must stay static (no server rendering), add as little JavaScript as possible, and add no paid or third party runtime service.

You chose the direction in two question rounds on JSM-8: no existing design and no reference sites, so a suggested direction informed by a quick look at current developer portfolios; a quiet editorial feel; device theme plus a remembered toggle; Source Serif 4 with Inter; self hosted fonts; warm paper neutrals; an ink blue accent; 18px body text; your name as the wordmark with a TO monogram favicon; nav links always visible on phones; a two state toggle; layout, header and footer, primitives, prose and buttons built now (project card left to feature 8); minimal motion plus page transitions; and a style guide on the dev server only.

## Options considered

The look itself was settled by your answers. What remained open was how the system is expressed in code, which decides how cheap theme stays and how hard drift is.

### Option 1: Tailwind utilities with the `dark:` variant on every element

Use Tailwind's stock palette (for example `bg-stone-50 dark:bg-stone-950`) directly in markup, with no custom tokens.

**Pros**:
- Zero setup; the most common Tailwind pattern, so examples are everywhere.
- Each element shows both its colours in one place.

**Cons**:
- Every element carries two colour decisions, so theme is paid for again in every new component, the exact retrofit cost this feature exists to avoid.
- The palette is "whatever stone shade felt right", so drift is invisible and `design.md` cannot be checked against the code.
- A visitor with JavaScript off can only follow the device theme if the dark variant is media based, which then fights the toggle.

### Option 2: Semantic tokens with `light-dark()`, custom components, Tailwind for layout (chosen)

Define a short list of semantic tokens (`bg`, `surface`, `text`, `muted`, `line`, `accent`) in Tailwind 4's `@theme`, each holding its light and dark value through CSS `light-dark()`. The theme becomes a single `color-scheme` value on `<html>`. Wrap layout in a handful of typed Astro components.

**Pros**:
- A component written with `text-muted` is correct in both themes with no extra work.
- Without JavaScript the site still follows the device, because `color-scheme: light dark` is plain CSS; the script only pins a choice.
- The token list is small and named, so a test can hold `design.md` and `global.css` together.
- No new runtime dependency; it is CSS the browser already has.

**Cons**:
- `light-dark()` needs a 2024 or newer browser; older ones see light only.
- Contributors must learn "use the token, never `dark:`", which the contract test enforces but which is less familiar than stock Tailwind.

### Option 3: A component library or kit (daisyUI or a Tailwind template)

Adopt an existing Tailwind component kit with built in themes.

**Pros**:
- Many components and theme switching out of the box.
- Fast first page.

**Cons**:
- Its components carry its look; reaching a quiet editorial feel means overriding most of it.
- Adds a dependency that shapes every page for the life of the site, for a site that needs about ten components.
- The Tailwind design system Agent Skill was already declined in spec 0001 for the same reason: the site wants its own small system, not a borrowed one.

### Smaller calls made inside the chosen option

| Decision | Pick | Why | Runner up |
|---|---|---|---|
| Font delivery | Astro's built in `fonts` config with `fontProviders.npm()` reading `@fontsource-variable` packages | Self hosted as you chose, versions pinned in `package-lock.json`, no network fetch during the Cloudflare build, automatic preload and size adjusted fallbacks | `fontProviders.fontsource()`, which fetches from the Fontsource CDN at build time: one less dependency but an extra network step in every build |
| Theme switch mechanism | `color-scheme` on `<html>` driven by `data-theme`, tokens in `light-dark()` | One switch point; JavaScript off still follows the device | A `.dark` class plus duplicated dark token block inside a media query: works in older browsers but doubles every value |
| Page transitions | Native view transitions between documents (`@view-transition`) | Zero JavaScript; each page stays a plain static document; degrades to normal navigation | Astro's `<ClientRouter />`: wider browser support, but turns the site into a client routed app, needs the theme script rerun on every swap, and adds a script to every page |
| Prose styling | `@tailwindcss/typography` with its colour variables mapped to tokens | Official, handles dozens of Markdown edge cases (nested lists, tables, code) that hand written styles miss | Hand written prose CSS: no dependency, but slower and easier to get wrong |
| Code highlighting | Astro's built in Shiki with `github-light` and `github-dark` | Already in Astro, no client JavaScript, readable in both themes | A single theme for both: simpler, but a light code block glares on a dark page |
| Icons | Two inline SVGs copied from Lucide | Only two icons are needed; a package would be heavier than the icons | `@lucide/astro`: worth it once a page needs many icons |
| Mobile header | Two rows below 40rem, no menu button | Your name, three links and the toggle do not fit one 320px row; a second row keeps every link visible with no script | Shrinking the wordmark to the monogram on phones: one row, but your name disappears where most first visits happen |
| Nav contents at launch of this feature | Empty, filled by each page feature | `main` deploys on every push; links to pages that do not exist yet would be live 404s | Showing all links now pointing at placeholders: looks complete but ships dead ends |
| Style guide | Dev only route injected by a tiny integration | A static page under `src/pages/` would always ship; injecting it only for `astro dev` keeps it out of `dist/` | A `/styleguide` page with `noindex`: shippable, but public |
| Contrast floor | 4.5 to 1 for text, 3 to 1 for the focus ring, tested | Keeps the warm muted greys honest without committing to an accessibility standard you did not ask for | No check: quicker, but muted text on paper is exactly where readability quietly fails |

## Rationale

The forces that decide this are: theme must be nearly free for every future component, the site must stay static and nearly JavaScript free at zero cost, several sessions will build pages on top of this, and the look must stay quiet enough that the work leads.

Option 2 meets all of these. Putting both theme values inside each token moves the theme decision from every component (Option 1) to one list of eight colours, which is what makes "theme is cheap now, expensive later" true in practice. Because the switch is `color-scheme`, the device setting works with no script at all and the toggle only has to pin a choice, which keeps the shipped JavaScript to an inline snippet and one small module. Option 3 would be faster for the first page and slower for every page after, because the kit's look has to be undone before the editorial one can be built, and it adds a lasting dependency to a site that needs about ten components.

You chose page transitions over my recommendation of minimal motion only. That is a reasonable choice, and it is delivered in the cheapest form: native view transitions between documents, which add no JavaScript and simply do nothing in browsers that lack them. The one thing to accept consciously is that Firefox visitors (at the time of writing) get instant navigation instead of a cross fade.

## Inspiration

From the web check you asked for (October 2026): quiet developer portfolios such as Lee Robinson's, Paco Coursey's and Aaron Francis's share a narrow reading column around 40 to 48rem, warm or neutral paper backgrounds with warm near black in dark mode, one restrained accent, a handful of hairline borders and no shadows, and type doing most of the hierarchy. The direction here takes those habits and adds a serif for headings to make it read editorial rather than product.

## References

**Project sources**:
- `docs/scope/scope.md`, feature 4 and the deferred accessibility target
- spec 0001 (Tailwind as the styling mechanism, static output, zero running cost, the declined Tailwind design system skill)
- `AGENTS.md` rules: functional helpers, documented `Props`, tests beside the source
- your answers to the two JSM-8 question cards

**Practices & standards**:
- semantic design tokens as the single source of colour
- CSS `color-scheme` and `light-dark()` for theme
- `:focus-visible` focus rings and a skip link as the first focusable element
- WCAG relative luminance contrast formula (used as a design check, not a compliance claim)
- `prefers-reduced-motion` for all motion

**Links** (checked during the design conversation):
- Tailwind CSS, dark mode: https://tailwindcss.com/docs/dark-mode
- Tailwind CSS, theme variables: https://tailwindcss.com/docs/theme
- Fontsource: https://fontsource.org
- Lee Robinson: https://leerob.com
- Paco Coursey: https://paco.me
- Aaron Francis: https://aaronfrancis.com
