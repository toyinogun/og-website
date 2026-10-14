# 0006. Contact form: rationale

## Context

The contact form is scope feature 11, tagged `Beta`, and the scope calls it the point of the whole site: the one place a hiring reader or a client reader turns into a conversation. It is also the one feature that can fail silently. A form that accepts a message and drops it costs you work and tells nobody, which is worse than having no form at all. The scope's done line asks for exactly that to be impossible: a message reliably reaches you, the sender sees a clear success or failure, bad input and spam are handled, the form works by keyboard to WCAG 2.2 AA (spec 0003), and a delivery failure is visible rather than silent.

The foundation constrains how. Spec 0001 made the site a fully pre rendered Astro build served as Cloudflare Workers static assets, with no adapter, because an adapter turns free static requests into metered Worker invocations; `tests/stack-contract.test.ts` even asserts that `wrangler.jsonc` has no `main`. Spec 0001 also recorded what it did not settle: a handler can **run** on the domain for free, but free end to end **delivery** to an inbox was not established, and ordinary page requests must stay outside script execution. The Cloudflare account is on the free plan and is shared with two unrelated Workers (`n8n`, `invoice2-email-worker`), which share its daily request allowance and its 5 Cron Triggers. Your running cost target is at or near zero.

The form handles other people's personal data (a name, an email address and free text), much of it from the EU, so the GDPR applies in its plain form: say what you collect, why, where it goes and how to ask for deletion. The scope deferred both a Privacy note and Error monitoring, and noted that without monitoring "nothing will tell you when the contact form starts failing silently". The repository is public, so nothing secret, including your inbox address, may live in it.

The cross check on JSM-50 added one more force: a sender told "received" must be right, and a monitor that can stop silently is not a monitor.

Smaller forces: the design system has no error colour and a contract test that pins exactly eight colour tokens; the header nav and the call to action (`SITE.contact`, spec 0004) were built to be repointed in one line; the browser tests run against `astro preview`, which serves only static files; and the phone width floor is 320 pixels with a 20 pixel gutter, leaving 280 pixels for any widget.

## Options considered

The design conversation settled the shape question by question (round 1 and round 2 on JSM-47), and the Reviewer's cross check (JSM-50) reopened two of those answers: whether to keep a copy, and who notices a silent monitor. The load bearing choice is how the form posts and how a message is made to reach you, compared here as whole approaches.

### Option 1: A Worker script in the same Worker, for `/api/*` only, sending through the `send_email` binding, no copy

Add `main` and `assets.run_worker_first: ["/api/*"]` to the existing `og-website` Worker. Pages, images and fonts keep being served as static assets without running code; only `/api/contact` runs the script. The script validates, checks Turnstile and the rate limit, and sends with Cloudflare's `send_email` binding to your verified inbox (basis: spec 0001, Consequences; Cloudflare Workers static assets, `run_worker_first`; Cloudflare Email Service pricing).

**Pros**:
- One project, one deploy, one domain; Workers Builds already deploys it.
- Sends to a verified destination address are free on every plan and outside any sending quota, the question spec 0001 left open.
- No new vendor for delivery; secrets stay Worker secrets. Page requests stay free.
- Nothing personal is stored by the site.

**Cons**:
- Cloudflare accepting the email is not the inbox receiving it. A message Gmail filters or drops is lost, the sender was told it arrived, and no check can notice one missing message.
- The Worker is no longer script free; spec 0001's contract test changes.
- `send_email` reaches only verified addresses, so the site can never email the sender a copy without the paid plan.

### Option 2: A separate Worker routed at `toyintest.org/api/*`

Same handler and delivery, in a second Worker with its own `wrangler.jsonc`, attached by a route.

**Pros**:
- The site Worker stays exactly as spec 0001 left it.
- The handler can be deployed and rolled back on its own.

**Cons**:
- Two projects, two deploy pipelines and two configs for one endpoint.
- Route ordering between a custom domain Worker and a route Worker is one more thing to get wrong.
- Same delivery gap as Option 1; separation does not make a message more likely to arrive.

### Option 3: A third party form service (Formspree, Web3Forms and similar)

The form posts straight to a hosted service that emails you; no server code.

**Pros**:
- Fastest to ship; spam filtering, storage and delivery are the vendor's problem.
- The site stays fully static.

**Cons**:
- Your one conversion point depends on a vendor's free tier limits, branding, uptime and policy changes; spec 0001 rejected a host partly to avoid this.
- Personal data passes through and is usually stored by a processor you do not control.
- It does not guarantee inbox delivery either; failure handling is whatever the vendor returns.

### Option 4: Option 1, plus a 30 day copy of every message in KV and an outside alarm

Same as Option 1, but each message is first written to a KV namespace with a 30 day expiry, the weekly email lists that week's messages, and an outside dead man's switch (Healthchecks.io) is pinged by the weekly check and told immediately about any failed send.

**Pros**:
- A message is reported as received only when it exists somewhere you can read it, and a filtered or dropped email is recoverable for 30 days.
- The weekly list makes one missing message visible, which no delivery check can.
- The alarm lives outside Cloudflare, so a stopped cron, an exhausted account or a broken email path still reaches you.
- Still free: KV's free plan allows 1,000 writes a day and 1 GB, far above this site's volume.

**Cons**:
- The site now stores personal data for 30 days, which the privacy note must say, and deletion requests mean deleting a key by hand.
- One more binding to configure, and one outside service (Healthchecks.io) with its own account.
- More code paths: four combinations of copy and email success to map and test.

## Rationale

Option 4 is the only option that meets the scope's actual promise, that a message reliably reaches you and a failure is never silent. The first draft chose Option 1 on the reasoning that a stored copy only protects against failures the sender already sees. That was wrong: the dangerous failure is the one where Cloudflare accepts the email and Gmail then drops or files it, which the sender never sees and no delivery check reports. You chose the 30 day copy once that was clear. The copy is bounded (it deletes itself) and kept out of logs, so the cost is a short retention promise in the privacy note rather than an open ended data store. Options 2 and 3 do not close this gap; Option 2 adds a pipeline, Option 3 adds a processor.

The "never silent" requirement shaped the rest. A failed send cannot email you about itself, and a cron that stopped cannot report that it stopped, so monitoring needs a signal from outside the system being watched (basis: dead man's switch monitoring). Healthchecks.io receives a ping after each successful weekly check and an immediate failure signal from any failed or partial send, and it emails you when a ping is late; it never receives personal data. On the sender's side, every response, network error and timeout maps to one honest message: **sent** only when the copy or the email succeeded, **not sent** when the server says nothing went out, and **uncertain** when nobody knows, because telling someone "did not send" after a lost reply invites a duplicate they were not warned about. The Worker never retries a send for the same reason (basis: idempotency for external side effects).

The spam defence is Turnstile siteverify (with action and hostname checks and single use tokens) plus the rate limit binding, checked before Turnstile so a script hammering the endpoint does not cost a siteverify call (basis: Cloudflare Turnstile server side validation; rate limit any public endpoint). The rate limit is approximate and per location, so Turnstile carries most of the weight. A hidden trap field was dropped: a password manager or autofill that fills it would turn a real message into a fake success, the one silent loss this design exists to prevent, and Turnstile already stops the bots a trap catches. Validation runs before Turnstile so a typo does not burn the visitor's token. Managed mode with `appearance: 'interaction-only'` keeps the widget out of sight for nearly everyone; at the 320 pixel floor the widget uses its compact size, because the flexible size needs 300 pixels and the column has 280.

Errors use text, weight and a border in the `text` colour rather than a new red token. WCAG requires errors to be identified in text, not in a particular colour (basis: WCAG 2.2, 3.3.1 Error Identification and 1.4.1 Use of Color), and a new token would break the eight token design contract for one component. The inbox address lives in a Worker secret because the repository is public. The binding is left unrestricted in config, since restricting it would publish the address; a wrong secret could then still reach another address verified on the account, so the post deploy proof sends one real message and confirms it arrives. The privacy note sits inline under the form because it is read at the moment it matters, and it describes the real data flow: what is collected, where it goes, for how long, who processes it and how to ask for deletion (basis: GDPR Articles 13 and 17, transparency and erasure). That is a statement of the design, not a legal assessment of compliance.

## References

**Project sources**:
- Spec 0001 (`docs/specs/0001-stack-architecture/index.md`): no adapter, the free static asset contract, the open delivery question, the shared account and its allowances.
- Spec 0003 and `design.md`: WCAG 2.2 AA target, the eight colour token contract, focus ring, 320 pixel floor.
- Spec 0004: `SITE.contact` as the one contact target through `CallToAction`; spec 0005: the closing text note.
- `tests/stack-contract.test.ts`, `vitest.config.ts`, `playwright.config.ts` (`astro preview`), `src/components/Container.astro` (`px-5` gutter).
- `AGENTS.md` Rules: side effects at the edges, expected failures as return values, pure helpers in `src/lib/`.
- JSM-47 question cards (rounds 1 and 2, and the cross check decisions) and the Reviewer's cross check, JSM-50.

**Practices & standards**:
- Idempotency for external side effects (no server retry of a send).
- Rate limit any public endpoint.
- Dead man's switch monitoring (an expected periodic signal whose absence is the alarm), checked from outside the watched system.
- WCAG 2.2: 1.4.1 Use of Color, 3.3.1 Error Identification, 3.3.3 Error Suggestion, 4.1.3 Status Messages, 2.5.8 Target Size (Minimum).
- GDPR Articles 13 (information to be provided) and 17 (erasure).
- Healthchecks.io, the free hosted dead man's switch service (cited by name; not checked against its current docs).

**Links** (checked against Cloudflare's documentation on 2026-10-14):
- Email Service pricing (sends to verified destination addresses are free on all plans): https://developers.cloudflare.com/email-service/platform/pricing/
- Email Routing destination addresses: https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- Email Service Workers API (`send_email` binding, `send()`): https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- Static assets `run_worker_first` route patterns: https://developers.cloudflare.com/workers/static-assets/binding/
- Turnstile server side validation (siteverify, single use tokens, 5 minute validity, test keys): https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Workers rate limit binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Workers KV limits (free plan: 1,000 writes a day, 1,024 byte metadata): https://developers.cloudflare.com/kv/platform/limits/
- Workers KV writes, expiry and metadata: https://developers.cloudflare.com/kv/api/write-key-value-pairs/
- Workers limits (Cron Triggers per account, free plan CPU): https://developers.cloudflare.com/workers/platform/limits/
- Workers Logs (free plan included, retention): https://developers.cloudflare.com/workers/observability/logs/workers-logs/
