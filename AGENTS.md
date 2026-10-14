# og-website

The personal site of Toyin Ogunseinde. Scope: `docs/scope/scope.md`.

## Stack

- **Language / Runtime**: TypeScript strict (`astro/tsconfigs/strict`), Node 24 LTS pinned in `.nvmrc`
- **Framework**: Astro 7, fully pre rendered static output, no adapter
- **Key dependencies**: Tailwind CSS 4 (via `@tailwindcss/vite`), Astro content collections (Markdown in the repo), Astro image handling, `@astrojs/sitemap` (spec 0007)
- **Hosting**: Cloudflare Workers static assets (`wrangler.jsonc`, `assets.directory: ./dist`), deployed by Workers Builds on push to `main`, served at `https://toyintest.org`
- **Package manager**: npm (`package-lock.json` is committed; install with `npm ci`)

## Build approach

**Skateboard**: ship the thinnest usable whole site, then grow it.

## Commands

```bash
npm ci                # Install
npm run dev           # Dev server (agents: `astro dev --background`, see Development below)
npm run build         # astro check and the Worker type check (`tsc -p worker`), then astro build into dist/
npm run build:local   # build with Turnstile's test site key, for `npx wrangler dev` (see worker/AGENTS.md)
npm test              # Vitest unit and contract tests
npm run test:build    # Vitest against dist/ (`tests/build/`); run `npm run build` first
npm run test:e2e      # Playwright against the production build (desktop and mobile widths)
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title/index.md`, with `rationale.md` and `verify.md` beside it.

## Rules

- Functional style: pure functions by default, data in and HTML out. No classes where a plain function works, and no shared mutable state (module level values are constants only).
- Data is immutable: `const`, `readonly` props and arrays, never mutate in place. Prefer `map`, `filter`, `reduce` where it reads better than a loop.
- Side effects (file reads, network, the contact form Worker's fetch, clock and log, wired in `worker/index.ts`) live at the edges, never inside helpers or components. Expected failures are explicit return values, not thrown exceptions.
- Astro folder convention in `src/`: `pages/` (routes only), `layouts/`, `components/`, `content/`, `lib/` (pure TypeScript helpers), `styles/`.
- Design system: build all UI to `design.md` (the quiet editorial look from spec 0003, its rules and tokens); token values live in CSS.
- `src/dev/` holds dev server only pages (the style guide at `/styleguide`, injected in `astro.config.mjs` when `command === 'dev'`); the static build never emits them (spec 0003).
- Keep every page pre rendered. Never add `@astrojs/cloudflare` or on demand rendering: it turns free static requests into metered Worker invocations (spec 0001).
- Worker script (spec 0006): the one piece of server code lives in `worker/` and runs only for `/api/*` (`assets.run_worker_first` in `wrangler.jsonc`); every page stays a free static asset. Its rules are in `worker/AGENTS.md`.
- Projects (spec 0002): one folder per project at `src/content/projects/<slug>/index.md`, written to `docs/specs/0002-content-model/authoring.md`; the build fails on any rule break. Pages get entries from `getCollection('projects')`, then filter and sort only through the helpers in `src/lib/projects.ts` (`visibleProjects` with `includeDrafts: import.meta.env.DEV`, `sortProjects`, `featuredProjects`), never on their own.
- Project pages (feature 9): `src/pages/projects/[slug].astro` builds one page per visible project, the one full view of a project outside `ProjectCard`. Link to it only through `projectPath(id)` in `src/lib/projects.ts`.
- Bio: `src/content/bio.md`, plain Markdown with no frontmatter, outside any content collection. Pages that show the bio import it from there rather than copying the text.
- Resume (feature 10): the CV is a cleaned PDF at `public/toyin-ogunseinde-cv.pdf` (`RESUME_PATH` in `src/lib/about.ts`), with no phone number or street address, since the repository is public. The About page shows its download button only while that file exists, so adding or removing it needs no code change.
- Call to action (spec 0004): `SITE.contact` in `src/lib/site.ts` is the one contact target, and every page shows it only through `CallToAction`, now `/contact` (feature 11, spec 0006), so repointing it stays a one line change.
- Page building blocks (spec 0004): a page opens with `PageIntro` (its one `<h1>`), shows projects only through `ProjectCard` (the Services page's "Seen in" name links in `OfferList`, spec 0008, and a quote's `On <project>` link in `Testimonials`, spec 0009, are the exceptions), and passes its own `title` and `description` to `BaseLayout`, which builds the share tags from them.
- Page words (spec 0004, spec 0005): each page keeps every word in one constant in its own `src/lib/<page>.ts` (`HOME`, `WORK`, `PROJECT_PAGE` in `project-page.ts`, `ABOUT`, `CONTACT`, `NOT_FOUND` in `not-found.ts`, `SERVICES_PAGE` in `services.ts`), held to its length limits by the test beside it.
- Search metadata (spec 0007): `BaseLayout` writes every share and search tag. A page only passes `image` (a project page passes its cover; every other page gets the site card `src/assets/share/site-card.png`), `noindex` (the 404 page) or `structuredData` (the Person data on the home page). Share image options, alt text, JSON-LD and the `robots.txt` body live in `src/lib/seo.ts`, and `@astrojs/sitemap` lists every page but the 404 with no extra step. Only the first cover on a page gets `priority` on `ProjectCard`.
- Addresses never end in a slash (spec 0005): `trailingSlash: 'never'` in `astro.config.mjs` and `html_handling: drop-trailing-slash` in `wrangler.jsonc`, so internal `href`s are written as `/projects`, never `/projects/` (that one costs a redirect).
- New tags: add the value to `STACK` or `SERVICES` in `src/lib/vocabulary.ts` before an entry uses it; an unknown tag fails the build. A new `SERVICES` key also goes into exactly one offer in `SERVICES_PAGE.offers` (`src/lib/services.ts`), or the tests fail (spec 0008).
- Services page (spec 0008): each offer's "Seen in" projects come only from `offerProof` in `src/lib/services.ts`, given the `sortProjects(visibleProjects(...))` list, so a write up shows under an offer through its `services` tags with no extra step and drafts stay out of production.
- Testimonials (spec 0009): one YAML file per quote at `src/content/testimonials/<id>.yaml`, written to `docs/specs/0009-testimonials/authoring.md`, committed only once the person's yes is recorded in `permission` (date and channel, never rendered). The build fails on a missing `permission`, an unknown `project` id, a shared `order` or an email address or phone number in the text. Pages pick quotes only through `sortTestimonials`, `homeTestimonials` and `testimonialsFor` in `src/lib/testimonials.ts` and render them only through `testimonialView` and `Testimonials`, which shows nothing when there are no quotes.
- Naming: PascalCase `.astro` components, kebab case routes and content files, camelCase functions and variables.
- Documented public APIs: a doc comment on every exported helper and on each component's `Props` interface.
- Tests: Vitest beside the source as `*.test.ts` (except `src/pages/`, whose tests go in `tests/`); browser flows in `e2e/` as `*.spec.ts`. New logic ships with tests. See `test-preferences.json`.
- Conventional commit messages (`feat(scope):`, `fix(scope):`, `docs(scope):`, `test(scope):`, `chore(scope):`).

## Tooling

Chosen by `/audit`, installed by `/develop tooling`:

- Lint: ESLint flat config with `typescript-eslint`, `eslint-plugin-astro` and `eslint-plugin-jsx-a11y`.
- Format: Prettier with `prettier-plugin-astro` and `prettier-plugin-tailwindcss`.
- Before each commit: lint and format the staged files, plus `astro check`.
- CI: GitHub Actions on push and pull request running lint, the format check, `npm run check` (`astro check` plus `tsc -p worker`), `npx wrangler types worker/worker-configuration.d.ts --check`, Vitest, the build and the build tests. Workers Builds separately gates every deploy of `main` on `astro check && astro build`.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

Imported under Paperclip Skills and attached to the Engineer (JSM-55): `cloudflare/skills` wrangler, `cloudflare/skills` workers-best-practices (spec 0001), `cloudflare/skills` cloudflare-email-service (spec 0006).
Imported and attached to the Engineer (JSM-68): `jdevalk/skills` astro-seo (spec 0007).
Declined: `astrolicious/agent-skills` astro, `wshobson/agents` tailwind-design-system, `morinokami/astro-mcp`, a Tailwind utilities MCP server, `secondsky/claude-skills` cloudflare-workers-security, `secondsky/claude-skills` cloudflare-cron-triggers, `cloudflare/skills` turnstile-spin (Paperclip refuses skills that ship scripts; skipped on JSM-55, the Turnstile check is already built), `fabiensalles/claude-marketplace` astro-sitemap, `kostja94/marketing-skills` open-graph, `aaron-he-zhu/aaron-marketing-skills` serp-markup-builder, `soborbo/claudeskills` astro-seo, the seo-mcp and OpenGraph.io MCP servers (spec 0007)
MCP servers: Cloudflare documentation (connected), Astro documentation (recommended)

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->
- [worker/AGENTS.md](worker/AGENTS.md): the contact form Worker for `/api/*`, its bindings, secrets, tests and local proof (spec 0006)

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
