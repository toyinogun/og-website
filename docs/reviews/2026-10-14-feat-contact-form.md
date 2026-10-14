# Review, feat/contact-form, 2026-10-14

**Reviewed by**: Codex (independent reviewer, author using Claude per the execution handoff)
**Scope**: 38 changed files from `684a707` to `e4bd0d0f61fe21ecf0e346e6b730fc7b24aea0c8`, including tests and configuration. Generated Worker declarations checked as configuration context, not reviewed line by line. Untracked `docs/.agent-cache/` excluded.
**Verdict**: Changes requested

## Summary

The change adds the contact page, shared validation, delivery with a saved copy, and a weekly check. Error outcomes and browser coverage are thorough. One major platform constraint makes the saved delivery status unreliable, and two smaller failure paths need attention. This review does not clear the existing verification or board gates.

## Major

### M1. Space the two writes to the same KV key, `worker/contact.ts:265`

**Problem**: `deliver` saves `pending`, awaits the email, then immediately writes `sent` or `failed` to the same key. Cloudflare allows only one write per second to a given KV key. A quick send or immediate email rejection can therefore make the status update fail in ordinary operation. See [Cloudflare KV write limits](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).

**Why it matters**: The weekly recovery email depends on this status to identify messages needing attention. Successfully delivered messages can remain `pending` for their entire retention period. This is a predictable platform conflict, not just an exceptional storage outage. The existing tests accept both writes immediately, and local simulation is not evidence that production enforces no limit.

**Evidence**: A temporary probe bundled the unchanged handler and supplied a KV fake rejecting a second write within 1,000 ms. With an immediately successful email, the handler returned 200 after two write attempts, stored `emailStatus: pending`, and logged `contact_outbox_update` followed by `contact/sent`. This proves the handler has no protection against the documented limit, not that a production request was made.

**Suggested fix**: Keep saving the copy before sending, but make the final status write respect the per key interval and remain within the response timeout. Add coverage with a clock and a fake that enforces the interval for both quick email success and quick rejection. If you choose a different storage design, return that choice to the Tech Lead for the corresponding spec decision. Never retry the email itself.

## Minor

### m1. A synchronous limiter failure takes the unexpected path, `worker/contact.ts:312`

**Problem**: The rejection callback handles a rejected promise but not a throw before `limit()` returns one. The outer catch answers 500 with reason `unexpected`, rather than AC-9's 503 with reason `limiter_error`.

**Why it matters**: The browser reports an uncertain delivery even though delivery never began. The endpoint still fails closed, so this does not bypass spam protection.

**Evidence**: A temporary probe using `limit: () => { throw Error(...) }` returned 500 and logged `unexpected`. The existing limiter test uses an async function, which only covers promise rejection.

**Suggested fix**: Catch both forms of failure at the limiter boundary and cover the synchronous case, as you already do for delivery bindings.

### m2. Reconcile the status update log with the single log contract, `worker/contact.ts:266`

**Problem**: A failed final KV write emits `contact_outbox_update` before `finish` emits `contact`. AC-18 and the key invariant promise exactly one log line from one place, while AC-12 separately requires logging the update failure. The implementation chooses two lines and its test asserts that choice.

**Why it matters**: Log counts cannot be used as the documented request counts on this path. Neither the implementation nor the spec currently describes a consistent contract.

**Suggested fix**: Have the Tech Lead settle the log contract, then align code and coverage. Preserve the delivery outcome and the rule against personal data in logs. This is the same ambiguity the Engineer flagged, confirmed here rather than raised as a new unrelated task.

## Strengths

* Shared pure validation and outcome mapping keep browser and server behavior aligned.
* Delivery success requires at least one durable destination. Email is never retried.
* The body cap reads actual bytes. Duplicate fields, file fields, origin, token action and hostname all have explicit handling.
* Browser tests cover focus, retained text, uncertain outcomes, double submission and accessibility states.

## Test coverage and limits

Independently ran `npm test -- --reporter=dot`: 35 files passed, 848 tests passed, one skipped. Ran the two temporary handler probes described above without changing application code or tests. Inspected the browser and build test coverage; did not rerun those suites or claim a real production delivery. The Engineer's recorded build and browser results remain prior evidence.

The unit delivery fake does not enforce KV's per key write interval. The limiter failure test does not cover a synchronous throw. Those are the concrete coverage gaps behind the findings.

## Existing gates and next action

The Engineer owns M1 and the failure path fixes on this issue. The Tech Lead owns any needed spec reconciliation. Request another review after the changes.

The local Turnstile test secret action mismatch still needs the existing architect follow up. The real challenge with keyboard and screen reader remains [JSM-56](/JSM/issues/JSM-56). Production setup remains gated by [JSM-51](/JSM/issues/JSM-51), [JSM-52](/JSM/issues/JSM-52), [JSM-53](/JSM/issues/JSM-53), and [JSM-54](/JSM/issues/JSM-54). The site key and KV namespace placeholders are not merge ready. Scope documentation reconciliation remains [JSM-49](/JSM/issues/JSM-49). No duplicate tasks were created.

Scope: the contact feature has no `Review it` checkbox. No scope, spec, application or test files were edited.
