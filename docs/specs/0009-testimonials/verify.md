# Verify: testimonials · spec 0009 · updated 2026-10-14
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
## UI / manual
- [x] Build with no quotes, open `/` and each `/projects/<id>` → no `id="testimonials"`, no heading, no blockquote outside Prose, section order unchanged → AC-11
- [x] Build with four fixture quotes (not committed), open `/` → three figures after Selected work and before About, the fourth cut, project lines `On <title>` link to `/projects/<id>` → AC-9
- [x] Same build, open the page of the project two quotes point at → both quotes, in order, no project line → AC-10
- [x] One quote then several → `text-2xl` for one, `text-xl` for several, name link only with `profileUrl` → AC-7, AC-8
- [x] axe (WCAG 2.2 AA, light and dark), no sideways scroll from 320 to 1440, link targets at least 24px, one `<h1>`, no `<h3>` in the section → AC-15
- [x] Fixture build: no permission date or channel in any file under `dist/`, no JSON-LD change → AC-13, AC-14
- [x] Fixture with a bad file name, unknown project, phone number, shared order or bad date → build stops, one error lists each problem as `<file>: <rule>: <message>` → AC-3, AC-4, AC-5
- [ ] A real quote with a recorded yes is merged and shows on https://toyintest.org → AC-18
## Commands
- [x] `npm test` → pass → AC-2 to AC-8, AC-12, AC-16, AC-17
- [x] `npm run build && npm run test:build` → pass → AC-11
- [x] `npm run test:e2e` → pass → AC-15
## Acceptance-criteria coverage
- AC-1 to AC-17 covered above · AC-18 owed by the board (first real quote)
