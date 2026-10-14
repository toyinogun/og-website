# Verify: Contact form · spec 0006 · updated 2026-10-14
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Local proof setup (you may run it yourself): copy `.dev.vars.example` to `.dev.vars`, then `npm run build:local && npx wrangler dev --test-scheduled`, and open `http://localhost:8787/contact`.

## UI / manual
- [x] Open `/contact` → one `h1` "Send me a message", the lead, the form, the privacy note under it and the "Prefer LinkedIn?" line; no "Send me a message" button in `main` → AC-1, AC-22
- [x] Open `/`, `/projects`, a project page and `/about` → every closing button reads "Send me a message" and opens `/contact`; the nav shows Home, Work, About, Contact, with Contact current only on `/contact` → AC-4
- [x] Press Send with everything empty → nothing is sent, the status area takes focus and lists four links (name, email, topic, message) in that order; each field shows its error and `aria-invalid="true"`; typing in a field clears its error → AC-6
- [x] Activate the topic link in the summary → focus lands on the first radio → AC-6
- [ ] Fill the form by keyboard alone (Tab, arrow keys between the radios, Enter on Send) on `wrangler dev` → the status area says "Thanks, I have your message. I usually reply within two working days." in a `role="status"` region, takes focus, and the fields clear → AC-7, AC-8, AC-23
- [x] While the send is in flight → the button reads "Sending…" with `aria-busy="true"`, the fields are read only, the radios disabled; a second press sends nothing → AC-7
- [x] Type 4,500 characters in the message → "500 characters left" appears under it → AC-3
- [ ] At 320 px wide → the Turnstile widget renders `compact`; at 768 px `flexible`; no sideways scroll → AC-11, AC-23
- [ ] With the site key `3x00000000000000000000FF` (forces a challenge), complete the challenge by keyboard and with a screen reader, then send → the challenge is reachable and announced, and the send succeeds (a person must do this by hand) → AC-23
- [ ] With JavaScript off → the noscript line with the LinkedIn link shows above the form → AC-24

## Commands
- [x] `npm run check` → `astro check` and `tsc -p worker` both pass with 0 errors → AC-20
- [x] `npx wrangler types worker/worker-configuration.d.ts --check` → exit 0 (types match `wrangler.jsonc`) → AC-20
- [x] `npm test` → all unit, contract and Worker tests pass (validation table, exit table, delivery outcomes, weekly check) → AC-2, AC-5, AC-9 to AC-18, AC-21
- [x] `npm run build && npm run test:build` → contact build test passes: head tags, one bundled module script, Turnstile only in the form bundle, no `1x`, `2x` or `3x` test key anywhere in `dist/` → AC-2, AC-19, AC-24
- [x] `npm run test:e2e` → `e2e/contact.spec.ts` and the shared width, axe and target size sweeps with `/contact` pass on desktop and mobile → AC-3, AC-6 to AC-8, AC-11, AC-23
- [x] On `wrangler dev`: `curl -i http://localhost:8787/api/nope` → `404 {"ok":false,"error":"not_found"}`; `curl -i http://localhost:8787/api/contact` → `405` with `Allow: POST`; `curl -I http://localhost:8787/api/contact` → `405`, no body → AC-15
- [x] On `wrangler dev`: `curl -i -X POST -H 'Origin: https://evil.example' -d name=a http://localhost:8787/api/contact` → `403 forbidden` → AC-16
- [x] On `wrangler dev`: `curl -i -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:8787/api/contact` → `400 bad_request` → AC-16
- [x] On `wrangler dev`: a form post with a bad email and a short message → `422` with `fields` → AC-5
- [ ] On `wrangler dev`: a valid post with token `XXXX.DUMMY.TOKEN.XXXX` (the test secret accepts any token) → read the siteverify `hostname` and `action` from the Worker's answer and set `.dev.vars` `TURNSTILE_EXPECTED_HOSTNAME` to match; if the action does not come back as `contact`, stop and return to `/architect` → AC-10
- [ ] On `wrangler dev`: a valid post → `200 {"ok":true}`; the `send_email` simulation output shows from `form@toyintest.org`, reply to the sender, the subject `[toyintest.org] <topic>: <name>` and the body layout; `npx wrangler kv key list --binding CONTACT_OUTBOX --local` shows one `msg:<time>:<uuid>` key with `emailStatus` `sent` → AC-12, AC-13, AC-14
- [x] On `wrangler dev`: four valid posts within a minute from one address → the fourth answers `429 rate_limited` → AC-9
- [x] On `wrangler dev`: every request above prints exactly one `{"event":"contact",...}` line with no name, email, message or IP in it → AC-18
- [x] On `wrangler dev --test-scheduled`: `curl "http://localhost:8787/cdn-cgi/handler/scheduled"` → one weekly email in the simulation output listing the message, and one `{"event":"weekly_check",...}` line → AC-21
- [x] On `wrangler dev`: `curl -i http://localhost:8787/no-such-page` → the 404 page with status 404, and no `{"event":"contact"}` log line (the Worker did not run) → AC-20

## Value sourcing
- [ ] Words: change one `CONTACT` value, rebuild → the page and the form show the new words → AC-2
- [x] Topic choices: the three radios and the email subject label come from `TOPICS` → AC-3, AC-13
- [x] LinkedIn link: every LinkedIn link on `/contact` and in the footer is `LINKEDIN_URL` → AC-1, AC-4
- [x] Head tags: `<title>` is `CONTACT.title`, canonical `https://toyintest.org/contact` → AC-2
- [x] Limits: `maxlength` on the fields, the counter threshold and the timeouts match `CONTACT_LIMITS` → AC-3, AC-7
- [x] Site key: `npm run build` gives the production key, `npm run build:local` the `1x` test key, the dev server the test key → AC-19
- [x] Turnstile size: measured from the container width, flexible from 300 px → AC-11
- [x] Status message: comes from `clientOutcome(status, body)`; a `200` with `ok: false` shows "could not confirm" → AC-8
- [x] Field errors after a 422: from the response `fields` through `fieldErrorMessage` → AC-8
- [x] Allowed origins: `ALLOWED_ORIGINS` var; `http://localhost:8787` passes locally, a foreign origin gets 403 → AC-16
- [x] Rate limit key and `remoteip`: `CF-Connecting-IP`; two addresses get separate limits → AC-9, AC-10
- [x] Limit and window: 3 per 60 s from `ratelimits` in `wrangler.jsonc` → AC-9
- [x] Expected hostname: `TURNSTILE_EXPECTED_HOSTNAME`; a mismatch answers 403 verification → AC-10
- [x] `receivedAt`: taken once on arrival; the outbox key, the record and the email "Received:" line all carry the same time → AC-12, AC-13
- [x] Outbox key and expiry: `msg:<receivedAt>:<uuid>`, 30 days → AC-12
- [x] Recipient: `CONTACT_TO` secret; sender `form@toyintest.org`; reply to the sender → AC-13
- [x] Weekly schedule `0 8 * * 1`; messages of the week from the outbox metadata → AC-21
- [x] Alarm: success pings `HEALTHCHECK_URL`, failure pings `HEALTHCHECK_URL/fail` → AC-21
- [x] Logs: outcome and reason only from the Exit table → AC-18

## After deploy (the ship issue, not this build)
- [ ] Send one real message → it arrives in your inbox and appears in KV; page and unknown path visits add no Worker invocations → AC-12, AC-13, AC-14, AC-20
- [ ] The next Monday → the weekly email arrives and Healthchecks.io shows the ping → AC-21

## Acceptance-criteria coverage
- AC-1 UI 1, Value sourcing LinkedIn · AC-2 Commands npm test and build test, Value sourcing words and head tags · AC-3 UI counter, e2e, Value sourcing limits · AC-4 UI 2 · AC-5 Commands 422 · AC-6 UI 3 and 4 · AC-7 UI 5 and 6 · AC-8 UI 5, e2e, Value sourcing status · AC-9 Commands 429 · AC-10 Commands siteverify · AC-11 UI widths, e2e · AC-12 to AC-14 Commands valid post · AC-15 Commands routing · AC-16 Commands origin and content type · AC-17 npm test (body cap, shapes) · AC-18 Commands log lines · AC-19 build test, Value sourcing site key · AC-20 Commands check, types, 404 · AC-21 Commands cron · AC-22 UI 1 · AC-23 UI keyboard and the manual challenge, e2e · AC-24 UI noscript, build test
