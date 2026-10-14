# 0006. Contact form

**Date**: 2026-10-14
**Status**: Proposed

## Summary

A new `/contact` page lets a visitor send you a message without leaving the site. The page itself stays a plain pre built file; only the form's send goes to a small piece of server code (a Worker script) that runs for `/api/*` and nothing else, so the rest of the site stays free. That code checks the message, stops spam with Cloudflare Turnstile (a free bot check that most people never see), a hidden trap field and a limit of 3 sends a minute, then emails the message to your own inbox through Cloudflare, free. The sender always sees a clear result, a failed send keeps their text and offers LinkedIn instead, a short privacy note sits under the form, every failure is logged, and a weekly test email proves the path still works.

## Requirements

**User stories**:
- As a hiring reader or a client reader, I want to write to you from the site in under a minute, so that starting a conversation needs no other app.
- As a sender, I want to know for certain whether my message arrived, so that I never wonder if it was lost.
- As a sender whose message did not go through, I want my text kept and another way to reach you, so that I do not lose what I wrote.
- As a keyboard or screen reader user, I want every field, error and result to be reachable and announced, so that the form works for me (WCAG 2.2 AA, spec 0003).
- As a sender, I want to know what happens to my name, email and message, so that I can trust the form.
- As the site owner, I want every message in my own inbox with a reply address set, spam kept out, and a loud signal when the form breaks, so that a broken form never costs me work silently.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

*The page*
- **AC-1**: `src/pages/contact.astro` builds `dist/contact/index.html`. Inside `<main>`, the page `Container` (measure width) holds, top to bottom: `PageIntro size="page"` with `heading={CONTACT.heading}` (the page's only `<h1>`) and `lead={CONTACT.lead}`; the `ContactForm` component; a `<p>` with `CONTACT.privacyNote` (AC-19); and a `<p>` with `CONTACT.linkedinText` followed by a link to `LINKEDIN_URL` with the text `CONTACT.linkedinLink` (`rel="me"`, same tab). The page has no `CallToAction` and no other primary `Button` besides the form's submit button.
- **AC-2**: All words on the page and in the form live in the `CONTACT` constant in `src/lib/contact.ts`, starting from the draft copy in *Feature design*. A Vitest test checks, after trimming, that every value is non empty and within its limit: `title` at most 60 characters, `description` 50 to 160, `heading` at most 60, `lead` at most 160, every label, legend and button text at most 40, every error and result message at most 160, `privacyNote` at most 400. The success message contains `two working days`. The page `<title>` is `CONTACT.title` and its meta description `CONTACT.description`, passed to `BaseLayout` (spec 0004 share tags; canonical `https://toyintest.org/contact`).
- **AC-3**: The form (`<form id="contact-form" action="/api/contact" method="post" novalidate>`) holds, in this order: a text input `name` (label `CONTACT.nameLabel`, `autocomplete="name"`, `required`, `maxlength="100"`); an email input `email` (label `CONTACT.emailLabel`, `autocomplete="email"`, `required`, `maxlength="254"`); a `<fieldset>` with `<legend>` `CONTACT.topicLegend` and three radio inputs named `topic` with values `role`, `project`, `other` and the labels from `TOPICS`, none checked, `required` on the group; a `<textarea name="message">` (label `CONTACT.messageLabel`, hint `CONTACT.messageHint` tied by `aria-describedby`, `required`, `maxlength="5000"`, at least 8 rows); a honeypot (AC-10); the Turnstile container (AC-9); and a submit `Button type="submit"` with `CONTACT.submitLabel`. Every input has a visible `<label>` tied by `for`/`id`, and every control is at least 24 by 24 CSS pixels.
- **AC-4**: `SITE.contact` in `src/lib/site.ts` is `{ label: 'Send me a message', href: '/contact' }`, so every `CallToAction` (home, work listing, project pages, about) now opens `/contact`. `SITE.nav` is Home `/`, Work `/projects`, About `/about`, Contact `/contact`, in that order; Contact carries `aria-current="page"` on `/contact` only. The closing words on the other pages stay as they are (`HOME`, `WORK`, `PROJECT_PAGE`, `ABOUT` `closingText`: "Tell me about the role or the project, and I will get back to you."). `LINKEDIN_URL` is exported from `site.ts`, and the footer still links LinkedIn and GitHub.

*Sending in place*
- **AC-5**: With JavaScript, pressing Send (or Enter in a single line field) runs `validateContact` in the browser first. If anything is wrong, nothing is sent: each bad field gets `aria-invalid="true"` and its own error text (from `CONTACT.errors`) tied by `aria-describedby`, and the status area above the form shows `CONTACT.errorSummary` with one link per bad field that moves focus to that field. Focus moves to the status area. Errors are shown in text, never by colour alone.
- **AC-6**: A valid form is sent with `fetch` as `FormData` to `POST /api/contact` with `Accept: application/json`. While it is in flight the submit button reads `CONTACT.sendingLabel`, carries `aria-busy="true"`, and a second press does nothing (no second request). The form fields stay editable but are not resent.
- **AC-7**: On `{ ok: true }` the status area shows `CONTACT.sent` ("Thanks, your message reached me. I usually reply within two working days."), focus moves to it, the form fields are cleared and the Turnstile widget is reset.
- **AC-8**: On any failure the typed text stays in the fields, the Turnstile widget is reset, focus moves to the status area, and it shows the message for that outcome: `rate_limited` → `CONTACT.errors.rateLimited` (wait a minute); `verification` → `CONTACT.errors.verification` (try again); `invalid` → the per field errors from the response, as in AC-5; and `delivery`, `unavailable`, `bad_request`, `forbidden`, a network error, a timeout after 15 seconds or any response that is not the expected JSON → `CONTACT.errors.failed`, which says the message did not send, that the text is still there, and links LinkedIn (`LINKEDIN_URL`). No outcome leaves the visitor without a message.

*Spam and abuse*
- **AC-9**: Turnstile loads only on `/contact`, from `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, and renders explicitly into the container with the site key `TURNSTILE_SITE_KEY` (Cloudflare's always pass test key on the dev server), `action: 'contact'`, `appearance: 'interaction-only'` (managed mode: nothing shows unless Cloudflare needs the visitor to tick a box), `theme: 'auto'`, and `size: 'flexible'` when the container is at least 300 pixels wide, else `size: 'compact'`. The token goes into the form as `cf-turnstile-response`. If the script fails to load or Turnstile reports an error, the status area shows `CONTACT.errors.failed` on send, never a silent hang.
- **AC-10**: The form holds a honeypot: a text input `website` inside a wrapper that is visually hidden and `aria-hidden="true"`, with `tabindex="-1"` and `autocomplete="off"`, so keyboard and screen reader users never meet it. If the Worker receives a non empty `website`, it sends nothing, answers `200 { ok: true }`, and logs `honeypot`.
- **AC-11**: The Worker limits sends to 3 per 60 seconds per visitor with the `CONTACT_LIMITER` rate limit binding, keyed `contact:` plus the `CF-Connecting-IP` header (`contact:unknown` when absent). Over the limit it answers `429 { ok: false, error: 'rate_limited' }` without calling Turnstile or sending.
- **AC-12**: The Worker verifies every token with Turnstile siteverify (secret `TURNSTILE_SECRET_KEY`, the token, `remoteip`), with a 5 second timeout, and accepts only `success: true` with `action === 'contact'` and `hostname === TURNSTILE_EXPECTED_HOSTNAME`. A missing, failed, expired or reused token answers `403 { ok: false, error: 'verification' }`. A siteverify timeout or network error answers `503 { ok: false, error: 'unavailable' }`.

*Validation and delivery*
- **AC-13**: `validateContact(fields)` in `src/lib/contact.ts` is pure and shared by the browser and the Worker. It trims `name`, `email` and `message` and returns either `{ ok: true, value: ContactMessage }` or `{ ok: false, errors }` with one code per bad field: `name` required, at most 100 characters, no control characters; `email` required, at most 254 characters, matches `EMAIL_PATTERN` (one `@`, no spaces, a dot in the domain); `topic` one of `role`, `project`, `other`; `message` at least 10 and at most 5,000 characters after trimming. The Worker answers a failed check with `422 { ok: false, error: 'invalid', fields: { <field>: <code> } }` before calling Turnstile, so the token is not spent.
- **AC-14**: A valid, verified message is sent with the `EMAIL` `send_email` binding: from `Contact form <form@toyintest.org>`, to the `CONTACT_TO` secret, with reply to the sender's name and email, the subject from `emailSubject` (`[toyintest.org] A role: <name>`, with the topic's label, and every CR and LF in the name replaced by a space) and the plain text body from `emailBody` (topic label, name, email, the message, and the UTC time the Worker received it). Success answers `200 { ok: true }`. A rejected or failed send answers `502 { ok: false, error: 'delivery' }`, and the email is not retried by the Worker.
- **AC-15**: The Worker answers only `POST /api/contact` with real work: another method on that path → `405` with `Allow: POST`; any other `/api/*` path → `404 { ok: false, error: 'not_found' }`; a request whose `Origin` header is present and is not `https://toyintest.org` (or the request's own origin on the dev server) → `403 { ok: false, error: 'forbidden' }`; a body over 32 KB or a content type other than `multipart/form-data` or `application/x-www-form-urlencoded` → `400 { ok: false, error: 'bad_request' }`; a missing `CONTACT_TO` or `TURNSTILE_SECRET_KEY` → `503 { ok: false, error: 'unavailable' }` and the log reason `config_missing`. Every response is JSON with `Cache-Control: no-store`.

*Staying static and free*
- **AC-16**: `wrangler.jsonc` adds `main: "./worker/index.ts"` and `assets.run_worker_first: ["/api/*"]`, so a request for any page, image, font or unknown path never runs the Worker (unknown paths still get the 404 page with status 404). Astro still has no adapter and `output` stays static. `tests/stack-contract.test.ts` locks `main`, `run_worker_first` (exactly `["/api/*"]`), the `send_email`, `ratelimits`, `triggers.crons` and `observability` entries, and that `CONTACT_TO` and `TURNSTILE_SECRET_KEY` appear nowhere in `wrangler.jsonc` or any committed file except `.dev.vars.example` (which holds only the Cloudflare test secret and a placeholder address).

*Knowing it broke*
- **AC-17**: Every request to `/api/contact` writes exactly one log line, `{"event":"contact","outcome":<outcome>,"reason":<reason or null>}`, where outcome is one of `sent`, `honeypot`, `invalid`, `rate_limited`, `verification_failed`, `delivery_failed`, `unavailable`, `bad_request`, `forbidden`. `delivery_failed`, `unavailable` and `config_missing` are written with `console.error`. No log line ever holds the name, email, message, IP address or token. `observability.enabled` is `true` in `wrangler.jsonc`.
- **AC-18**: A Cron Trigger `0 8 * * 1` (Mondays 08:00 UTC) runs the Worker's `scheduled` handler, which sends one email through the same `EMAIL` binding to `CONTACT_TO`, subject `[toyintest.org] Contact form weekly check`, whose body gives the UTC time, says the send path works, reports whether the Turnstile secret is accepted (a siteverify call with the dummy token `weekly-check` must answer `invalid-input-response`, not `invalid-input-secret` or `missing-input-secret`), and says what a missing Monday email means. The handler logs `{"event":"weekly_check","outcome":"sent"|"failed","turnstile":"ok"|"secret_rejected"|"unreachable"}`.

*Privacy and accessibility*
- **AC-19**: Directly under the form the page shows `CONTACT.privacyNote`, which says, in plain words: what is collected (name, email, topic, message); that it is emailed to you and used only to reply; that the site itself stores nothing and the message lives only in your inbox; that Cloudflare Turnstile checks for bots and your IP address is used only to limit repeated sends and is not stored by you; and how to ask about or delete what was sent (reply to your email, or LinkedIn).
- **AC-20**: `/contact` has exactly one `<h1>` and no skipped heading level. The page passes the spec 0003 width sweep (no sideways scroll at 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels), and the spec 0003 `@axe-core/playwright` WCAG 2.2 AA scan reports zero violations in both themes with the form at rest, showing field errors, and showing each result message (Turnstile stubbed). The whole form can be filled and sent by keyboard alone in the order name, email, topic radios (arrow keys), message, Send; the honeypot never takes focus. `/contact` is added to the shared width, axe and target size lists in `e2e/design-system.spec.ts`, and the header keyboard order and row checks are updated for four nav links.
- **AC-21**: Without JavaScript, a `<noscript>` paragraph above the form shows `CONTACT.noScript` (sending needs JavaScript for the bot check) with the LinkedIn link. The page's only outside request is the Turnstile script and its frames; every other page keeps its spec 0003 script budget unchanged (`/contact` adds one bundled module script for the form and the Turnstile script).

## Decision

**Chosen option**: Option 1: a small Worker script inside the existing `og-website` Worker, run only for `/api/*`, sending through Cloudflare's free `send_email` binding to one verified inbox, guarded by Turnstile, a honeypot and the rate limit binding, with a weekly self check.

The site stays a fully pre rendered Astro build with no adapter; `/contact` is a static page whose small bundled script posts the form to `POST /api/contact`, handled by `worker/index.ts` in the same Worker that serves the static files. Pure logic (words, limits, validation, the email) lives in `src/lib/contact.ts` and is shared by the page and the Worker; everything that touches the network sits at the Worker's edge.

**Implementation skills**: `wrangler` and `workers-best-practices` (`cloudflare/skills`, adopted in spec 0001, waiting for import under Paperclip Skills, Sources) · `turnstile-spin` and `cloudflare-email-service` (`cloudflare/skills`, found for this spec, offered to the board for import; see Follow-up)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: no persisted data. Nothing about a message is stored by the site; it exists in the request, then in your inbox. Constants, types and bindings:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `CONTACT` | `src/lib/contact.ts` | `ContactCopy`: `readonly` strings `title`, `description`, `heading`, `lead`, `nameLabel`, `emailLabel`, `topicLegend`, `messageLabel`, `messageHint`, `submitLabel`, `sendingLabel`, `sent`, `errorSummary`, `privacyNote`, `linkedinText`, `linkedinLink`, `noScript`, `charactersLeft` (a template with `{n}`), and `errors: { nameRequired, nameLong, nameInvalid, emailRequired, emailInvalid, topicRequired, messageShort, messageLong, rateLimited, verification, failed }` | limits in AC-2; you edit the words here |
| `TOPICS` | `src/lib/contact.ts` | `readonly [{ value: 'role', label: 'A role' }, { value: 'project', label: 'A project or contract' }, { value: 'other', label: 'Something else' }]` | the one place the choices and the subject labels live |
| `CONTACT_LIMITS` | `src/lib/contact.ts` | `{ nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 5000, counterFrom: 4500, bodyMaxBytes: 32768 }` | read by `validateContact`, the form's `maxlength` attributes, the counter and the Worker |
| `ContactFields` | `src/lib/contact.ts` | `{ name: string; email: string; topic: string; message: string }` (raw strings; missing fields are `''`) | input to `validateContact` |
| `ContactMessage` | `src/lib/contact.ts` | `{ readonly name: string; readonly email: string; readonly topic: Topic; readonly message: string }` (trimmed) | only produced by a passing `validateContact` |
| `Topic` | `src/lib/contact.ts` | `'role' \| 'project' \| 'other'` | |
| `FieldErrors` | `src/lib/contact.ts` | `Partial<Record<'name' \| 'email' \| 'topic' \| 'message', FieldErrorCode>>`, codes `required`, `too_long`, `too_short`, `invalid` | |
| `ContactResponse` | `src/lib/contact.ts` | `{ ok: true } \| { ok: false; error: 'invalid'; fields: FieldErrors } \| { ok: false; error: 'rate_limited' \| 'verification' \| 'delivery' \| 'unavailable' \| 'bad_request' \| 'forbidden' \| 'not_found' }` | the only body the Worker ever returns |
| `TURNSTILE_SITE_KEY` | `src/lib/contact.ts` | the widget's public site key (a string) | public by design; the board supplies it (Follow-up). Dev server uses `1x00000000000000000000AA` |
| `CONTACT_ENDPOINT` | `src/lib/contact.ts` | `'/api/contact'` | |
| `SITE.contact`, `SITE.nav`, `LINKEDIN_URL` | `src/lib/site.ts` | as in AC-4 | |
| Worker env | `worker/index.ts`, typed from `wrangler types` | `EMAIL: SendEmail`, `CONTACT_LIMITER: RateLimit`, `CONTACT_TO: string` (secret), `TURNSTILE_SECRET_KEY: string` (secret), `TURNSTILE_EXPECTED_HOSTNAME: string` (var) | see Configuration |

**Draft copy** (the starting `CONTACT` values; you may edit them in the build's pull request before it merges):

| Key | Draft |
|---|---|
| `title` | Contact Toyin Ogunseinde, DevOps engineer |
| `description` | Send Toyin Ogunseinde a message about a role, a contract or a project. I read every message myself and usually reply within two working days. |
| `heading` | Send me a message |
| `lead` | Tell me about the role or the project. I read every message myself. |
| `nameLabel` | Your name |
| `emailLabel` | Your email |
| `topicLegend` | What is it about? |
| `messageLabel` | Your message |
| `messageHint` | At least 10 characters. |
| `submitLabel` | Send message |
| `sendingLabel` | Sending… |
| `sent` | Thanks, your message reached me. I usually reply within two working days. |
| `errorSummary` | Please fix these and send again: |
| `charactersLeft` | {n} characters left |
| `errors.nameRequired` | Enter your name. |
| `errors.nameLong` | Keep your name under 100 characters. |
| `errors.nameInvalid` | Use letters, spaces and punctuation in your name. |
| `errors.emailRequired` | Enter your email address. |
| `errors.emailInvalid` | Enter an email address like name@example.com. |
| `errors.topicRequired` | Choose what your message is about. |
| `errors.messageShort` | Write at least 10 characters. |
| `errors.messageLong` | Keep your message under 5,000 characters. |
| `errors.rateLimited` | You have sent a few messages in a row. Please wait a minute, then try again. |
| `errors.verification` | The bot check did not go through. Please try sending again. |
| `errors.failed` | Sorry, your message did not send. Your text is still here, so you can try again, or message me on LinkedIn. |
| `privacyNote` | What happens to your message: it is emailed to me and used only to reply to you. This site stores nothing; your name, email and message live only in my inbox. Cloudflare Turnstile checks you are not a bot, and your IP address is used only to limit repeated sends, never stored by me. To ask about or delete what you sent, reply to my email or message me on LinkedIn. |
| `linkedinText` | Prefer LinkedIn? |
| `linkedinLink` | Message me there. |
| `noScript` | Sending needs JavaScript, because the form checks you are not a bot. You can message me on LinkedIn instead. |

`TOPICS` labels: A role · A project or contract · Something else.

**Page composition** (top to bottom, one `<Container width="measure">`):

1. `PageIntro size="page" heading={CONTACT.heading} lead={CONTACT.lead}`.
2. `Section` without a heading, holding `ContactForm`: the `<noscript>` line (AC-21), the status area, then the form (AC-3).
3. Inside the same `Section`, after the form: the privacy note `<p class="text-sm text-muted max-w-measure">`, then the LinkedIn line `<p>` (AC-1).

**Form layout**: one column at every width. Field `Stack` gap `md`. Each field: label (`--text-base` Inter 600, `text`), then the hint if any (`--text-sm` `muted`), then the control, then its error text when present. Controls are full width of the column; the submit button is full width below `sm` and natural width from `sm`. The radios sit one per line.

**Component values** (added to `design.md` with this spec; no new colour token):

| Part | Values |
|---|---|
| Text input, email input, textarea | full width, `--text-base` Inter 400, `text` on `bg`, 1px `line` border, `--radius-sm`, padding `0.625rem 0.75rem`, min height `2.75rem`; textarea `rows="8"`, resizes vertically only. Focus: the site focus ring. Invalid (`aria-invalid="true"`): 2px `text` border |
| Radio | native radio at `1.25rem` with `accent-color: var(--color-accent)`, label beside it, the whole label row at least `2.75rem` tall |
| Field error text | `--text-sm` Inter 600 `text`, starts with the word "Error:" in a visually hidden span, sits under its control, tied by `aria-describedby` |
| Status area | a `<div id="contact-status" tabindex="-1">` above the form, empty and taking no space at rest. When filled: `--color-surface` background, `--radius-sm`, padding `1rem`, a 3px left border in `text` (a failure) or `accent` (success); message `--text-base` `text`; the error summary is a `<ul>` of links |
| Character counter | `--text-sm` `muted`, under the textarea, shown only from 4,500 characters (`CONTACT_LIMITS.counterFrom`), text from `CONTACT.charactersLeft` |
| Honeypot wrapper | `sr-only` style plus `aria-hidden="true"`: off screen, never focusable |
| Turnstile container | `<div id="contact-turnstile">` between the message and the button; empty and no height unless Cloudflare asks for interaction |

**Request flow** (`POST /api/contact`, in this order; each step's failure answers at once):

1. Method is `POST`, else `405`. Path is `/api/contact`, else `404`.
2. `Origin` check, else `403 forbidden`.
3. Required secrets present, else `503 unavailable` (`config_missing`).
4. Content type and `Content-Length` (and the read body) within 32 KB, else `400 bad_request`.
5. Parse the form data into `ContactFields` plus `website` and `cf-turnstile-response`.
6. Honeypot filled → `200 { ok: true }`, nothing sent.
7. `CONTACT_LIMITER.limit({ key })`; not `success` → `429 rate_limited`.
8. `validateContact`; failed → `422 invalid` with `fields`.
9. Turnstile siteverify; rejected → `403 verification`; timeout or network error → `503 unavailable`.
10. `EMAIL.send(...)`; resolved → `200 { ok: true }`; rejected → `502 delivery`.

**API surface**:

| Endpoint or name | Method or signature | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/contact` | POST, `multipart/form-data` or `application/x-www-form-urlencoded`, `Accept: application/json` | `name`, `email`, `topic` (`role` \| `project` \| `other`), `message`, `website` (honeypot, empty), `cf-turnstile-response` | `200 { ok: true }` | public; same origin; Turnstile token; 3 per minute per IP | `422 invalid` + `fields`, `429 rate_limited`, `403 verification`, `403 forbidden`, `400 bad_request`, `502 delivery`, `503 unavailable` |
| `/api/contact` | any other method | | `405`, `Allow: POST` | | |
| `/api/*` other | any | | `404 { ok: false, error: 'not_found' }` | | |
| Worker `scheduled` | cron `0 8 * * 1` | | the weekly check email, one log line | Cloudflare only | logs `failed` |
| `/contact` | static page | | AC-1 to AC-9, AC-19 to AC-21 | public | |
| `validateContact` | `(fields: ContactFields) => { ok: true; value: ContactMessage } \| { ok: false; errors: FieldErrors }` | | | | pure, `src/lib/contact.ts` |
| `emailSubject` | `(message: ContactMessage) => string` | | `[toyintest.org] <topic label>: <name>` | | pure; CR and LF become spaces |
| `emailBody` | `(message: ContactMessage, receivedAt: Date) => string` | | plain text: topic, name, email, a blank line, the message, a blank line, `Received <ISO UTC time>` | | pure |
| `weeklyCheckBody` | `(sentAt: Date, turnstile: 'ok' \| 'secret_rejected' \| 'unreachable') => string` | | plain text for AC-18 | | pure |
| `fieldErrorMessage` | `(field, code) => string` | | the `CONTACT.errors` text | | pure, used by the form |
| `handleContact` | `(request: Request, env: Env, deps: ContactDeps) => Promise<Response>` | | | | `worker/contact.ts`; `deps` holds `verifyTurnstile`, `now` and `log`, so tests pass fakes |
| `verifyTurnstile` | `(secret, token, remoteip, fetchImpl) => Promise<'ok' \| 'rejected' \| 'unreachable'>` | | | | `worker/turnstile.ts`, the only `fetch` to Cloudflare; checks `action` and `hostname` |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Page | heading, lead, labels, hint, button texts, privacy note, LinkedIn line, no script line | `CONTACT` (your wording, draft above) |
| Page | topic choices and order | `TOPICS` (your decision: role, project or contract, something else) |
| Page | LinkedIn link | `LINKEDIN_URL`, exported from `src/lib/site.ts` |
| Page | head tags, canonical | `CONTACT.title`, `CONTACT.description` via `BaseLayout`; `/contact` from `trailingSlash: 'never'` |
| Form | `maxlength` values, counter threshold | `CONTACT_LIMITS` |
| Form | Turnstile site key | `TURNSTILE_SITE_KEY` (board supplies; test key when `import.meta.env.DEV`) |
| Form | Turnstile size | the container's measured width at render: `flexible` at 300 pixels or more, else `compact` |
| Status area | which message | the response `error` code mapped to `CONTACT.errors` (AC-8), or `CONTACT.sent` |
| Status area | per field errors after a 422 | the response `fields` codes through `fieldErrorMessage` |
| Worker | rate limit key | `CF-Connecting-IP` request header, prefixed `contact:`; `contact:unknown` when absent |
| Worker | limit and window | `ratelimits` entry in `wrangler.jsonc`: `limit: 3`, `period: 60` (your decision) |
| Worker | siteverify `remoteip` | `CF-Connecting-IP` |
| Worker | expected hostname | `TURNSTILE_EXPECTED_HOSTNAME` var: `toyintest.org` in `wrangler.jsonc`; `example.com` in `.dev.vars` (what Cloudflare's test keys return) |
| Worker | allowed origin | `https://toyintest.org`, or the request URL's own origin (the dev server) |
| Email | recipient | `CONTACT_TO` secret (your inbox; must be a verified destination address) |
| Email | sender | `form@toyintest.org`, display name `Contact form`, a constant in `worker/contact.ts` (Email Routing must be on for `toyintest.org`) |
| Email | reply to | the sender's validated `name` and `email` |
| Email | subject | `emailSubject(message)`: topic label from `TOPICS`, the name |
| Email | body | `emailBody(message, receivedAt)`, `receivedAt` from `deps.now()` (the Worker clock, UTC) |
| Weekly check | schedule | `triggers.crons: ["0 8 * * 1"]` (Mondays 08:00 UTC, 09:00 or 10:00 in the Netherlands) |
| Weekly check | Turnstile state | a siteverify call with token `weekly-check`: `invalid-input-response` → `ok`; `invalid-input-secret` or `missing-input-secret` → `secret_rejected`; timeout or network error → `unreachable` |
| Logs | outcome, reason | the request flow step that answered (AC-17) |

**Key invariants**:
- No page, image, font or unknown path ever runs the Worker: `run_worker_first` is exactly `["/api/*"]`, and the build still has no adapter (spec 0001).
- The site stores nothing about a message. No KV, D1, R2 or Durable Object binding; no log line holds personal data.
- The inbox address and the Turnstile secret exist only as Worker secrets (and in your untracked `.dev.vars`), never in the repository.
- Every request to `/api/contact` ends in exactly one JSON response from `ContactResponse` and exactly one log line.
- No outcome reaches the visitor as silence: every response and every client side failure (network, timeout, Turnstile error) maps to a visible message, and every failure keeps the typed text.
- One validation function, `validateContact`, is the rule for both the browser and the Worker; the form's `maxlength` attributes come from the same `CONTACT_LIMITS`.
- One email per accepted request. The Worker never retries a send (a retry could duplicate a message the provider did accept).
- `SITE.contact` stays the one contact target, shown only through `CallToAction` (spec 0004).

**Security model**: `/api/contact` is a public, unauthenticated write endpoint whose only effect is one email to one fixed, verified inbox, so the worst abuse is spam to you, never mail to a stranger: the `send_email` binding can only reach verified destination addresses on the free plan. Defences, in order: same origin check, body size cap, honeypot, 3 per minute per IP, server side field validation, and Turnstile siteverify with action and hostname checks (single use tokens, so replay fails). Header injection is closed by validating the email address and stripping CR and LF from the name before the subject. The Worker holds two secrets (`CONTACT_TO`, `TURNSTILE_SECRET_KEY`); the Turnstile site key is public by design. **Personal data**: the form collects a name, an email address and free text from people in the EU and elsewhere, which is personal data under the GDPR; the site's lawful basis is answering the request the sender made, it keeps no copy, and the inline privacy note (AC-19) states purpose, storage and how to ask for deletion. You are the controller; the email in your Gmail inbox is subject to your own retention. No payment, health or other special category data.

**Configuration required**:
- `CONTACT_TO` (Worker secret): your inbox address (the one you gave on JSM-47; never written into the repository), verified as an Email Routing destination address. Set with `npx wrangler secret put CONTACT_TO` or in the dashboard.
- `TURNSTILE_SECRET_KEY` (Worker secret): the secret of the Turnstile widget for `toyintest.org`.
- `TURNSTILE_EXPECTED_HOSTNAME` (plain var in `wrangler.jsonc`): `toyintest.org`.
- `TURNSTILE_SITE_KEY` (constant in `src/lib/contact.ts`): the same widget's public site key.
- `wrangler.jsonc` additions: `main`, `assets.run_worker_first`, `send_email: [{ "name": "EMAIL" }]`, `ratelimits: [{ "name": "CONTACT_LIMITER", "namespace_id": "1001", "simple": { "limit": 3, "period": 60 } }]`, `triggers.crons`, `observability: { "enabled": true }`, `vars`.
- `.dev.vars` (untracked; `.dev.vars.example` committed): `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (Cloudflare's always pass test secret), `TURNSTILE_EXPECTED_HOSTNAME=example.com`, `CONTACT_TO=` your verified inbox.
- Prerequisites in the Cloudflare dashboard before the first deploy (board actions, see Follow-up): Email Routing on for `toyintest.org` with the inbox verified; a Turnstile widget for `toyintest.org`; both secrets set; one free Cron Trigger slot on the account (the free plan allows 5).

**Critical test scenarios** (each maps to an acceptance criterion in *Requirements*):
- Happy path: a valid form with a passing token, through `handleContact` with fakes, answers `200 { ok: true }`, calls `EMAIL.send` once with the right from, to, reply to, subject and body; in the browser (endpoint stubbed) the success message shows, takes focus and the fields clear, verifies **AC-6**, **AC-7**, **AC-14**
- Delivery failure: `EMAIL.send` rejects → `502 delivery`, one `console.error` line with no personal data; in the browser the failure message shows with the LinkedIn link and the text is kept, verifies **AC-8**, **AC-14**, **AC-17**
- Network failure and timeout in the browser: a dropped request and a 15 second hang both show the failure message with text kept, verifies **AC-8**
- Validation: `validateContact` on each boundary (0, 1, 100, 101 character names; 9, 10, 5,000, 5,001 character messages after trimming; bad emails; unknown topic; a name with CR or LF); the Worker answers 422 without calling Turnstile; the browser shows per field errors and the summary with working links, verifies **AC-5**, **AC-13**
- Spam: a filled honeypot answers 200 and sends nothing; a fourth send inside a minute answers 429 before Turnstile; a rejected, reused or wrong action or wrong hostname token answers 403; a siteverify timeout answers 503, verifies **AC-10**, **AC-11**, **AC-12**
- Abuse and routing: GET → 405 with `Allow`; `/api/other` → 404; a foreign `Origin` → 403; a 40 KB body or a JSON content type → 400; missing secrets → 503 `config_missing`, verifies **AC-15**
- Staying free: the contract test locks `main`, `run_worker_first`, the bindings and no secrets in the repo; on the deployed site `GET /` and an unknown path answer without a Worker invocation (the Workers dashboard shows invocations only for `/api/contact`), verifies **AC-16**
- Weekly check: the `scheduled` handler with fakes sends one email with each Turnstile state and logs it, verifies **AC-18**
- Accessibility and layout: keyboard only fill and send, focus moves, honeypot never focused, axe in both themes in every state, width sweep including 320 pixels with the Turnstile compact size, verifies **AC-3**, **AC-5**, **AC-20**
- Pages and nav: every `CallToAction` links `/contact` with the new label; Contact is last in the nav and current only on `/contact`; the privacy note and LinkedIn line render, verifies **AC-1**, **AC-2**, **AC-4**, **AC-19**, **AC-21**
- Auth/permission: there is no protected surface; a cross site page posting to `/api/contact` gets 403, and a direct script without a token gets 403 after the rate limit, verifies **AC-12**, **AC-15**

## Build plan

Skateboard: the first milestone ships the thinnest whole thing, a form that really delivers a message end to end, before any polish. The call to action and the nav switch to `/contact` in that same milestone, so the live site never links to a form that cannot send. The board's dashboard steps (Follow-up) must be done before the pull request merges, because the first deploy with `main` set needs the secrets and Email Routing to work.

*Milestone 1: a message reaches you (end to end)*
1. `src/lib/contact.ts` and `src/lib/contact.test.ts`: `CONTACT`, `TOPICS`, `CONTACT_LIMITS`, the types, `EMAIL_PATTERN`, `validateContact`, `emailSubject`, `emailBody`, `fieldErrorMessage`, `TURNSTILE_SITE_KEY`, `CONTACT_ENDPOINT`, with the length limits test, satisfies **AC-2**, **AC-13**, **AC-14**
2. `worker/`: `index.ts` (`fetch` routes `/api/contact` and other `/api/*`), `contact.ts` (`handleContact` and the request flow), `turnstile.ts` (`verifyTurnstile`), its own `tsconfig.json`, and `worker-configuration.d.ts` from `npx wrangler types`; the root `tsconfig.json` excludes `worker/`, and `npm run check` becomes `astro check && tsc -p worker`. Tests in `worker/contact.test.ts` with fake `EMAIL`, `CONTACT_LIMITER`, `verifyTurnstile`, `now` and `log`, satisfies **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**
3. `wrangler.jsonc`: `main`, `run_worker_first`, `send_email`, `ratelimits`, `vars`, `observability`; `.dev.vars.example`; update `tests/stack-contract.test.ts` (the old "no `main`" assertion becomes the new locks), satisfies **AC-16**
4. `src/components/ContactForm.astro` with its bundled `<script>`: fields, honeypot, Turnstile explicit render, client validation, `fetch` send, busy state, status area, focus moves, counter; `src/pages/contact.astro` with the intro, privacy note, LinkedIn line and noscript line, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-19**, **AC-21**
5. `src/lib/site.ts`: `SITE.contact` to `/contact` with "Send me a message", the Contact nav entry, export `LINKEDIN_URL`; update the tests that held the LinkedIn target (`site.test.ts`, `home-page.test.ts`, the other page tests), satisfies **AC-4**

*Milestone 2: you hear when it breaks*
6. Structured log lines for every outcome, `console.error` for the loud ones, no personal data, satisfies **AC-17**
7. The `scheduled` handler, `weeklyCheckBody`, the Turnstile secret probe, and `triggers.crons` in `wrangler.jsonc`, with tests, satisfies **AC-18**

*Milestone 3: the checks and the design record*
8. `design.md`: the form component rows above and the Contact page entry; the dev only style guide shows `ContactForm` at rest and with every status message, satisfies **AC-3**, **AC-20**
9. `tests/contact-page.test.ts` (container render: order of parts, labels, attributes, honeypot, no `CallToAction`) and `tests/build/contact-build.test.ts` (head tags, the Turnstile script only on `/contact`, other pages' script budgets unchanged), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**, **AC-21**
10. `e2e/contact.spec.ts` with `page.route` stubs for `/api/contact` (each response, a network error, a hang) and for the Turnstile script (a fake `window.turnstile` that returns a token): keyboard flow, focus, messages, text kept, double press, noscript; add `/contact` to the shared width, axe and target size lists and update the header keyboard order and row checks for four links, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-20**, **AC-21**
11. Local end to end proof for `/check verify`: `npm run build && npx wrangler dev` with the test keys, a real form send to the local `send_email` simulation, and the scheduled handler fired with `curl "http://localhost:8787/cdn-cgi/handler/scheduled"`; after deploy, one real message to your inbox and the Workers dashboard showing invocations only for `/api/contact`, satisfies **AC-14**, **AC-16**, **AC-18**

## Consequences

**Positive**:
- A visitor can reach you from the site, and every outcome is visible to them; a broken path is visible to you within a week at worst, at once if you look at the logs.
- Still zero running cost: page requests stay free static asset requests, and sends to a verified inbox are free and outside any sending quota.
- No new vendor or account: Turnstile, Email Routing, rate limiting, Cron Triggers and logs all live in the Cloudflare account you already use.
- No personal data is held by the site, so there is no database to secure, back up or purge.

**Negative / tradeoffs**:
- The site is no longer purely static: the Worker now has a script, and spec 0001's "no Worker script" contract test changes. The guard moves to `run_worker_first: ["/api/*"]`, which the contract test locks.
- `/contact` loads the site's first outside script (Turnstile from `challenges.cloudflare.com`), and the form does not work without JavaScript; the noscript line points to LinkedIn.
- With no stored copy, a message is lost if Cloudflare accepts it and Gmail then drops or filters it; the sender sees success in that case. The weekly check catches a broken path, not one filtered message. Watch Gmail's spam folder for `form@toyintest.org` early on and add a filter to never send it to spam.
- If a send fails after Cloudflare actually delivered it, the sender may retry and you get the message twice.
- Rate limits count per Cloudflare location and are approximate, so a determined sender spread across locations can exceed 3 a minute; Turnstile is the main defence.
- Workers Logs keep request metadata (which can include the IP address) for a few days under Cloudflare's own retention; your privacy note says you do not store it, which is accurate, but it is not "nothing anywhere".
- The account's Workers free allowance (100,000 requests a day) and 5 Cron Triggers are shared with `n8n` and `invoice2-email-worker` (spec 0001).
- Enabling Email Routing on `toyintest.org` adds Cloudflare's MX records to the domain, so any other mail setup on that domain must not conflict.

**Neutral**:
- A new folder, `worker/`, with its own TypeScript config and generated types; Workers Builds bundles it on deploy with `wrangler deploy`.
- The form needs one dev setup step (`.dev.vars` from the example) to run under `wrangler dev`; `astro dev` shows the page but cannot send.
- Browser tests stub the endpoint and Turnstile; the real send path is proved by Worker unit tests with fakes plus the local `wrangler dev` run and one real message after deploy.

## Follow-up

- [ ] **Board, before merge:** turn on Email Routing for `toyintest.org` (Compute, Email Service, Email Routing) and add and verify your inbox as a destination address; check no existing MX records conflict.
- [ ] **Board, before merge:** create a Turnstile widget (Application security, Turnstile, Add widget) for hostname `toyintest.org`, mode Managed; put its site key in `TURNSTILE_SITE_KEY` and its secret in the `TURNSTILE_SECRET_KEY` Worker secret.
- [ ] **Board, before merge:** set the `CONTACT_TO` Worker secret on `og-website` to your inbox, and confirm the account has a free Cron Trigger slot (Workers and Pages, each Worker's Settings, Triggers; the free plan allows 5 per account across `og-website`, `n8n` and `invoice2-email-worker`).
- [ ] **Board:** import `cloudflare/skills@turnstile-spin` and `cloudflare/skills@cloudflare-email-service` (official, found for this spec) under Paperclip Skills, Sources if you want the build agent to follow their conventions. Community skills found for rate limiting and Cron Triggers (`secondsky/claude-skills`) are not recommended. No MCP server was found beyond the Cloudflare documentation one already connected.
- [x] Spec 0001: its "no Worker script" contract changes here, as it anticipated (it expected "a small separate Worker route"; this spec keeps it in the same Worker, limited to `/api/*`). Spec 0001's status line notes the amendment.
- [ ] Scope Deferred list: the Privacy note (an inline note, AC-19) and Error monitoring (logs plus the weekly check, AC-17, AC-18) ship with this feature. Visitor analytics stays deferred, so you still will not know how many people reach the form without sending.
- [ ] Content Security Policy (deferred): if one is added later it must allow `https://challenges.cloudflare.com` for scripts and frames on `/contact`, as well as the inline theme script hash (spec 0003).
- [ ] After the first week live, check Gmail did not file the weekly check or a test message as spam.
