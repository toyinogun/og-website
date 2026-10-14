# 0007. Search metadata and share cards

**Date**: 2026-10-14
**Status**: Accepted

## Summary

Every page gets a share image, so a pasted link shows a picture as well as a title and description: a project page shows its own cover, every other page shows one site card drawn in the same style as the covers. Astro's own image step resizes each one to 1200 by 630 during the build, so the site stays fully pre rendered with no adapter. The site also gains a sitemap (from Astro's official `@astrojs/sitemap` integration), a `robots.txt` that welcomes every crawler and keeps `/api/` out, and on the home page a JSON data block (structured data search engines read) that describes you as a person. The first cover on each page loads straight away instead of lazily, and the 404 page is told to stay out of search results.

## Requirements

**User stories**:
- As the site owner, I want any page link I paste into LinkedIn or a message to show a correct title, description and image, so that the preview looks deliberate in applications and messages.
- As someone searching for your name, I want search engines to know the site is yours and what you do, so that your site is what I find.
- As a search engine or AI crawler, I want a sitemap and a `robots.txt`, so that I find every page and skip what is not a page.
- As a visitor, I want the main image on a page to appear quickly, so that the page feels finished as soon as it opens.
- As the site owner, I want a new page or project to get its share tags and sitemap entry with no extra step, so that nothing is forgotten.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

*Titles and descriptions*

- **AC-1**: Every HTML page in `dist/` has exactly one non empty `<title>` and one `<meta name="description">` whose content is 50 to 160 characters after trimming. The 404 page gains its words in a `NOT_FOUND` constant in `src/lib/not-found.ts` (`title`, `description`, `heading`, `text`, `buttonLabel`, starting from the draft copy in *Feature design* and the words the page shows today), held to limits by `src/lib/not-found.test.ts`: `title` at most 60, `description` 50 to 160, `heading` at most 60, `text` at most 160, `buttonLabel` at most 40.

*Share image*

- **AC-2**: A site card exists as a committed source image at `src/assets/share/site-card.png`, 1600 by 840 pixels (the cover shape, 1.905 to 1), drawn in the style of the project covers: the warm paper background and hairline frame, the blue letterspaced eyebrow `TOYIN OGUNSEINDE`, the serif heading `I build infrastructure that stays up.` and the muted line `DevOps and infrastructure engineer`. Its drawing source sits beside it as `src/assets/share/site-card.svg`. It is made once by hand (a one off local command), never by a build step, and adds no package to `package.json`. Its alt text is `SHARE.siteCardAlt` in `src/lib/seo.ts`.
- **AC-3**: `BaseLayout` gains an optional `image?: ShareImageSource` prop (`{ src: ImageMetadata; alt: string }`). When it is absent the layout uses the site card. The layout turns the source into the share image with `getImage` from `astro:assets` using exactly `SHARE_IMAGE_OPTIONS` (width 1200, height 630, `fit: 'cover'`, `position: 'center'`, `format: 'jpeg'`, `quality: 80`, `background` the light paper colour of the covers), so the result is always a 1200 by 630 JPEG under `/_astro/`.
- **AC-4**: On every page except the 404 page, `BaseLayout` writes, after the spec 0004 share tags: `og:image` (the absolute address, `https://toyintest.org/_astro/…jpg`), `og:image:type` `image/jpeg`, `og:image:width` `1200`, `og:image:height` `630` and `og:image:alt` (the image's alt text); `twitter:card` changes from `summary` to `summary_large_image`. Every other spec 0004 AC-13 tag keeps its value and order.
- **AC-5**: Each project page passes `image={{ src: cover, alt: coverAlt }}`, so its `og:image` is its own cover at 1200 by 630 and its `og:image:alt` is its `coverAlt`. Home, work, about and contact pass no image and show the site card with `SHARE.siteCardAlt`. All four project pages and the four other pages are checked in the build test.
- **AC-6**: Every share image file the build emits is a JPEG of exactly 1200 by 630 pixels and at most 300 KB, measured from the file in `dist/`.

*404 page*

- **AC-7**: `BaseLayout` gains an optional `noindex?: boolean` prop. When true it writes `<meta name="robots" content="noindex">` and omits the canonical link, `og:url`, and the image tags of AC-4 (the 404 page is never shared). Only `src/pages/404.astro` sets it. No other page has a robots meta tag.

*Canonical addresses*

- **AC-8**: Canonical addresses are unchanged from today: `new URL(Astro.url.pathname, Astro.site)`, so every page's canonical link and `og:url` have no trailing slash (`https://toyintest.org/projects`, `https://toyintest.org/projects/mool`), and the home page's is the origin `https://toyintest.org/`. A build test checks the canonical link of every page in the sitemap is the same address as its sitemap entry.

*Sitemap and robots.txt*

- **AC-9**: `@astrojs/sitemap` is added (with `npx astro add sitemap`, which writes it to `package.json` and `astro.config.mjs`). The build writes `dist/sitemap-index.xml` and `dist/sitemap-0.xml`. The sitemap lists exactly the built, indexable pages: `/`, `/projects`, each published project at `/projects/<slug>`, `/about` and `/contact`. It never lists `/404`, `/styleguide`, `/api/…`, a draft project, or any address ending in a slash (other than the bare origin for the home page). Entries carry no `lastmod`, `changefreq` or `priority`.
- **AC-10**: `BaseLayout` writes `<link rel="sitemap" href="/sitemap-index.xml">` on every page.
- **AC-11**: `src/pages/robots.txt.ts` is a pre rendered endpoint that returns `robotsTxt(site)` from `src/lib/seo.ts` as `text/plain`, so `dist/robots.txt` is exactly:
  ```
  User-agent: *
  Disallow: /api/

  Sitemap: https://toyintest.org/sitemap-index.xml
  ```
  No crawler, AI or otherwise, is singled out. The origin comes from Astro's `site`, never written twice.
- **AC-12**: On the deployed site `GET /robots.txt` returns 200 with the same body as `dist/robots.txt` (so no Cloudflare setting adds or blocks crawlers behind it), and `GET /sitemap-index.xml` returns 200. The `curl` results are pasted on the ship issue.

*Person structured data*

- **AC-13**: The home page, and only the home page, holds exactly one `<script type="application/ld+json">` whose JSON is an `@graph` of two nodes:
  - a `Person` with `@id` `https://toyintest.org/#person`, `name` `SITE.name`, `url` `https://toyintest.org/`, `jobTitle` `SITE.jobTitle` (`DevOps and infrastructure engineer`), `address` `{ "@type": "PostalAddress", "addressCountry": "NL" }` from `SITE.country`, `sameAs` the `href` of every `SITE.links` entry of kind `profile` in order (LinkedIn, then GitHub), and `image` the absolute address of the site card share image;
  - a `WebSite` with `@id` `https://toyintest.org/#website`, `name` `SITE.name`, `url` `https://toyintest.org/` and `author` `{ "@id": "https://toyintest.org/#person" }`.
  It carries no email address and no other field.
- **AC-14**: The block is built by pure helpers in `src/lib/seo.ts` (`personGraph`, `jsonLdText`), and `jsonLdText` escapes every `<` as `<`, so no text can close the script tag. The block is a data block, not JavaScript: it is written with `is:inline`, is not bundled, and has no `src`. Spec 0004 AC-17 ("only the two spec 0003 scripts") is restated to count executable scripts only, so the home page has the two spec 0003 scripts plus this one data block.

*Covers above the fold*

- **AC-15**: `ProjectCard` gains `priority?: boolean`, default `false`, passed to its `<Image>` as Astro's `priority` (which writes `loading="eager"`, `decoding="sync"` and `fetchpriority="high"`). `SelectedWork` (home) and `WorkList` (work) pass `priority` to the first card only; every other card keeps lazy loading. The project page cover has `priority`. So each of home, work and every project page has exactly one image with `fetchpriority="high"`, it is the first cover in document order, and every other cover on that page has `loading="lazy"`. The about and contact pages, which have no cover, have none.

*Unchanged guarantees*

- **AC-16**: Every page is still pre rendered: no adapter, no `export const prerender = false`, `wrangler.jsonc` unchanged, and `run_worker_first` still only `/api/*`, so `/robots.txt`, the sitemap and the share images are free static assets. Loading any page still requests nothing from another host, and the spec 0003 accessibility, width sweep and theme checks still pass.

*Live proof*

- **AC-17**: After the merge deploys, the home page and one project page are pasted into LinkedIn Post Inspector and into one message app you use, and each shows the page's title, description and its image (the site card on the home page, the cover on the project page). You record the result, with screenshots, as a comment on the ship issue.

## Decision

**Chosen option**: Option 1: Astro's own image step for share images (project cover, else one committed site card), `@astrojs/sitemap`, a pre rendered `robots.txt` endpoint, and a Person data block on the home page, all wired through `BaseLayout`.

`BaseLayout` gains two optional props (`image`, `noindex`) and an optional `structuredData`; every value comes from `SITE`, the page's own constant, or the project's frontmatter, through pure helpers in `src/lib/seo.ts`.

**Implementation skills**: `astro-seo` (`jdevalk/skills`, a Paperclip company skill attached to the Engineer). Where it disagrees with this spec, the spec wins.

## Feature design

**Data model sketch**: no persisted data. Constants, props and one committed image:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `SITE.jobTitle` | `src/lib/site.ts` | `string`, `'DevOps and infrastructure engineer'` | added to the `Site` interface; the Person `jobTitle` |
| `SITE.country` | `src/lib/site.ts` | `'NL'` (ISO 3166 two letter code) | the Person `addressCountry`; the home page already says the Netherlands |
| `SHARE` | `src/lib/seo.ts` | `{ siteCardAlt: string }` | `siteCardAlt` 1 to 160 characters, tested |
| `SHARE_IMAGE_OPTIONS` | `src/lib/seo.ts` | `{ width: 1200, height: 630, fit: 'cover', position: 'center', format: 'jpeg', quality: 80, background: string }` | `background` is the covers' paper colour in hex (sample it from a cover's corner pixel); the one place the share image size lives |
| `ShareImageSource` | `src/lib/seo.ts` | `{ readonly src: ImageMetadata; readonly alt: string }` | the `image` prop type |
| Site card | `src/assets/share/site-card.png` and `.svg` | 1600 by 840 PNG, committed | AC-2; imported by `BaseLayout` as the default |
| `NOT_FOUND` | `src/lib/not-found.ts` | five `readonly` strings | AC-1 limits |
| `BaseLayout` props | `src/layouts/BaseLayout.astro` | adds `image?: ShareImageSource`, `noindex?: boolean`, `structuredData?: JsonLdGraph` | all optional, so existing pages compile unchanged |
| `ProjectCard` props | `src/components/ProjectCard.astro` | adds `priority?: boolean` | default `false` |

**Draft copy** (you may edit it in the build's pull request):

| Key | Draft |
|---|---|
| `SHARE.siteCardAlt` | Toyin Ogunseinde, DevOps and infrastructure engineer: I build infrastructure that stays up. |
| `NOT_FOUND.title` | Page not found |
| `NOT_FOUND.description` | This page does not exist on Toyin Ogunseinde's site. The home page shows the work, the background and how to get in touch. |

`NOT_FOUND.heading`, `text` and `buttonLabel` keep the words the 404 page shows today (`This page does not exist`, `The link may be old or mistyped. The home page is a good place to start.`, `Go to the home page`). Edit any of them freely within the limits.

**Helpers** (`src/lib/seo.ts`, pure, each with a doc comment and tests in `seo.test.ts`):

| Helper | Input | Output |
|---|---|---|
| `absoluteUrl(path, site)` | a path such as `/_astro/x.jpg`, the `site` URL | the absolute address string |
| `personGraph({ site, imageUrl })` | `SITE`, the `site` URL, the site card's absolute address | the AC-13 `@graph` object, built from `SITE.name`, `SITE.jobTitle`, `SITE.country` and the `profile` links |
| `jsonLdText(data)` | any JSON value | `JSON.stringify(data)` with every `<` replaced by `<` |
| `robotsTxt(site)` | the `site` URL | the AC-11 text, ending in one newline |

**Head tags `BaseLayout` writes, in order** (new tags marked new; the rest is spec 0004):

1. title, meta description (spec 0004)
2. canonical link (omitted with `noindex`), new: `<meta name="robots" content="noindex">` only with `noindex`
3. `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url` (omitted with `noindex`)
4. new: `og:image`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt` (omitted with `noindex`)
5. `twitter:card`: `summary_large_image` (`summary` with `noindex`, since there is no image)
6. new: `<link rel="sitemap" href="/sitemap-index.xml">`
7. new: the `application/ld+json` block, only when `structuredData` is passed

**Making the share image** (inside `BaseLayout`'s frontmatter, at build time):

```ts
const source = image ?? { src: siteCard, alt: SHARE.siteCardAlt };
const shareImage = await getImage({ src: source.src, ...SHARE_IMAGE_OPTIONS });
const shareImageUrl = absoluteUrl(shareImage.src, Astro.site);
```

The home page gets the site card's absolute address for the Person `image` the same way (the same options give the same file, so it is emitted once).

**Sitemap configuration** (`astro.config.mjs`): `sitemap({ filter: (page) => !page.endsWith('/404') })`. Astro's `site` and `trailingSlash: 'never'` drive the addresses. If the integration writes the home entry as `https://toyintest.org` rather than `https://toyintest.org/`, either is accepted: they are the same address.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Any page head | title, description | the page's constant (`HOME`, `WORK`, `ABOUT`, `CONTACT`, `NOT_FOUND`) or, on a project page, `projectPageTitle(title)` and `summary` (spec 0004, spec 0002) |
| Any page head | canonical, `og:url` | `Astro.url.pathname` resolved against Astro's `site` (spec 0001) |
| Any page head | `og:image` address | `getImage` output `src` (under `/_astro/`) resolved against Astro's `site` |
| Any page head | `og:image:width`, `og:image:height`, `og:image:type` | `SHARE_IMAGE_OPTIONS` (1200, 630, JPEG) |
| Project page head | the image and its alt | frontmatter `cover` and `coverAlt` (spec 0002) |
| Other pages head | the image and its alt | the committed site card and `SHARE.siteCardAlt` |
| Share image | the fill behind transparent pixels | `SHARE_IMAGE_OPTIONS.background`, sampled from a cover |
| Home Person block | `name`, `jobTitle`, `addressCountry` | `SITE.name`, `SITE.jobTitle`, `SITE.country` |
| Home Person block | `sameAs` | `SITE.links` filtered to `kind: 'profile'` |
| Home Person block | `url`, `@id`s | Astro's `site` |
| Home Person block | `image` | the site card share image address (as above) |
| Sitemap | the list of addresses | the pages Astro built, minus `/404` (`@astrojs/sitemap`) |
| `robots.txt` | the sitemap line | Astro's `site` plus `/sitemap-index.xml` |
| Cards | which cover gets `priority` | the card's index in the list the page already passes (index 0) |

**Key invariants**:
- Every share image is 1200 by 630 JPEG under 300 KB, and every `og:image` is an absolute `https://toyintest.org/` address.
- The sitemap and the canonical links name the same addresses, none with a trailing slash except the bare origin.
- The inbox address never appears in structured data or anywhere in the repository.
- At most one image per page has `fetchpriority="high"`.
- Nothing in this feature runs on request: all output is files in `dist/`.

**Security model**: everything here is public by design. The Person data says only what the site already shows. The JSON block escapes `<` so content can never break out of it, and as a data block it stays allowed under a future Content Security Policy without `unsafe-inline` for scripts (browsers never execute `application/ld+json`). `robots.txt` is advice to well behaved crawlers, not access control; `/api/contact` stays protected by spec 0006 (Turnstile, rate limit, origin check).

**Configuration required**: none. No new environment variable or secret. One new package, `@astrojs/sitemap`.

**Failure and edge cases**:
- A cover that is not the 1.905 to 1 shape (spec 0002 allows any shape at least 1200 wide): `fit: 'cover'` with `position: 'center'` crops the centre to 1200 by 630; nothing fails.
- A cover with transparent pixels: JPEG has no transparency, so `background` fills them with paper instead of black.
- A draft project: not built in production, so it has no page, no sitemap entry and no share image.
- A new page added later: it gets the site card, its sitemap entry and its share tags with no change here; it only needs its own title and description (AC-1 fails the build test if it forgets).
- A Cloudflare zone setting (managed `robots.txt`, AI crawler blocking) that would change what crawlers see: caught by AC-12 on the deployed site.
- A messaging app that cached an old preview: LinkedIn Post Inspector refreshes it; other apps refresh on their own schedule (days). Not a defect.

**Critical test scenarios**:
- Build test (new `tests/build/seo-build.test.ts`): every page's title and description lengths, verifies **AC-1**; image tags and absolute address on home, work, about, contact and all four project pages, verifies **AC-4**, **AC-5**; every emitted share JPEG measured at 1200 by 630 and at most 300 KB, verifies **AC-6**; the 404 page's robots meta and the absence of canonical, `og:url` and image tags, verifies **AC-7**; sitemap entries equal to the canonical links of the built pages, no `/404`, no trailing slash, verifies **AC-8**, **AC-9**; the sitemap link in every head, verifies **AC-10**; `dist/robots.txt` byte for byte, verifies **AC-11**; one parseable JSON-LD block on the home page with exactly the AC-13 fields and none on any other page, verifies **AC-13**, **AC-14**; one `fetchpriority="high"` image per page and it is the first cover, verifies **AC-15**; no adapter and no `_worker.js`, verifies **AC-16**.
- Unit tests (`src/lib/seo.test.ts`): `personGraph` from a sample `SITE`, including an `email` kind link that must not appear; `jsonLdText` on a string containing `</script>`; `robotsTxt` for a sample origin; `absoluteUrl` with and without a leading slash; `SHARE` and `SHARE_IMAGE_OPTIONS` values, verifies **AC-3**, **AC-11**, **AC-13**, **AC-14**.
- Component tests: `ProjectCard` with and without `priority`; `SelectedWork` and `WorkList` give `priority` to the first card only, verifies **AC-15**.
- Existing tests updated, not deleted: `tests/build/home-build.test.ts` (the "no `og:image`, no structured data, no sitemap" check and the `twitter:card summary` value, the two scripts check now counting executable scripts), `tests/build/about-build.test.ts` and `tests/build/work-build.test.ts` (no longer "no `og:image`"), and the 404 `twitter:card` check, verifies **AC-4**, **AC-7**, **AC-14**.
- Contract: `tests/stack-contract.test.ts` checks `@astrojs/sitemap` is the only new dependency and there is still no adapter, verifies **AC-9**, **AC-16**.
- Live: the deployed `curl` checks and the preview paste, verifies **AC-12**, **AC-17**.

## Build plan

Skateboard: the share image first, because it is the part people see, then each smaller piece on top, every step leaving a working site.

1. Draw the site card: `src/assets/share/site-card.svg` in the covers' style, turned into `src/assets/share/site-card.png` at 1600 by 840 with a one off local command (for example the `sharp` already installed under Astro). Sample the paper colour from a cover for `SHARE_IMAGE_OPTIONS.background`, satisfies **AC-2**
2. Create `src/lib/seo.ts` with `SHARE`, `SHARE_IMAGE_OPTIONS`, `ShareImageSource`, `absoluteUrl` and `seo.test.ts`, satisfies **AC-3**
3. Extend `BaseLayout`: the `image` prop, `getImage`, the five image tags and `summary_large_image`; pass `image={{ src: cover, alt: coverAlt }}` from `src/pages/projects/[slug].astro`. Update the existing build tests that asserted no image, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**
4. Add `NOT_FOUND` (`src/lib/not-found.ts` with its test), move the 404 words into it, add the `noindex` prop and use it on the 404 page; update `tests/not-found-page.test.ts`, satisfies **AC-1**, **AC-7**
5. Add `@astrojs/sitemap` with `npx astro add sitemap`, the `/404` filter, the sitemap link in `BaseLayout`, and `robotsTxt` with `src/pages/robots.txt.ts`, satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**
6. Add `SITE.jobTitle` and `SITE.country` (update `site.test.ts`), `personGraph` and `jsonLdText`, the `structuredData` prop in `BaseLayout`, and pass the graph from `src/pages/index.astro`; restate the home scripts check, satisfies **AC-13**, **AC-14**
7. Add `priority` to `ProjectCard`, pass it to the first card in `SelectedWork` and `WorkList` and to the project page cover; component tests, satisfies **AC-15**
8. Write `tests/build/seo-build.test.ts` and extend `tests/stack-contract.test.ts`; run `npm run build`, `npm test`, `npm run test:build` and `npm run test:e2e`, satisfies **AC-1** to **AC-11**, **AC-13** to **AC-16**
9. Update `design.md` (a Share card row: the site card's layout and words, and the rule that every page's share image is its cover or the site card) and the dev only style guide (show the site card image), satisfies **AC-2**
10. After the merge deploys: the `curl` checks on `/robots.txt` and `/sitemap-index.xml`, then the preview paste on LinkedIn Post Inspector and one message app, recorded on the ship issue, satisfies **AC-12**, **AC-17**

## Consequences

**Positive**:
- Every pasted link shows a picture, and project links show the project itself.
- No new build tooling for images: the same Astro step that already resizes covers makes the share images.
- New pages and projects are covered automatically (share tags, image, sitemap).
- Search engines get an unambiguous statement of who owns the site and which profiles are yours.

**Negative / tradeoffs**:
- The site card is a hand made image: changing your headline means redrawing it, and it can drift from `HOME.heading` without a test noticing.
- Pages other than projects all share one image, so their previews differ only by title and description.
- One new dependency (`@astrojs/sitemap`), and it writes two files (`sitemap-index.xml` and `sitemap-0.xml`) where one would do.
- Each build makes one more image per page variant; build time grows slightly.
- The site card has no dark version; previews are always light.

**Neutral**:
- Spec 0004 AC-13 (no `og:image`, `twitter:card` `summary`) and AC-17 (two scripts) and spec 0005 AC-11 (no `og:image`) are superseded on those points by this spec; their tests change with it.
- `og:type` stays `website` on every page.

## Follow-up

- [ ] After the merge deploys: a `Board:` task to verify `toyintest.org` in Google Search Console with the Cloudflare DNS record and submit `https://toyintest.org/sitemap-index.xml` (your pick on 2026-10-14). Created by the Tech Lead at ship.
- [x] Record `@astrojs/sitemap` in `AGENTS.md` (Stack key dependencies) and the new `BaseLayout` props and `src/lib/seo.ts` in its Rules; `/sync` owns that. Done on JSM-70.
- [x] Record in `AGENTS.md` `## Agent skills`: `jdevalk/skills` astro-seo imported and attached to the Engineer (JSM-68); declined `fabiensalles/claude-marketplace` astro-sitemap, `kostja94/marketing-skills` open-graph, `aaron-he-zhu/aaron-marketing-skills` serp-markup-builder, `soborbo/claudeskills` astro-seo, and the MCP servers seo-mcp and OpenGraph.io MCP. `/sync` owns that. Done on JSM-70.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
