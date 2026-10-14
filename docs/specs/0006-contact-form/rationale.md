# 0006. Contact form: rationale

## Context

The contact form is scope feature 11, tagged `Beta`, and the scope calls it the point of the whole site: the one place a hiring reader or a client reader turns into a conversation. It is also the one feature that can fail silently. A form that accepts a message and drops it costs you work and tells nobody, which is worse than having no form at all. The scope's done line asks for exactly that to be impossible: a message reliably reaches you, the sender sees a clear success or failure, bad input and spam are handled, the form works by keyboard to WCAG 2.2 AA (spec 0003), and a delivery failure is visible rather than silent.

The foundation constrains how. Spec 0001 made the site a fully pre rendered Astro build served as Cloudflare Workers static assets, with no adapter, because an adapter turns free static requests into metered Worker invocations; `tests/stack-contract.test.ts` even asserts that `wrangler.jsonc` has no `main`. Spec 0001 also recorded what it did not settle: a handler can **run** on the domain for free, but free end to end **delivery** to an inbox was not established, and ordinary page requests must stay outside script execution. The Cloudflare account is on the free plan and is shared with two unrelated Workers (`n8n`, `invoice2-email-worker`), which share its daily request allowance and its 5 Cron Triggers. Your running cost target is at or near zero.

The form handles other people's personal data (a name, an email address and free text), much of it from the EU, so the GDPR applies in its plain form: say what you collect, why, where it goes and how to ask for deletion. The scope deferred both a Privacy note and Error monitoring, and noted that without monitoring "nothing will tell you when the contact form starts failing silently". The repository is public, so nothing secret, including your inbox address, may live in it.

Smaller forces: the design system has no error colour and a contract test that pins exactly eight colour tokens; the header nav and the call to action (`SITE.contact`, spec 0004) were built to be repointed in one line; the browser tests run against `astro preview`, which serves only static files; and the phone width floor is 320 pixels with a 20 pixel gutter, leaving 280 pixels for any widget.

## Options considered

The design conversation settled the shape question by question (all 21 answers took the recommended pick; the record is on JSM-47). The load bearing choice is how the form posts and how the message is delivered, compared here as whole approaches.

### Option 1: A Worker script in the same Worker, for `/api/*` only, sending through the `send_email` binding

Add `main` and `assets.run_worker_first: ["/api/*"]` to the existing `og-website` Worker. Pages, images and fonts keep being served as static assets without running code; only `/api/contact` runs the script. The script validates, checks Turnstile and the rate limit, and sends with Cloudflare's `send_email` binding to your verified inbox (basis: spec 0001, Consequences; Cloudflare Workers static assets, `run_worker_first`; Cloudflare Email Service pricing).

**Pros**:
- One project, one deploy, one domain; Workers Builds already deploys it.
- Sends to a verified destination address are free on every plan and do not count toward any sending quota, so delivery is free end to end, the question spec 0001 left open.
- No new vendor or account; secrets stay Worker secrets.
- Page requests stay free static asset requests.

**Cons**:
- The Worker is no longer script free; spec 0001's contract test changes, and the guard becomes the `run_worker_first` list.
- `send_email` reaches only verified addresses, so the site can never email the sender (no "copy of your message"), without the paid plan.
- A new code area (`worker/`) with its own types and tests.

### Option 2: A separate Worker routed at `toyintest.org/api/*`

Same handler and delivery, in a second Worker with its own `wrangler.jsonc`, attached by a route.

**Pros**:
- The site Worker stays exactly as spec 0001 left it, with no script.
- The form handler can be deployed and rolled back on its own.

**Cons**:
- Two projects, two deploy pipelines and two configs to keep in step, for one endpoint.
- Route ordering between a custom domain Worker and a route Worker is one more thing to get wrong.
- Same cost and limits as Option 1, so it buys separation the site does not need.

### Option 3: A third party form service (Formspree, Web3Forms and similar)

The form posts straight to a hosted service that emails you; no server code.

**Pros**:
- Fastest to ship; spam filtering and delivery are the vendor's problem.
- The site stays fully static, and spec 0001's contract test stays as it is.

**Cons**:
- Your one conversion point depends on a vendor's free tier limits, branding, uptime and policy changes; spec 0001 rejected a host partly to avoid exactly this.
- Personal data passes through and is often stored by the vendor, so the privacy note must name a processor you do not control.
- Failure handling is whatever the vendor returns.

### Option 4: Option 1, plus a stored copy of every message (D1 or KV)

Same as Option 1, but each message is also written to a database before the email goes out.

**Pros**:
- No message is ever lost, even if email breaks; you could read them in the dashboard.

**Cons**:
- You then hold other people's data indefinitely and owe a retention rule, deletion handling and a longer privacy note.
- Another binding and its free tier limits (D1 now enforces daily limits on the free plan).
- The failure it guards against is already visible to the sender, who keeps their text.

## Rationale

Option 1 is the only one that meets every force at once. It keeps page requests free and static (spec 0001's real concern was invocations on every page view, not the existence of a script), it answers spec 0001's open question about free delivery with a documented yes, and it adds no vendor to the site's single conversion point. Option 2 buys separation at the price of a second pipeline for one endpoint, the kind of operational cost a one person site should not carry. Option 3 is the fastest path but puts your most important page behind someone else's free tier and adds a data processor to the privacy story. Option 4 solves a problem the design already handles visibly, by keeping the sender's text and telling them plainly, and it would turn a stateless form into a data store you must govern.

The "never silent" requirement shaped the rest. A failed send cannot email you about itself, so monitoring could not be another email on failure; instead every outcome is logged, and a weekly email sent through the very same binding acts as a dead man's switch (a signal whose absence is the alarm), which also probes whether the Turnstile secret still works. The sender side is covered by mapping every possible response, plus network errors and a 15 second timeout, to a visible message that keeps their text. The Worker never retries a send, because a retry after an ambiguous failure can duplicate a message, and a duplicate the sender caused by pressing Send again is easier to live with than one the server made up (basis: idempotency for external side effects).

The spam defence is layered because each layer covers a different attacker: the honeypot stops naive form fillers for free, the rate limit binding caps a script hammering the endpoint before it costs a Turnstile call, and Turnstile siteverify (with action and hostname checks, single use tokens) stops the rest (basis: Cloudflare Turnstile server side validation; rate limit any public endpoint). Validation runs before Turnstile so a typo does not burn the visitor's token. Managed mode with `appearance: 'interaction-only'` keeps the widget out of sight for nearly everyone, which is what you chose when you picked "Managed"; at the 320 pixel floor the widget uses its compact size, because the flexible size needs 300 pixels and the column has 280.

Errors use text, weight and a border in the `text` colour rather than a new red token. WCAG requires errors to be identified in text, not in a particular colour (basis: WCAG 2.2, 3.3.1 Error Identification and 1.4.1 Use of Color), and a new token would break the eight token design contract for one component. The inbox lives in a Worker secret because the repository is public, and the binding is left unrestricted in config (it can still reach only verified addresses), so a wrong secret fails loudly instead of mailing a stranger. The privacy note sits inline under the form because it is read at the moment it matters, and the honest minimum under the GDPR is purpose, storage and how to ask for deletion (basis: GDPR Articles 13 and 17, transparency and erasure).

## References

**Project sources**:
- Spec 0001 (`docs/specs/0001-stack-architecture/index.md`): no adapter, the free static asset contract, the open delivery question, the shared account and its allowances.
- Spec 0003 and `design.md`: WCAG 2.2 AA target, the eight colour token contract, focus ring, 320 pixel floor.
- Spec 0004: `SITE.contact` as the one contact target through `CallToAction`; spec 0005: the closing text note.
- `tests/stack-contract.test.ts`, `playwright.config.ts` (`astro preview`), `src/components/Container.astro` (`px-5` gutter).
- `AGENTS.md` Rules: side effects at the edges, expected failures as return values, pure helpers in `src/lib/`.
- JSM-47 question cards, rounds 1 and 2 (the 21 design answers).

**Practices & standards**:
- Idempotency for external side effects (no server retry of a send).
- Rate limit any public endpoint.
- Dead man's switch monitoring (an expected periodic signal whose absence is the alarm).
- WCAG 2.2: 1.4.1 Use of Color, 3.3.1 Error Identification, 3.3.3 Error Suggestion, 4.1.3 Status Messages, 2.5.8 Target Size (Minimum).
- GDPR Articles 13 (information to be provided) and 17 (erasure).

**Links** (checked against Cloudflare's documentation on 2026-10-14):
- Email Service pricing (sends to verified destination addresses are free on all plans): https://developers.cloudflare.com/email-service/platform/pricing/
- Email Routing destination addresses: https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- Email Service Workers API (`send_email` binding, `send()`): https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- Static assets `run_worker_first` route patterns: https://developers.cloudflare.com/workers/static-assets/binding/
- Turnstile server side validation (siteverify, single use tokens, 5 minute validity): https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Workers rate limit binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Workers limits (Cron Triggers per account, free plan CPU): https://developers.cloudflare.com/workers/platform/limits/
- Workers Logs (free plan included, retention): https://developers.cloudflare.com/workers/observability/logs/workers-logs/
