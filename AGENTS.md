# og-website

The personal site of Toyin Ogunseinde. Scope: `docs/scope/scope.md`.

## Stack

- **Language / Runtime**: TypeScript strict (`astro/tsconfigs/strict`), Node 24 LTS pinned in `.nvmrc`
- **Framework**: Astro 7, fully pre rendered static output, no adapter
- **Key dependencies**: Tailwind CSS 4 (via `@tailwindcss/vite`), Astro content collections (Markdown in the repo), Astro image handling
- **Hosting**: Cloudflare Workers static assets (`wrangler.jsonc`, `assets.directory: ./dist`), deployed by Workers Builds on push to `main`, served at `https://toyintest.org`
- **Package manager**: npm (`package-lock.json` is committed; install with `npm ci`)

## Build approach

**Skateboard**: ship the thinnest usable whole site, then grow it.

## Commands

```bash
npm ci                # Install
npm run dev           # Dev server (agents: `astro dev --background`, see Development below)
npm run build         # astro check (type gate), then astro build into dist/
npm test              # Vitest unit and contract tests
npm run test:e2e      # Playwright against the production build (desktop and mobile widths)
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title/index.md`, with `rationale.md` and `verify.md` beside it.

## Rules

- Functional style: pure functions by default, data in and HTML out. No classes where a plain function works, and no shared mutable state (module level values are constants only).
- Data is immutable: `const`, `readonly` props and arrays, never mutate in place. Prefer `map`, `filter`, `reduce` where it reads better than a loop.
- Side effects (file reads, network, the future contact form handler) live at the edges, never inside helpers or components. Expected failures are explicit return values, not thrown exceptions.
- Astro folder convention in `src/`: `pages/` (routes only), `layouts/`, `components/`, `content/`, `lib/` (pure TypeScript helpers), `styles/`.
- Keep every page pre rendered. Never add `@astrojs/cloudflare` or on demand rendering: it turns free static requests into metered Worker invocations (spec 0001).
- Naming: PascalCase `.astro` components, kebab case routes and content files, camelCase functions and variables.
- Documented public APIs: a doc comment on every exported helper and on each component's `Props` interface.
- Tests: Vitest beside the source as `*.test.ts` (except `src/pages/`, whose tests go in `tests/`); browser flows in `e2e/` as `*.spec.ts`. New logic ships with tests. See `test-preferences.json`.
- Conventional commit messages (`feat(scope):`, `fix(scope):`, `docs(scope):`, `test(scope):`, `chore(scope):`).

## Tooling

Chosen by `/audit`, installed by `/develop tooling` (not installed yet):

- Lint: ESLint flat config with `typescript-eslint`, `eslint-plugin-astro` and `eslint-plugin-jsx-a11y`.
- Format: Prettier with `prettier-plugin-astro` and `prettier-plugin-tailwindcss`.
- Before each commit: lint and format the staged files, plus `astro check`.
- CI: GitHub Actions on push and pull request running lint, `astro check` and Vitest. Workers Builds separately gates every deploy of `main` on `astro check && astro build`.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

Adopted in spec 0001, waiting for import under Paperclip Skills, Sources: `cloudflare/skills` wrangler, `cloudflare/skills` workers-best-practices.
Declined: `astrolicious/agent-skills` astro, `wshobson/agents` tailwind-design-system, `morinokami/astro-mcp`, a Tailwind utilities MCP server
MCP servers: Cloudflare documentation (connected), Astro documentation (recommended)

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

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
