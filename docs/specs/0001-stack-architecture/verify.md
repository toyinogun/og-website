# Verify: Stack & architecture (scaffold) · spec 0001 · updated 2026-10-13

_Spec 0001 is a decision spec, so it carries no numbered acceptance criteria. The AC numbers below are derived from the scope's **Done when** for feature 1 plus the spec's `## Build and deployment contract` and `## Domain attachment` rows, and they cover the scaffold sub task only. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [x] `npm ci` → installs from `package-lock.json` with no resolution step and no error → AC-6
- [x] `npm run build` → `astro check` reports 0 errors, then the build prints `output: "static"` and `mode: "static"` and completes → AC-2, AC-3
- [x] `npx astro check` on its own → 0 errors, 0 warnings → AC-2
- [x] `ls dist` after a build → `index.html`, `favicon.ico`, `favicon.svg` and a hashed file under `dist/_astro/` → AC-2
- [x] `test ! -e dist/_worker.js` → true, there is no Worker bundle, so requests stay free static asset requests → AC-3
- [x] `grep -r "@astrojs/cloudflare" package.json astro.config.mjs` → no match, the adapter is deliberately absent → AC-3
- [x] `npx wrangler deploy --dry-run` → reads the files from `./dist`, reports `No bindings found`, and exits without deploying → AC-4
- [x] `grep canonical dist/index.html` → `https://toyintest.org/`, which proves Astro's `site` is set → AC-5
- [x] `cat .nvmrc` → the Node LTS pinned at scaffold time (`24.21.0`), matching `node --version` → AC-7
- [x] `grep -o "tailwindcss v[0-9.]*" dist/_astro/*.css` → a Tailwind version banner, so the stylesheet really compiled → AC-8

## UI / manual

- [x] `npx astro dev --background`, then open `http://localhost:4321/` → HTTP 200, the page titled `Toyin Ogunseinde` renders, no console error → AC-1
- [x] While the dev server runs, edit the heading in `src/pages/index.astro` → the browser updates without a manual reload → AC-1
- [x] `npx astro dev stop` → the server stops cleanly → AC-1
- [x] Open `dist/index.html` in a browser after a build → the same page renders from the built files alone → AC-2, AC-3

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

# Verify: Live on your domain (feature 5) · spec 0001 · updated 2026-10-13

_Spec 0001 carries no numbered acceptance criteria for this feature, so these AC numbers come from the scope's **Done when** for feature 5 plus the spec's `## Deployment identity` and `## Domain attachment` rows. They need the Cloudflare dashboard steps done and the branch merged into `main` first. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [x] `curl -sI https://toyintest.org/` → `HTTP/2 200`, `server: cloudflare`, served over a valid certificate → AC-1
- [x] `curl -s https://toyintest.org/ | grep -o '<title>[^<]*'` → `<title>Toyin Ogunseinde` → AC-1
- [x] `curl -s https://toyintest.org/ | grep -o 'rel="canonical" href="[^"]*'` → `https://toyintest.org/` → AC-1
- [x] `curl -sI http://toyintest.org/` → a redirect to `https://toyintest.org/` → AC-1
- [ ] `curl -sI 'https://www.toyintest.org/some/path?x=1'` → `301` with `location: https://toyintest.org/some/path?x=1` → AC-4
- [x] Push a small visible change to `main` → a new Workers Builds run starts, passes `astro check` and `astro build`, runs `wrangler deploy`, and the change shows on `https://toyintest.org/` within minutes → AC-2 (2026-10-13: the second push was the docs only merge `3025a1f`, so nothing visible changed; proven by a green `Workers Builds: og-website` check and a new deployed version `c65d6815`)
- [x] After that second deploy, `toyintest.org` is still listed as a Custom Domain on the `og-website` Worker and still serves → AC-2 (2026-10-13: still serves HTTP 200 after the redeploy; the dashboard listing itself was not read)
- [ ] Push a commit that fails `astro check` on a throwaway branch merged nowhere, or read the build log of a failed build if one occurs → the build stops before deploy, and the live site keeps serving the last good version → AC-2
- [ ] Workers Builds settings for `og-website` → Git repository `toyinogun/og-website`, production branch `main`, Worker name `og-website`, deploy command `npx wrangler deploy`, Node `24.21.0` picked up from `.nvmrc` (shown in the build log) → AC-2

## UI / manual

- [x] Open `https://toyintest.org/` on a desktop and a phone → the holding page renders with no browser security warning and no console error → AC-1
- [x] Cloudflare dashboard, Billing and Workers plan pages → the account is on the free plan, no paid add on is active, and Workers Builds usage sits within the free allowance → AC-3 (read by you from the dashboard, 2026-10-13: free plan, no add ons, 0 build minutes used)

## Acceptance-criteria coverage

- AC-1 a real page is reachable on `toyintest.org` over HTTPS · covered by the four `curl` steps on the apex and the browser step
- AC-2 a push rebuilds and redeploys it · covered by the push, the custom domain survival step, the failed build step and the settings step
- AC-3 the running cost is still zero · covered by the dashboard billing step
- AC-4 `www` lands on the apex with path and query kept (spec 0001, Domain attachment) · covered by the `www` redirect step
