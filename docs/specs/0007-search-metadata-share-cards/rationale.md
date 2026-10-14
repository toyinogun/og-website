# 0007. Search metadata and share cards: rationale

## Context

This is scope feature 12. You will paste the site's address into job applications, LinkedIn messages and chats, and the preview is often the first thing anyone sees of your work. Today every page already has a title, a description and the basic share tags (spec 0004 AC-13), so a pasted link shows text only. Search engines also have no sitemap, no `robots.txt` and nothing that says the site belongs to a person called Toyin Ogunseinde who does DevOps and infrastructure work.

Several earlier decisions bind this one:

- The site is fully pre rendered with no adapter (spec 0001). Anything that runs per request turns free static requests into metered Worker invocations, so every image and file here must be made during the build.
- Addresses never end in a slash (spec 0005), so the sitemap and canonical links must agree with that.
- Every project has a cover at least 1200 pixels wide (spec 0002 AC-12), and spec 0002 already earmarked it as the project's share image. The four real covers are 1600 by 840, the exact share card shape (1.905 to 1).
- `/styleguide` is dev only and `/api/*` is the contact form Worker; neither is a page to index.
- The running cost target is zero, and the project prefers reusing what is installed over adding packages.

Not deciding leaves pasted links without a picture, which reads as unfinished next to every other link in a feed, and leaves search engines to guess which pages exist and who the site is about.

Decided by you on 2026-10-14 (question card on JSM-68): one site card in the style of the covers for the pages that are not project pages; each project page uses its own cover; `@astrojs/sitemap`; allow every crawler; Person data on the home page only, as `WebSite` plus `Person`; name, site, job title, country, LinkedIn and GitHub; one priority image per page; register with Google Search Console after shipping; prove the preview on LinkedIn Post Inspector plus one message app; no References section; search for Agent Skills for the new package.

## Options considered

The main decision is how share images are made on a site with no server. The smaller choices (sitemap tool, crawler policy, where the Person data goes, eager loading) were each asked separately; their alternatives are summarised after the options.

### Option 1: Astro's image step, the cover or one committed site card

Each page's share image comes from an image already in the repository: the project cover, or one hand drawn site card. `getImage` from `astro:assets` (sharp, already installed) resizes it to a 1200 by 630 JPEG during the build.

**Pros**:
- No new package and no new build step; the same pipeline already resizes covers.
- Project previews show the project itself, which is the most persuasive thing the site has.
- The site card can match the covers exactly, because it is drawn the same way.

**Cons**:
- The site card is a static picture: its words can drift from `HOME.heading`.
- Home, work, about and contact share one picture.

### Option 2: A card per page generated at build time

A build step draws each page's title onto a card (Satori to turn markup into SVG, resvg to turn that into PNG), run in Node during `astro build`.

**Pros**:
- Every preview differs and always matches the page title.
- No hand drawn image to keep in step.

**Cons**:
- Two new packages and a font loading step (Satori needs the font files passed in), for four pages.
- A second image pipeline beside Astro's, with its own failure modes on Workers Builds.
- Project pages would either lose their cover or need a composite design.

### Option 3: A card you design and supply

Same mechanics as Option 1, but the board provides the site card file.

**Pros**:
- You control the look completely.

**Cons**:
- The build waits on you, and the card may not match the covers' style.

### Option 4: A photo of you

A portrait as the site image.

**Pros**:
- More personal, and a face is recognisable in a feed.

**Cons**:
- There is no portrait yet, and a photo says nothing about what you do.

### Alternatives for the smaller choices

- **Sitemap**: a hand written `sitemap.xml` endpoint (no package, but every new page must be listed by hand, and forgetting is silent) versus `@astrojs/sitemap` (finds every built page, one small official package).
- **Crawlers**: block training only crawlers, or all AI crawlers, versus allow all. The site's job is to be found, all its content is public, and AI assistants increasingly answer hiring questions.
- **Person data**: on every page (repetition with no gain), or home plus a `ProfilePage` on About (a second block to keep in step), versus home only.
- **Eager loading**: the whole first row of cards (phones fetch covers they do not show), or only the project page cover (home and work keep their first cover slow), versus one priority image per page.

## Rationale

Option 1 wins because it uses only what the site already has. The covers are already the share card shape and already go through Astro's image step, so the cost of a per project share image is one prop. The pages that are not project pages are few and similar (home, work, about, contact), so a card per page buys little difference for two packages and a second image pipeline; a single site card drawn the same way as the covers keeps the feed consistent and adds nothing to maintain beyond one image. Everything happens at build time, so the zero cost, no adapter rule of spec 0001 holds.

The share image goes through `BaseLayout` with the site card as the default, rather than each page choosing its own, because then a new page can never ship without an image. JPEG at quality 80 keeps each image well under the size some message apps refuse to preview, and the explicit background stops a transparent cover turning black. Absolute addresses are required because crawlers do not resolve relative `og:image` values.

For the sitemap, the official integration fits the skateboard approach: the next page (the blog) appears in it with no code change, whereas a hand kept list fails silently. `robots.txt` is an endpoint rather than a file in `public/` so the origin is written once, in `astro.config.mjs`. The Person data sits on the home page because that is where search engines look for a personal site's owner, and keeping it to facts already on the site means it can never say more than you have chosen to publish. A JSON data block was required by the brief because a future Content Security Policy never blocks it. One priority image per page gives the largest image a head start without making phones download covers they do not show; the earlier choice to keep every cover lazy (spec 0004) is replaced now that the project page has a large cover near the top.

The 404 page gets `noindex` and no canonical link because its address is whatever was mistyped; a canonical there would point search engines at a page that does not exist.
