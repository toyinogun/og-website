# 0006. Contact form

**Date**: 2026-10-14
**Status**: In Progress

## Summary

A new `/contact` page lets a visitor send you a message without leaving the site. The page stays a plain pre built file; only the send goes to a small piece of server code (a Worker script) that runs for `/api/*` and nothing else, so the rest of the site stays free. That code checks the message, stops spam with Cloudflare Turnstile (a free bot check most people never see) and a limit of 3 sends a minute, saves a copy for 30 days in Cloudflare's free key value store (KV), then emails it to your inbox through Cloudflare, free. The sender always sees an honest result, a failure keeps their text, a short privacy note sits under the form, every request is logged without personal data, and an outside alarm (Healthchecks.io) emails you if the weekly self check stops arriving or a send fails.

## Requirements

**User stories**:
- As a hiring reader or a client reader, I want to write to you from the site in under a minute, so that starting a conversation needs no other app.
- As a sender, I want an honest answer about whether my message arrived, so that I never wonder if it was lost.
- As a sender whose message did not go through, I want my text kept and another way to reach you, so that I do not lose what I wrote.
- As a keyboard or screen reader user, I want every field, error and result to be reachable and announced, so that the form works for me (WCAG 2.2 AA, spec 0003).
- As a sender, I want to know what happens to my name, email and message, so that I can trust the form.
- As the site owner, I want every message in my inbox with a reply address set, a 30 day copy I can recover from, spam kept out, and an alarm that does not depend on the broken part, so that a broken form never costs me work silently.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

*The page*
- **AC-1**: `src/pages/contact.astro` builds `dist/contact/index.html`. Inside `<main>`, one `Container width="measure"` holds, top to bottom: `PageIntro size="page"` with `heading={CONTACT.heading}` (the page's only `<h1>`) and `lead={CONTACT.lead}`; a `Section` without a heading holding `ContactForm`, then a `<p>` with `CONTACT.privacyNote` (AC-22), then a `<p>` with `CONTACT.linkedinText`, a space, and a link to `LINKEDIN_URL` whose text is `CONTACT.linkedinLink`. The page has no `CallToAction` and no primary `Button` besides the form's submit button.
- **AC-2**: All words on the page and in the form live in the `CONTACT` constant in `src/lib/contact.ts`, starting from the draft copy in *Feature design*. A Vitest test checks, after trimming, that every value is non empty and within its limit: `title` at most 60 characters, `description` 50 to 160, `heading` at most 60, `lead` at most 160, every label, legend, hint, button text, `errorPrefix`, `linkedinText`, `linkedinLink` and `charactersLeft` at most 40, every error, result and `noScript` message at most 200, `privacyNote` at most 600. `sent` contains `two working days`. The page `<title>` is `CONTACT.title` and its meta description `CONTACT.description`, passed to `BaseLayout` (spec 0004 share tags; canonical `https://toyintest.org/contact`).
- **AC-3**: The form (`<form id="contact-form" action="/api/contact" method="post" novalidate>`) holds, in this order: a text input `name` (label `CONTACT.nameLabel`, `autocomplete="name"`, `required`, `maxlength="100"`); an email input `email` (label `CONTACT.emailLabel`, `autocomplete="email"`, `required`, `maxlength="254"`); a `<fieldset>` with `<legend>` `CONTACT.topicLegend` and three radio inputs named `topic` with values `role`, `project`, `other` and the labels from `TOPICS`, none checked, each `required`; a `<textarea name="message">` (label `CONTACT.messageLabel`, hint `CONTACT.messageHint` tied by `aria-describedby`, `required`, `maxlength="5000"`, `rows="8"`); the Turnstile container; and a submit `Button type="submit"` with `CONTACT.submitLabel`. There is no hidden trap field. Every input has a visible `<label>` tied by `for` and `id`; each radio's whole label row is its target and is at least `2.75rem` tall; every other control is at least 24 by 24 CSS pixels.
- **AC-4**: `SITE.contact` in `src/lib/site.ts` is `{ label: 'Send me a message', href: '/contact' }`, so every `CallToAction` (home, work listing, project pages, about) opens `/contact`. `SITE.nav` is Home `/`, Work `/projects`, About `/about`, Contact `/contact`, in that order; Contact carries `aria-current="page"` on `/contact` only. The closing words on the other pages stay as they are (`HOME`, `WORK`, `PROJECT_PAGE`, `ABOUT` `closingText`). `LINKEDIN_URL` is exported from `site.ts`, and the footer still links LinkedIn and GitHub.

*Validation*
- **AC-5**: `validateContact(fields)` in `src/lib/contact.ts` is pure and shared by the browser and the Worker, and follows the *Validation rules* table exactly: trimming, lengths in UTF-16 code units (the unit `maxlength` uses), the control character rule, the email pattern, the error precedence and the codes. It returns `{ ok: true, value: ContactMessage }` or `{ ok: false, errors: FieldErrors }`, never throws, and never changes its input.
- **AC-6**: In the browser, pressing Send runs `validateContact` first. If anything is wrong, nothing is sent: each bad field gets `aria-invalid="true"` and its error text (`CONTACT.errorPrefix` in a visually hidden span, then the message from `fieldErrorMessage`) tied by `aria-describedby`; the status area shows `CONTACT.errorSummary` and a list of links, one per bad field in form order (name, email, topic, message), each link's text being that field's error message; activating a link focuses the field (the first radio for the topic). Focus moves to the status area. A field's error and `aria-invalid` clear as soon as that field changes. Errors are shown in text and weight, never by colour alone.

*Sending and every outcome*
- **AC-7**: A valid form is sent with `fetch` as `FormData` to `POST /api/contact` with `Accept: application/json`, only when the Turnstile state is `verified` (AC-11). While in flight: the submit button reads `CONTACT.sendingLabel` and carries `aria-busy="true"`, every field is `readonly` (radios `disabled`) so the text that was sent is the text on screen, and a second press sends nothing. The request is aborted after 15 seconds; a reply that arrives after the abort is ignored. Afterwards the fields are editable again.
- **AC-8**: The browser decides the outcome from the HTTP status and the JSON body together, per the *Client outcome table*. Exactly one of these appears in the status area, and focus moves to it:
  - **sent** (`200` and `{ ok: true }`): `CONTACT.sent` ("Thanks, I have your message. I usually reply within two working days."), in a `role="status"` region; the fields clear and the Turnstile widget resets.
  - **fix fields** (`422` with a valid `fields` object): as AC-6, using the response codes; an unknown field or code shows `CONTACT.errors.fieldFallback` on that field, or `CONTACT.errors.notSent` if no known field is named.
  - **wait** (`429` `rate_limited`): `CONTACT.errors.rateLimited`.
  - **check again** (`403` `verification`): `CONTACT.errors.verification`, and the widget resets.
  - **not sent** (`400`, `403` `forbidden`, `404`, `405`, `502` `delivery`, `503` `unavailable`): `CONTACT.errors.notSent`, which says plainly the message did not send, the text is still there, and links LinkedIn.
  - **uncertain** (a network error, the 15 second abort, `500`, any body that is not JSON, or a status and body that disagree, such as `200` with `ok: false`): `CONTACT.errors.uncertain`, which says you could not confirm it was sent, the text is still there, that sending again may deliver it twice, and links LinkedIn.
  Every outcome except **sent** keeps the typed text and uses a `role="alert"` region. No outcome leaves the visitor without a message.

*Spam and abuse*
- **AC-9**: The Worker limits sends to 3 per 60 seconds per visitor with the `CONTACT_LIMITER` rate limit binding, keyed `contact:` plus the `CF-Connecting-IP` header (`contact:unknown` when absent), before validation and before Turnstile. Over the limit it answers `429 rate_limited`. If the limiter throws, it answers `503 unavailable` (fail closed). The spec accepts that this binding counts per Cloudflare location, so the cap is approximate, and that visitors behind one shared address share it.
- **AC-10**: The Worker verifies every token with `verifyTurnstile({ secret, token, remoteip, expectedHostname, expectedAction: 'contact' }, fetchImpl)`: one `POST` to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with an `application/x-www-form-urlencoded` body (`secret`, `response`, and `remoteip` only when `CF-Connecting-IP` is present), aborted after 5 seconds. It returns exactly one of `ok`, `rejected` (with reason `token_missing`, `token_rejected`, `action_mismatch` or `hostname_mismatch`), `secret_rejected` (error codes include `invalid-input-secret` or `missing-input-secret`) or `unreachable` (network error, timeout, non 2xx status, a body that is not JSON or lacks a boolean `success`, or error code `internal-error`). `ok` needs `success: true`, `action === 'contact'` and `hostname === TURNSTILE_EXPECTED_HOSTNAME`. A missing or over 2,048 character token is `rejected` without a call. The Worker maps `rejected` to `403 verification`, and `secret_rejected` and `unreachable` to `503 unavailable`.
- **AC-11**: Turnstile loads only on `/contact`, from `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, and renders explicitly into `#contact-turnstile` with `sitekey` from `turnstileSiteKey()` (AC-19), `action: 'contact'`, `appearance: 'interaction-only'` (managed mode: nothing shows unless Cloudflare needs the visitor to tick a box), `theme: 'auto'`, and `size: 'flexible'` when the container is at least 300 pixels wide, else `'compact'` (re-rendered at the other size if the width crosses 300 pixels while no token is held). The widget follows the *Turnstile states* table: Send with no token waits up to 10 seconds for one with the button busy; a widget that needs a tick shows `CONTACT.errors.checkPending`; a widget error is retried once with `turnstile.reset`, then, like a script that fails to load, shows `CONTACT.errors.checkFailed` with the LinkedIn link; an expired token resets the widget without a message.

*Delivery, the 30 day copy and the email*
- **AC-12**: After the checks pass, the Worker first writes the message to the `CONTACT_OUTBOX` KV namespace under the key `msg:<receivedAt ISO>:<random UUID>`, value the `OutboxRecord` JSON with `emailStatus: 'pending'`, metadata `{ receivedAt, topic, name, emailStatus }` (name cut to 100 characters), and `expirationTtl: 2592000` (30 days), so every copy deletes itself after 30 days. Then it sends the email. Then it writes the same key once more with `emailStatus` `sent` or `failed` (a failure of this second write is logged and changes nothing else). The value is never logged.
- **AC-13**: The email is sent with `env.EMAIL.send({ from: { email: 'form@toyintest.org', name: 'Contact form' }, to: CONTACT_TO, replyTo: { email, name }, subject, text })`, the structured form of the Email Service binding, so the platform encodes the headers. `subject` is `emailSubject(message)`: `[toyintest.org] <topic label>: <name>`. `text` is `emailBody(message, receivedAt, reference)`, UTF-8 plain text in the exact layout in *Feature design*. `receivedAt` is taken once, when the request arrives. Names with quotes, commas or non ASCII letters and multi line messages arrive intact (tests prove the object passed to `send`). The Worker never retries a send.
- **AC-14**: The response follows whether the copy was saved and whether the email was sent: saved and sent → `200 { ok: true }`, outcome `sent`; saved, email failed → `200 { ok: true }`, outcome `stored_only`, reason `email_failed`; not saved, sent → `200 { ok: true }`, outcome `sent`, reason `outbox_failed`; neither → `502 { ok: false, error: 'delivery' }`, outcome `delivery_failed`. Every case except the first also sends the Healthchecks failure signal (AC-21). A message is never reported to the sender as received unless at least one of the copy or the email succeeded.

*The Worker's contract*
- **AC-15**: The Worker routes by path first, then method: any path under `/api/` other than `/api/contact` → `404 not_found` for every method; `/api/contact` with a method other than `POST` → `405 method_not_allowed` with `Allow: POST` (a `HEAD` gets the same status and headers with no body). Every response is JSON (`Content-Type: application/json; charset=utf-8`) with `Cache-Control: no-store`, and every body is one of `ContactResponse`. Every exit is exactly one row of the *Exit table*, with its status, body, outcome, reason and log level.
- **AC-16**: Before any work the Worker checks, in order: the `Origin` header, when present, is one of the comma separated `ALLOWED_ORIGINS` var (production `https://toyintest.org`), else `403 forbidden` (an absent `Origin` is allowed; Origin is a browser abuse check, not authentication); `CONTACT_TO`, `TURNSTILE_SECRET_KEY`, `EMAIL`, `CONTACT_LIMITER` and `CONTACT_OUTBOX` are present, else `503 unavailable` with reason `config_missing`; the content type is `multipart/form-data` or `application/x-www-form-urlencoded`, else `400 bad_request`.
- **AC-17**: The Worker reads the body through a 32,768 byte cap whatever `Content-Length` says, and answers `400 bad_request` if the cap is passed, the body cannot be read or parsed, a known field (`name`, `email`, `topic`, `message`, `cf-turnstile-response`) appears more than once, or a known field is a file. Unknown fields are ignored. A missing known text field is treated as `''`.
- **AC-18**: Every handled request writes exactly one log line, from one place, `{"event":"contact","outcome":<outcome>,"reason":<reason or null>}`, with outcome and reason taken only from the *Exit table* (never raw error text). Rows marked `error` use `console.error`, the rest `console.log`. No log line ever holds the name, email, message, IP address, token or KV value. `observability.enabled` is `true` in `wrangler.jsonc`.

*Staying static, free and local*
- **AC-19**: `turnstileSiteKey()` in `src/lib/contact.ts` returns `import.meta.env.PUBLIC_TURNSTILE_SITE_KEY` when set, else Cloudflare's always pass test key `1x00000000000000000000AA` on the dev server, else the production `TURNSTILE_SITE_KEY` constant. `npm run build:local` builds with `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` for the `wrangler dev` proof. A build test fails if `dist/` from `npm run build` contains any key starting `1x`, `2x` or `3x` followed by zeros.
- **AC-20**: `wrangler.jsonc` adds `main: "./worker/index.ts"` and `assets.run_worker_first: ["/api/*"]`, keeping `not_found_handling` and `html_handling`, so a request for any page, image, font or unknown path never runs the Worker (unknown paths still get the 404 page with status 404). Astro still has no adapter and `output` stays static. `tests/stack-contract.test.ts` locks `main`, `run_worker_first` (exactly `["/api/*"]`), the `send_email`, `ratelimits`, `kv_namespaces`, `triggers.crons`, `vars` and `observability` entries, the new `build` script (`astro check && tsc -p worker && astro build`), and that no committed file holds a secret value: no email address except `form@toyintest.org` and `you@example.com` in `wrangler.jsonc`, `.dev.vars.example` or `worker/`, and `.dev.vars.example` holds only Cloudflare's documented test secret, `you@example.com` and a placeholder Healthchecks URL.

*Knowing it broke*
- **AC-21**: A Cron Trigger `0 8 * * 1` (Mondays 08:00 UTC) runs the Worker's `scheduled` handler, which: probes the Turnstile secret (`verifyTurnstile` with token `weekly-check`, mapped per the *Weekly check states* table); lists the outbox keys from the last 7 days with their metadata; sends one email through `EMAIL` to `CONTACT_TO` with the subject and body from `weeklyCheckSubject` and `weeklyCheckBody` (the UTC time, the Turnstile state in words, each message of the week with time, topic, name and email status, a clear line for any `failed` or `pending` one with the dashboard path to read it, and what a missing Monday email means); then requests `HEALTHCHECK_URL` if the email was sent and the Turnstile state is `ok`, else `HEALTHCHECK_URL` plus `/fail`; and writes one log line `{"event":"weekly_check","email":"sent"|"failed","turnstile":<state>,"messages":<count>|"unreadable","healthcheck":"pinged"|"failed"|"missing"}`, with `console.error` when anything is not fine. A request handler outcome marked *alarm* in the *Exit table* also requests `HEALTHCHECK_URL/fail` in `ctx.waitUntil`, sending no personal data. Healthchecks.io, outside Cloudflare, emails you when a Monday ping is late by more than 4 hours or a failure signal arrives. The spec claims only this much: the weekly check proves the email path, the Turnstile secret and the outbox, not the page or the widget.

*Privacy and accessibility*
- **AC-22**: Directly under the form the page shows `CONTACT.privacyNote`, which says in plain words: what is collected (name, email, topic, message); that it is used only to reply; that it is emailed to you and also kept on Cloudflare for 30 days as a backup, then deleted automatically; that the copy in your inbox stays until you delete it; that Cloudflare Turnstile checks for bots and receives the IP address, which the site also uses to limit repeated sends but does not store; that Cloudflare keeps short request logs for a few days; and how to ask about or delete what was sent (reply to your email, or LinkedIn).
- **AC-23**: `/contact` has exactly one `<h1>` and no skipped heading level. It passes the spec 0003 width sweep (no sideways scroll at 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels), and the spec 0003 `@axe-core/playwright` WCAG 2.2 AA scan reports zero violations in both themes at rest, showing field errors, and showing each outcome message (Turnstile stubbed). The whole form can be filled and sent by keyboard alone in the order name, email, topic radios (arrow keys), message, Send. `/contact` joins the shared width, axe and target size lists in `e2e/design-system.spec.ts`, and the header keyboard order and row checks cover four nav links. A real Turnstile challenge (test site key `3x00000000000000000000FF`, which forces one) is completed once by keyboard and screen reader by hand in `/check verify`, because a stub cannot prove the third party widget's accessibility.
- **AC-24**: Without JavaScript, a `<noscript>` paragraph above the form shows `CONTACT.noScript` with the LinkedIn link. The page's only outside requests are the Turnstile script and its frames; every other page keeps its spec 0003 script budget unchanged (`/contact` adds one bundled module script and the Turnstile script).

## Decision

**Chosen option**: Option 4: a Worker script inside the existing `og-website` Worker, run only for `/api/*`, that saves a 30 day copy of each message in KV and sends it through Cloudflare's free `send_email` binding to your verified inbox, guarded by Turnstile and the rate limit binding, with a weekly self check and an outside Healthchecks.io alarm.

The site stays a fully pre rendered Astro build with no adapter; `/contact` is a static page whose bundled script posts to `POST /api/contact`, handled by `worker/` in the same Worker that serves the static files. Pure logic (words, limits, validation, the email text, outcome mapping) lives in `src/lib/contact.ts`, shared by the page and the Worker; everything that touches the network or storage sits at the Worker's edge.

**Implementation skills**: `wrangler` and `workers-best-practices` (`cloudflare/skills`, adopted in spec 0001, waiting for import under Paperclip Skills, Sources) · `turnstile-spin` and `cloudflare-email-service` (`cloudflare/skills`, found for this spec, offered to the board for import; see Follow-up)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: one stored record, in KV, kept 30 days. Everything else is constants and types.

| Name | Where | Shape | Rules |
|---|---|---|---|
| `OutboxRecord` (KV value) | `CONTACT_OUTBOX` namespace, key `msg:<receivedAt>:<uuid>` | `{ receivedAt: string (ISO UTC); topic: Topic; name: string; email: string; message: string; emailStatus: 'pending' \| 'sent' \| 'failed' }` | `expirationTtl` 2,592,000 s; at most 2 writes per message (free plan: 1,000 writes a day); keys sort by time |
| Outbox metadata | same key | `{ receivedAt; topic; name (≤ 100); emailStatus }` (under the 1,024 byte metadata limit) | read by the weekly `list()` without reading values |
| `CONTACT` | `src/lib/contact.ts` | `ContactCopy`: `readonly` strings `title`, `description`, `heading`, `lead`, `nameLabel`, `emailLabel`, `topicLegend`, `messageLabel`, `messageHint`, `submitLabel`, `sendingLabel`, `sent`, `errorSummary`, `errorPrefix`, `privacyNote`, `linkedinText`, `linkedinLink`, `noScript`, `charactersLeft` (with `{n}`), and `errors: { nameRequired, nameLong, nameInvalid, emailRequired, emailLong, emailInvalid, topicRequired, messageRequired, messageShort, messageLong, messageInvalid, fieldFallback, rateLimited, verification, checkPending, checkFailed, notSent, uncertain }` | limits in AC-2; you edit the words here |
| `TOPICS` | `src/lib/contact.ts` | `readonly [{ value: 'role', label: 'A role' }, { value: 'project', label: 'A project or contract' }, { value: 'other', label: 'Something else' }]` | the choices and the subject labels |
| `CONTACT_LIMITS` | `src/lib/contact.ts` | `{ nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 5000, counterFrom: 4500, bodyMaxBytes: 32768, tokenMax: 2048, sendTimeoutMs: 15000, tokenWaitMs: 10000, verifyTimeoutMs: 5000, outboxTtlSeconds: 2592000 }` | read by validation, the form, the Worker |
| `ContactFields` | `src/lib/contact.ts` | `{ name: string; email: string; topic: string; message: string }` | raw input |
| `ContactMessage` | `src/lib/contact.ts` | `{ readonly name; readonly email; readonly topic: Topic; readonly message }` (trimmed) | only from a passing `validateContact` |
| `FieldErrors` | `src/lib/contact.ts` | `Partial<Record<'name' \| 'email' \| 'topic' \| 'message', 'required' \| 'too_long' \| 'too_short' \| 'invalid'>>` | |
| `ContactResponse` | `src/lib/contact.ts` | `{ ok: true } \| { ok: false; error: 'invalid'; fields: FieldErrors } \| { ok: false; error: 'rate_limited' \| 'verification' \| 'delivery' \| 'unavailable' \| 'bad_request' \| 'forbidden' \| 'not_found' \| 'method_not_allowed' }` | the only bodies the Worker returns |
| `TURNSTILE_SITE_KEY` | `src/lib/contact.ts` | the production widget's public site key | public by design; the board supplies it |
| `SITE.contact`, `SITE.nav`, `LINKEDIN_URL` | `src/lib/site.ts` | as in AC-4 | |
| Worker env | `worker/`, typed by `wrangler types` | `EMAIL`, `CONTACT_LIMITER`, `CONTACT_OUTBOX`, secrets `CONTACT_TO`, `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_URL`, vars `TURNSTILE_EXPECTED_HOSTNAME`, `ALLOWED_ORIGINS` | see Configuration |

**Validation rules** (`validateContact`; trim is `String.prototype.trim`; lengths are `string.length`, UTF-16 code units; checks per field stop at the first failure, in the order written):

| Field | 1. `required` | 2. `too_long` | 3. `too_short` | 4. `invalid` |
|---|---|---|---|---|
| `name` | empty after trim | over 100 | (none) | any of U+0000 to U+001F or U+007F |
| `email` | empty after trim | over 254 | (none) | a control character as above, or not matching `EMAIL_PATTERN` = `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `topic` | empty | (none) | (none) | not `role`, `project` or `other` |
| `message` | empty after trim | over 5,000 | under 10 | any of U+0000 to U+0008, U+000B, U+000C, U+000E to U+001F or U+007F (tab, line feed and carriage return are allowed) |

**Field error copy** (`fieldErrorMessage(field, code)`): name `required` → `nameRequired`, `too_long` → `nameLong`, `invalid` → `nameInvalid`; email `required` → `emailRequired`, `too_long` → `emailLong`, `invalid` → `emailInvalid`; topic `required` or `invalid` → `topicRequired`; message `required` → `messageRequired`, `too_short` → `messageShort`, `too_long` → `messageLong`, `invalid` → `messageInvalid`; any other pair → `fieldFallback`.

**Exit table** (every way `handleContact` ends; *alarm* rows also send the Healthchecks failure signal):

| Step | Condition | Status | Body `error` | Outcome | Reason | Log |
|---|---|---|---|---|---|---|
| 1 | path under `/api/` but not `/api/contact` | 404 | `not_found` | `not_found` | null | log |
| 2 | method not `POST` (HEAD: no body) | 405 | `method_not_allowed` | `method_not_allowed` | null | log |
| 3 | `Origin` present and not allowed | 403 | `forbidden` | `forbidden` | `origin` | log |
| 4 | a secret or binding missing | 503 | `unavailable` | `unavailable` | `config_missing` | error, alarm |
| 5 | wrong content type | 400 | `bad_request` | `bad_request` | `content_type` | log |
| 6 | body over 32,768 bytes | 400 | `bad_request` | `bad_request` | `body_too_large` | log |
| 6 | body unreadable or unparsable | 400 | `bad_request` | `bad_request` | `parse_failed` | log |
| 6 | repeated known field or file value | 400 | `bad_request` | `bad_request` | `field_shape` | log |
| 7 | limiter threw | 503 | `unavailable` | `unavailable` | `limiter_error` | error, alarm |
| 7 | over the limit | 429 | `rate_limited` | `rate_limited` | null | log |
| 8 | validation failed | 422 | `invalid` + `fields` | `invalid` | null | log |
| 9 | token missing, too long or rejected | 403 | `verification` | `verification_failed` | `token_missing` · `token_rejected` · `action_mismatch` · `hostname_mismatch` | log |
| 9 | secret rejected | 503 | `unavailable` | `unavailable` | `secret_rejected` | error, alarm |
| 9 | siteverify unreachable | 503 | `unavailable` | `unavailable` | `turnstile_unreachable` | error |
| 10 | saved and sent | 200 | (`ok: true`) | `sent` | null | log |
| 10 | saved, email failed | 200 | (`ok: true`) | `stored_only` | `email_failed` | error, alarm |
| 10 | not saved, sent | 200 | (`ok: true`) | `sent` | `outbox_failed` | error, alarm |
| 10 | neither | 502 | `delivery` | `delivery_failed` | `email_and_outbox_failed` | error, alarm |
| any | an unexpected exception | 500 | `unavailable` | `unavailable` | `unexpected` | error, alarm |

**Client outcome table** (`clientOutcome(status, body)` in `src/lib/contact.ts`, pure): `200` with `{ ok: true }` → sent; `422` with `error: 'invalid'` and an object `fields` → fix fields; `429` with `rate_limited` → wait; `403` with `verification` → check again; `400`, `404`, `405`, `502`, `503`, or `403` with `forbidden`, each with the matching `ok: false` body → not sent; anything else, including `500`, a network error, the abort, a body that is not JSON, or a status and body that disagree → uncertain.

**Turnstile states** (in the form script):

| State | Entered when | Send pressed in this state |
|---|---|---|
| `loading` | the script tag is added | wait up to 10 s for `verified`, busy |
| `ready` | `turnstile.render` returned, no token yet | wait up to 10 s for `verified`, busy |
| `interactive` | `before-interactive-callback` | show `checkPending`, no wait |
| `verified` | `callback(token)` | send |
| `expired` | `expired-callback` | reset the widget, go to `ready`, wait as above |
| `failed` | `error-callback` after one reset, the script's `error` event, or `render` throwing | show `checkFailed` with LinkedIn |

A wait that ends without a token shows `checkFailed`. After any send that is not **sent**, the widget is reset for the next try (tokens are single use).

**Weekly check states** (`weeklyTurnstileState`, pure, first match wins): no `TURNSTILE_SECRET_KEY` → `secret_missing`; network error, timeout, non 2xx, a body that is not JSON or lacks `error-codes` → `unreachable`; `error-codes` includes `invalid-input-secret` or `missing-input-secret` → `secret_rejected`; `success: false` and `error-codes` includes `invalid-input-response` → `ok`; anything else (including `success: true`) → `unknown`. Only `ok` counts as fine.

**Draft copy** (the starting `CONTACT` values; you may edit them in the build's pull request before it merges):

| Key | Draft |
|---|---|
| `title` | Contact Toyin Ogunseinde, DevOps engineer |
| `description` | Send Toyin Ogunseinde a message about a role, a contract or a project. I read every message myself and usually reply within two working days. |
| `heading` | Send me a message |
| `lead` | Tell me about the role or the project. I read every message myself. |
| `nameLabel` · `emailLabel` · `topicLegend` · `messageLabel` | Your name · Your email · What is it about? · Your message |
| `messageHint` | At least 10 characters. |
| `submitLabel` · `sendingLabel` | Send message · Sending… |
| `sent` | Thanks, I have your message. I usually reply within two working days. |
| `errorSummary` | Please fix these and send again: |
| `errorPrefix` | Error: |
| `charactersLeft` | {n} characters left |
| `errors.nameRequired` · `nameLong` · `nameInvalid` | Enter your name. · Keep your name under 100 characters. · Remove unusual characters from your name. |
| `errors.emailRequired` · `emailLong` · `emailInvalid` | Enter your email address. · Keep your email address under 254 characters. · Enter an email address like name@example.com. |
| `errors.topicRequired` | Choose what your message is about. |
| `errors.messageRequired` · `messageShort` · `messageLong` · `messageInvalid` | Write your message. · Write at least 10 characters. · Keep your message under 5,000 characters. · Remove unusual characters from your message. |
| `errors.fieldFallback` | Check this field and try again. |
| `errors.rateLimited` | You have sent a few messages in a row. Please wait a minute, then try again. |
| `errors.verification` | The bot check did not go through. Please try sending again. |
| `errors.checkPending` | Please finish the bot check above the button, then send again. |
| `errors.checkFailed` | The bot check could not load, so the form cannot send right now. Your text is still here. You can message me on LinkedIn instead. |
| `errors.notSent` | Sorry, your message did not send. Your text is still here, so you can try again, or message me on LinkedIn. |
| `errors.uncertain` | I could not confirm your message was sent. Your text is still here. If you send it again I may get it twice, or you can message me on LinkedIn. |
| `privacyNote` | What happens to your message: I use your name, email, topic and message only to reply to you. It is emailed to me and also kept on Cloudflare for 30 days as a backup, then deleted automatically; the copy in my inbox stays until I delete it. Cloudflare Turnstile checks you are not a bot and receives your IP address, which the site also uses to limit repeated sends but does not store. Cloudflare keeps short request logs for a few days. To ask about or delete what you sent, reply to my email or message me on LinkedIn. |
| `linkedinText` · `linkedinLink` | Prefer LinkedIn? · Message me there. |
| `noScript` | Sending needs JavaScript, because the form checks you are not a bot. You can message me on LinkedIn instead. |

The `notSent`, `uncertain`, `checkFailed` and `noScript` messages end with a link to `LINKEDIN_URL` whose text is `CONTACT.linkedinLink`, built as an element after the message text, never by inserting HTML.

**Email layout** (`emailBody`, lines joined with `\n`):

```
Topic: <topic label>
Name: <name>
Email: <email>
Received: <receivedAt, ISO UTC>
Reference: <outbox key, or "not saved">

<message, as written>
```

**Page composition** (one `<Container width="measure">`): `PageIntro size="page"`; a `Section` without a heading holding the `<noscript>` line, the status area, the form, the privacy note and the LinkedIn line.

**Form layout**: one column at every width. Field `Stack` gap `md`. Each field: label (`--text-base` Inter 600, `text`), the hint if any (`--text-sm` `muted`), the control, then its error text. Controls fill the column; the submit button is full width below `sm` and natural width from `sm`. Radios one per line.

**Component values** (added to `design.md` with this spec; no new colour token):

| Part | Values |
|---|---|
| Text input, email input, textarea | full width, `--text-base` Inter 400, `text` on `bg`, 1px `line` border, `--radius-sm`, padding `0.625rem 0.75rem`, min height `2.75rem`; textarea resizes vertically only. Focus: the site focus ring. Invalid (`aria-invalid="true"`): 2px `text` border. Read only while sending: unchanged look, `cursor: progress` |
| Radio | native radio at `1.25rem` with `accent-color: var(--color-accent)`; the label row (radio plus text) is the target, at least `2.75rem` tall |
| Field error text | `--text-sm` Inter 600 `text`, with `CONTACT.errorPrefix` in a visually hidden span first, under its control |
| Status area | `<div id="contact-status" tabindex="-1">` above the form, empty and no height at rest; filled: `--color-surface` background, `--radius-sm`, padding `1rem`, a 3px left border in `accent` (sent) or `text` (everything else), message `--text-base` `text`; holds a `role="status"` or `role="alert"` child per AC-8 |
| Character counter | `--text-sm` `muted`, under the textarea, shown from 4,500 characters, text from `charactersLeft`, not a live region |
| Turnstile container | `<div id="contact-turnstile">` between the message and the button, no height unless Cloudflare asks for interaction |

**API surface**:

| Endpoint or name | Method or signature | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/contact` | POST, `multipart/form-data` or `application/x-www-form-urlencoded`, `Accept: application/json` | `name`, `email`, `topic`, `message`, `cf-turnstile-response` | `200 { ok: true }` | public; allowed origin; Turnstile token; 3 a minute per IP | per the *Exit table* |
| `/api/contact` | other methods | | `405`, `Allow: POST` | | |
| `/api/*` other | any | | `404` | | |
| Worker `scheduled` | cron `0 8 * * 1` | | the weekly email, a Healthchecks ping, one log line | Cloudflare only | AC-21 |
| `/contact` | static page | | AC-1 to AC-8, AC-11, AC-22 to AC-24 | public | |
| `validateContact` | `(fields: ContactFields) => { ok: true; value: ContactMessage } \| { ok: false; errors: FieldErrors }` | | | | pure |
| `fieldErrorMessage` | `(field: string, code: string) => string` | | copy | | pure |
| `clientOutcome` | `(status: number \| null, body: unknown) => 'sent' \| 'fix' \| 'wait' \| 'check' \| 'not_sent' \| 'uncertain'` | | | | pure; `null` status for network error or abort |
| `emailSubject` | `(message: ContactMessage) => string` | | | | pure |
| `emailBody` | `(message: ContactMessage, receivedAt: Date, reference: string \| null) => string` | | | | pure |
| `weeklyCheckSubject`, `weeklyCheckBody` | `() => string`, `(sentAt: Date, turnstile: WeeklyTurnstileState, messages: readonly OutboxSummary[] \| 'unreadable') => string` | | | | pure |
| `weeklyTurnstileState` | `(result: SiteverifyResult \| 'unreachable' \| 'missing') => WeeklyTurnstileState` | | | | pure |
| `turnstileSiteKey` | `() => string` | | | | AC-19 |
| `handleContact` | `(request: Request, env: Env, deps: ContactDeps) => Promise<Response>` | | | | `worker/contact.ts`; `deps`: `verifyTurnstile`, `now`, `uuid`, `log`, `alarm` |
| `verifyTurnstile` | `(input: { secret; token; remoteip?; expectedHostname; expectedAction }, fetchImpl: typeof fetch) => Promise<VerifyResult>` | | | | `worker/turnstile.ts`, AC-10 |
| `handleScheduled` | `(env: Env, deps: WeeklyDeps) => Promise<void>` | | | | `worker/weekly.ts`, AC-21 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Page and form | every word | `CONTACT` (draft above, your wording) |
| Page | topic choices | `TOPICS` |
| Page | LinkedIn link | `LINKEDIN_URL` from `src/lib/site.ts` |
| Page | head tags, canonical | `CONTACT.title`, `CONTACT.description` via `BaseLayout`; `/contact` |
| Form | `maxlength`, counter threshold, timeouts | `CONTACT_LIMITS` |
| Form | Turnstile site key | `turnstileSiteKey()` (AC-19) |
| Form | Turnstile size | the container's measured width: `flexible` at 300 px or more, else `compact` |
| Status area | which message | `clientOutcome(status, body)` → `CONTACT` |
| Status area | per field errors after a 422 | the response `fields` through `fieldErrorMessage` |
| Worker | allowed origins | `ALLOWED_ORIGINS` var: `https://toyintest.org` in `wrangler.jsonc`, `http://localhost:8787` in `.dev.vars` |
| Worker | rate limit key, `remoteip` | `CF-Connecting-IP` header |
| Worker | limit and window | `ratelimits` in `wrangler.jsonc`: `limit 3`, `period 60` (your decision) |
| Worker | expected hostname | `TURNSTILE_EXPECTED_HOSTNAME` var: `toyintest.org`; in `.dev.vars` the hostname Cloudflare's test secret returns, recorded in the local proof (step 12) |
| Worker | `receivedAt` | `deps.now()` once when the request arrives |
| Outbox | key | `msg:` + `receivedAt` ISO + `:` + `deps.uuid()` (`crypto.randomUUID`) |
| Outbox | expiry | `CONTACT_LIMITS.outboxTtlSeconds` (30 days, your decision) |
| Email | recipient | `CONTACT_TO` secret (your inbox, a verified destination address) |
| Email | sender | `form@toyintest.org`, name `Contact form`, constant in `worker/contact.ts` |
| Email | reply to, subject, body | the validated message; `TOPICS` label; `emailBody(message, receivedAt, key)` |
| Weekly check | schedule | `triggers.crons: ["0 8 * * 1"]` |
| Weekly check | messages of the week | `CONTACT_OUTBOX.list({ prefix: 'msg:' })` metadata, keys from the last 7 days by `receivedAt` |
| Alarm | ping address | `HEALTHCHECK_URL` secret; success = the URL, failure = the URL plus `/fail` |
| Alarm | late threshold | the Healthchecks check: period 7 days, grace 4 hours (board setup) |
| Logs | outcome, reason | the *Exit table* row |

**Key invariants**:
- No page, image, font or unknown path runs the Worker: `run_worker_first` is exactly `["/api/*"]`, and the build has no adapter (spec 0001).
- A message the sender is told was received exists in at least one place: the outbox copy or your inbox (AC-14).
- Every outbox key expires 30 days after its last write; nothing else about a message is stored by the site, and no log line holds personal data.
- The inbox address, the Turnstile secret and the Healthchecks URL exist only as Worker secrets (and in your untracked `.dev.vars`).
- Every request to `/api/contact` ends in exactly one *Exit table* row: one JSON response and one log line.
- No outcome reaches the visitor as silence, and every outcome but **sent** keeps the typed text.
- One validation function and one set of limits serve both the browser and the Worker.
- At most one email per accepted request; the Worker never retries a send.
- `SITE.contact` stays the one contact target, shown only through `CallToAction` (spec 0004).

**Security model**: `/api/contact` is a public, unauthenticated write endpoint whose effects are one KV record and one email to one verified inbox. The `send_email` binding stays unrestricted in config (restricting it would publish your address); it can still reach only verified destination addresses, so a wrong `CONTACT_TO` could reach another address verified on the account, which is why the post deploy proof sends one real message and confirms it arrives (step 13). Defences: the allowed origin check, the 32 KB body cap, the rate limit (approximate, per location), server side validation, and Turnstile siteverify with action and hostname checks (single use tokens). Header injection is closed by the structured `send` object and the control character rule. Secrets: `CONTACT_TO`, `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_URL`; the Turnstile site key is public by design. **Personal data**: names, email addresses and free text, partly from people in the EU. Each message is held in two places: your inbox (until you delete it) and the KV copy (30 days, then deleted automatically). Cloudflare processes it on your behalf (Turnstile, KV, Email Service, logs); Healthchecks.io receives no personal data. The privacy note (AC-22) states purpose, storage, retention and how to ask for deletion; you delete a KV copy in the dashboard (Storage and databases, KV, `CONTACT_OUTBOX`, the key). This spec records the data flow honestly; it is not a legal compliance assessment.

**Configuration required**:
- `CONTACT_TO` (Worker secret): your inbox address, verified as an Email Routing destination. Set with `npx wrangler secret put CONTACT_TO` or in the dashboard. Never written into the repository.
- `TURNSTILE_SECRET_KEY` (Worker secret): the secret of the Turnstile widget for `toyintest.org`.
- `HEALTHCHECK_URL` (Worker secret): the ping URL of the Healthchecks.io check.
- `TURNSTILE_EXPECTED_HOSTNAME` (var): `toyintest.org`. `ALLOWED_ORIGINS` (var): `https://toyintest.org`.
- `TURNSTILE_SITE_KEY` (constant in `src/lib/contact.ts`): the widget's public site key.
- `wrangler.jsonc` additions: `main`, `assets.run_worker_first`, `send_email: [{ "name": "EMAIL" }]`, `ratelimits: [{ "name": "CONTACT_LIMITER", "namespace_id": "1001", "simple": { "limit": 3, "period": 60 } }]`, `kv_namespaces: [{ "binding": "CONTACT_OUTBOX", "id": "<id from the board>" }]`, `triggers: { "crons": ["0 8 * * 1"] }`, `observability: { "enabled": true }`, `vars`.
- `.dev.vars` (untracked; `.dev.vars.example` committed): `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (Cloudflare's always pass test secret), `TURNSTILE_EXPECTED_HOSTNAME=` the test hostname, `ALLOWED_ORIGINS=http://localhost:8787`, `CONTACT_TO=you@example.com` (replace with your verified inbox), `HEALTHCHECK_URL=https://hc-ping.com/your-check-uuid`.
- Tooling: `vitest.config.ts` includes `worker/**/*.test.ts`; `worker/tsconfig.json` with the Workers types and `../src/lib/contact.ts` included; `worker/worker-configuration.d.ts` generated by `npx wrangler types` and committed; CI checks it is current; the root `tsconfig.json` excludes `worker/`; `build` becomes `astro check && tsc -p worker && astro build`; `check` becomes `astro check && tsc -p worker`; new `build:local`.

**Critical test scenarios** (each maps to an acceptance criterion in *Requirements*):
- Happy path: `handleContact` with fakes saves the record with a 30 day TTL, calls `EMAIL.send` once with the exact object, rewrites the record as `sent`, answers 200 and logs `sent`; in the browser (endpoint stubbed) the success shows in a status region, takes focus and the fields clear, verifies **AC-7**, **AC-8**, **AC-12**, **AC-13**, **AC-14**
- Delivery: email rejects with the copy saved → 200 `stored_only` plus alarm; copy fails and email sends → 200 plus alarm; both fail → 502, alarm, `console.error`; the browser shows `notSent` for 502 with the text kept, verifies **AC-8**, **AC-14**, **AC-18**, **AC-21**
- Uncertain: network drop, the 15 s abort with a late reply ignored, a 500, a non JSON body, and `200` with `ok: false` all show `uncertain` with the text kept, verifies **AC-7**, **AC-8**
- Editing while sending: fields are read only in flight and the cleared text equals the sent text, verifies **AC-7**
- Validation: every cell of the *Validation rules* table at its boundary (0, 1, 100, 101 name; 9, 10, 5,000, 5,001 message; whitespace only; tabs and newlines in the message; U+0000 and U+007F; non ASCII letters; bad emails; unknown topic), the 422 answered before Turnstile, the error summary links and clearing, verifies **AC-5**, **AC-6**
- Spam: the fourth send in a minute → 429 before Turnstile; a throwing limiter → 503; missing, long, rejected, wrong action and wrong hostname tokens → 403; non 2xx, malformed JSON, `internal-error` and timeout → 503; a rejected secret → 503 with alarm, verifies **AC-9**, **AC-10**
- Turnstile in the browser: delayed script, blocked script, error then reset, expiry, the interactive state, and no token within 10 s, each with its message (stub script), verifies **AC-11**
- Contract: other `/api/*` → 404 for GET and POST; GET and HEAD on `/api/contact` → 405 with `Allow`; foreign origin → 403; no origin → accepted; missing secret → 503 `config_missing`; JSON content type, a 40 KB body with a false `Content-Length`, a duplicated field and a file field → 400; unknown fields ignored; an unexpected throw → 500, verifies **AC-15**, **AC-16**, **AC-17**, **AC-18**
- Email text: quotes, commas, non ASCII names and a multi line message reach the `send` object intact; the body matches the layout, verifies **AC-13**
- Weekly check: each Turnstile state, an unreadable outbox, a failed email, a missing `HEALTHCHECK_URL`; success ping only when fine, verifies **AC-21**
- Staying free and local: the contract test locks config, scripts and the absence of secret values; the build test finds no test key in `dist/`; after deploy, pages and unknown paths add no Worker invocations, verifies **AC-19**, **AC-20**
- Accessibility and layout: keyboard only fill and send, focus moves, axe in every state, width sweep including 320 px with the compact widget, and the manual real challenge, verifies **AC-3**, **AC-6**, **AC-23**
- Pages and nav: every `CallToAction` links `/contact` with the new label; Contact last in the nav and current only on `/contact`; privacy note, LinkedIn line and noscript line render, verifies **AC-1**, **AC-2**, **AC-4**, **AC-22**, **AC-24**
- Auth/permission: there is no protected surface; a cross site page posting to `/api/contact` gets 403, and a script without a token gets 403 or 429, verifies **AC-9**, **AC-10**, **AC-16**

## Build plan

Skateboard: the first milestone ships the thinnest whole thing, a form that really saves and delivers a message end to end; the call to action and the nav switch to `/contact` in that same milestone, so the live site never links to a form that cannot send. The board's dashboard steps (Follow-up) must be done before the pull request merges.

*Milestone 1: a message reaches you, with a 30 day copy (end to end)*
1. `src/lib/contact.ts` and `src/lib/contact.test.ts`: `CONTACT`, `TOPICS`, `CONTACT_LIMITS`, the types, `EMAIL_PATTERN`, `validateContact`, `fieldErrorMessage`, `clientOutcome`, `emailSubject`, `emailBody`, `turnstileSiteKey`, `TURNSTILE_SITE_KEY`, with the length limits test and the validation boundary tests; no Worker only imports, satisfies **AC-2**, **AC-5**, **AC-13**, **AC-19**
2. Tooling: `worker/tsconfig.json`, `worker/worker-configuration.d.ts` from `npx wrangler types`, the root `tsconfig.json` exclude, `vitest.config.ts` including `worker/**/*.test.ts`, the `build`, `check` and `build:local` scripts, satisfies **AC-19**, **AC-20**
3. `worker/`: `index.ts` (`fetch` routes by path then method), `contact.ts` (`handleContact` along the *Exit table*, the outbox writes, the `send` call, one log line, the alarm), `turnstile.ts` (`verifyTurnstile`), with `worker/contact.test.ts` and `worker/turnstile.test.ts` using fake bindings, `fetch`, `now`, `uuid`, `log` and `alarm`, satisfies **AC-9**, **AC-10**, **AC-12**, **AC-13**, **AC-14**, **AC-15**, **AC-16**, **AC-17**, **AC-18**
4. `wrangler.jsonc` (everything in Configuration except the cron) and `.dev.vars.example`; `tests/stack-contract.test.ts` replaces the "no `main`" assertion with the new locks and the secret value scan, satisfies **AC-20**
5. `src/components/ContactForm.astro` with its bundled script (fields, Turnstile states, client validation, read only while sending, abort, `clientOutcome`, status regions and focus, counter) and `src/pages/contact.astro` (intro, privacy note, LinkedIn line, noscript line), satisfies **AC-1**, **AC-3**, **AC-6**, **AC-7**, **AC-8**, **AC-11**, **AC-22**, **AC-24**
6. `src/lib/site.ts`: `SITE.contact`, the Contact nav entry, export `LINKEDIN_URL`; update the tests that held the LinkedIn target, satisfies **AC-4**

*Milestone 2: you hear when it breaks*
7. `worker/weekly.ts` (`handleScheduled`), `weeklyCheckSubject`, `weeklyCheckBody`, `weeklyTurnstileState`, the Healthchecks pings, `triggers.crons` in `wrangler.jsonc`, with `worker/weekly.test.ts`, satisfies **AC-21**

*Milestone 3: the checks and the design record*
8. `design.md`: the form component rows and the Contact page entry; the dev only style guide shows `ContactForm` at rest, with field errors, and with each outcome message, satisfies **AC-3**, **AC-23**
9. `tests/contact-page.test.ts` (container render: parts in order, labels, attributes, no trap field, no `CallToAction`) and `tests/build/contact-build.test.ts` (head tags, Turnstile script only on `/contact`, other pages' script budgets unchanged, no test keys in `dist/`), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-19**, **AC-24**
10. `e2e/contact.spec.ts` with `page.route` stubs for `/api/contact` (every *Client outcome table* row, a network error, a hang past 15 s) and for the Turnstile script (a fake `window.turnstile` that can be ready, slow, interactive, expired, erroring or blocked): keyboard flow, focus, regions, read only while sending, text kept, double press; add `/contact` to the shared width, axe and target size lists; update the header keyboard order and row checks for four links, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-11**, **AC-23**, **AC-24**
11. CI: a step that runs `npx wrangler types` and fails if `worker/worker-configuration.d.ts` changed, satisfies **AC-20**

*Proof (run by `/check verify` and the ship issue)*
12. Local: `npm run build:local && npx wrangler dev` with `.dev.vars`; send a real form and confirm the local `send_email` simulation output and the local KV record; record the test secret's actual siteverify `hostname` and `action` and set `.dev.vars` to match (if the action does not come back as sent, stop and return to `/architect`; never weaken the production check); fire the cron with `curl "http://localhost:8787/cdn-cgi/handler/scheduled"` (`wrangler dev --test-scheduled`); complete a real challenge with site key `3x00000000000000000000FF` by keyboard and screen reader, satisfies **AC-10**, **AC-12**, **AC-13**, **AC-21**, **AC-23**
13. After deploy (owner: the Engineer on the ship issue): within one hour, send one real message and confirm it arrives in your inbox and appears in KV; in the Workers dashboard, confirm over that hour that page and unknown path visits added no invocations, each `/api/contact` request added one, and (on the next Monday) the cron added one with a Healthchecks ping. Evidence: a dashboard screenshot and the received email's subject line on the ship issue. If any check fails: `npx wrangler rollback` to the previous version and open `/debug`, satisfies **AC-12**, **AC-13**, **AC-14**, **AC-20**, **AC-21**

## Consequences

**Positive**:
- A visitor reaches you from the site, and every outcome is honest: success only when the message exists somewhere you can read it, "could not confirm" when nobody knows.
- A message that Gmail filters or drops is still recoverable for 30 days, and the Monday email lists every message of the week, so a missing one stands out.
- An alarm outside Cloudflare (Healthchecks.io) catches what Cloudflare cannot report about itself: a cron that stopped, a send that failed, a secret that broke.
- Still zero running cost: pages stay free static asset requests, verified sends are free, and KV, rate limiting, Cron Triggers, logs and Healthchecks.io stay inside their free allowances at this volume.

**Negative / tradeoffs**:
- The site's Worker now has a script; spec 0001's "no `main`" contract test becomes the `run_worker_first` lock.
- The site now stores personal data for 30 days, so the privacy note says so and a deletion request means deleting a KV key by hand.
- One new outside service, Healthchecks.io, with its own account; if it goes down, alarms stop (it receives no personal data).
- `/contact` loads the site's first outside script (Turnstile), and the form does not work without JavaScript; the noscript line points to LinkedIn.
- KV's free plan allows 1,000 writes a day; at 2 writes a message that is about 500 messages a day before writes fail (the email still goes out; the alarm fires).
- Rate limits are approximate and per location; Turnstile is the main defence. Visitors behind one shared address share the limit.
- If a reply is lost after Cloudflare delivered the email, the sender sees "could not confirm" and may resend, and you get it twice.
- KV is eventually consistent: a message saved in one location can take up to a minute to show in the weekly list elsewhere; at a weekly cadence this does not matter.
- The account's free allowances (100,000 Worker requests a day, 5 Cron Triggers) are shared with `n8n` and `invoice2-email-worker`; enabling Email Routing adds Cloudflare's MX records to `toyintest.org`.

**Neutral**:
- A new `worker/` folder with its own TypeScript config and generated types; Workers Builds bundles it on deploy.
- Running the form locally needs `.dev.vars` and `npm run build:local`; `astro dev` shows the page but cannot send.
- Browser tests stub the endpoint and Turnstile; the real path is proved by Worker tests with fakes, the local `wrangler dev` run and one real message after deploy.

## Follow-up

- [ ] **Board, before merge:** turn on Email Routing for `toyintest.org` (Compute, Email Service, Email Routing), add and verify your inbox as a destination address, and check no existing MX records conflict.
- [ ] **Board, before merge:** create a Turnstile widget (Application security, Turnstile, Add widget) for hostname `toyintest.org`, mode Managed; give the Engineer the site key for `TURNSTILE_SITE_KEY` and set the secret as the `TURNSTILE_SECRET_KEY` Worker secret.
- [ ] **Board, before merge:** create a KV namespace `CONTACT_OUTBOX` (Storage and databases, KV, Create) and give the Engineer its id; set the `CONTACT_TO` Worker secret on `og-website`; confirm rate limit namespace id `1001` is not used by `n8n` or `invoice2-email-worker`, that the account has a free Cron Trigger slot (the free plan allows 5), and its current daily request use.
- [ ] **Board, before merge:** create a free Healthchecks.io account and one check named `toyintest contact form`, period 7 days, grace 4 hours, alerts by email to your inbox; set its ping URL as the `HEALTHCHECK_URL` Worker secret.
- [ ] **Board:** import `cloudflare/skills@turnstile-spin` and `cloudflare/skills@cloudflare-email-service` (official) under Paperclip Skills, Sources, as you chose on JSM-47. Declined: `secondsky/claude-skills` `cloudflare-workers-security` and `cloudflare-cron-triggers` (for `AGENTS.md` `## Agent skills`, via `/sync`). No MCP server was found beyond the Cloudflare documentation one already connected.
- [x] Spec 0001: its "no Worker script" contract changes here, as it anticipated (it expected "a small separate Worker route"; this spec keeps it in the same Worker, limited to `/api/*`). Spec 0001's status line notes the amendment.
- [ ] Scope Deferred list: the Privacy note (AC-22) and Error monitoring (AC-18, AC-21) ship with this feature. Visitor analytics stays deferred.
- [ ] Content Security Policy (deferred): if one is added later it must allow `https://challenges.cloudflare.com` for scripts and frames on `/contact`, as well as the inline theme script hash (spec 0003).
- [ ] In the first weeks live, check Gmail does not file mail from `form@toyintest.org` as spam, and add a filter that never sends it to spam.
