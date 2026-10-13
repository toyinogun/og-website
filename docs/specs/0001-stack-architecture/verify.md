# Verify: Stack & architecture (scaffold) · spec 0001 · updated 2026-10-13

_Spec 0001 is a decision spec, so it carries no numbered acceptance criteria. The AC numbers below are derived from the scope's **Done when** for feature 1 plus the spec's `## Build and deployment contract` and `## Domain attachment` rows, and they cover the scaffold sub task only. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [ ] `npm ci` → installs from `package-lock.json` with no resolution step and no error → AC-6
- [ ] `npm run build` → `astro check` reports 0 errors, then the build prints `output: "static"` and `mode: "static"` and completes → AC-2, AC-3
- [ ] `npx astro check` on its own → 0 errors, 0 warnings → AC-2
- [ ] `ls dist` after a build → `index.html`, `favicon.ico`, `favicon.svg` and a hashed file under `dist/_astro/` → AC-2
- [ ] `test ! -e dist/_worker.js` → true, there is no Worker bundle, so requests stay free static asset requests → AC-3
- [ ] `grep -r "@astrojs/cloudflare" package.json astro.config.mjs` → no match, the adapter is deliberately absent → AC-3
- [ ] `npx wrangler deploy --dry-run` → reads the files from `./dist`, reports `No bindings found`, and exits without deploying → AC-4
- [ ] `grep canonical dist/index.html` → `https://toyintest.org/`, which proves Astro's `site` is set → AC-5
- [ ] `cat .nvmrc` → the Node LTS pinned at scaffold time (`24.21.0`), matching `node --version` → AC-7
- [ ] `grep -o "tailwindcss v[0-9.]*" dist/_astro/*.css` → a Tailwind version banner, so the stylesheet really compiled → AC-8

## UI / manual

- [ ] `npx astro dev --background`, then open `http://localhost:4321/` → HTTP 200, the page titled `Toyin Ogunseinde` renders, no console error → AC-1
- [ ] While the dev server runs, edit the heading in `src/pages/index.astro` → the browser updates without a manual reload → AC-1
- [ ] `npx astro dev stop` → the server stops cleanly → AC-1
- [ ] Open `dist/index.html` in a browser after a build → the same page renders from the built files alone → AC-2, AC-3

## Acceptance-criteria coverage

- AC-1 the scaffold boots locally · covered by the three dev server steps
- AC-2 the production build passes, with the type check as a real gate · covered by `npm run build`, `astro check`, `ls dist`
- AC-3 the output is purely static, with no adapter and no Worker script · covered by the `_worker.js`, adapter grep and static mode steps
- AC-4 the Wrangler config carries the decided Worker name, scaffold compatibility date and `./dist` assets pointer · covered by the dry run step
- AC-5 Astro's `site` is `https://toyintest.org` · covered by the canonical URL step
- AC-6 the install is reproducible from the committed lockfile · covered by `npm ci`
- AC-7 the Node version is pinned at scaffold time · covered by the `.nvmrc` step
- AC-8 Tailwind is wired in and compiles · covered by the CSS banner step
- **Not covered here**: the scope's fourth Done when clause, that the hosting choice is confirmed to cost nothing. It is a Cloudflare dashboard read, not a build check, and it has its own scope box plus the spec's `## Follow-up`.
- **Not covered here**: the Workers Builds project settings (install, build and deploy commands, Node version) and the custom domain attachment. Both are account level authorization actions the spec assigns to you, not build steps.
