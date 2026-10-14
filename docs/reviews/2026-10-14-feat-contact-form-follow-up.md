# Review, feat/contact-form follow up, 2026-10-14

**Reviewed by**: Codex, independent of the Claude author
**Scope**: `e4bd0d0..d358fe5`, three Worker source and test files plus the committed first review. This supplements `2026-10-14-feat-contact-form.md` and supersedes its verdict for this revision.
**Verdict**: Approve with nits

## Summary

The requested delivery fix is sound. M1 and m1 are resolved, with meaningful regression coverage. There are no remaining blockers or majors in this code review. The existing verification and production setup gates remain open.

## Resolved findings

* **M1**, `worker/contact.ts`: the handler measures from completion of the first KV write, waits the remainder of a 1,100 ms interval after the email call, then updates the record. A slow email needs no extra wait. A failed initial save causes no wait or rewrite. The email is still sent at most once. The fake KV now rejects writes less than one second apart, and tests cover quick success, quick rejection, slow delivery and an unsaved copy.
* **m1**, `worker/contact.ts`: the limiter boundary now catches synchronous throws as well as rejected promises and returns the specified 503 with `limiter_error`. A dedicated regression test checks the result and alarm.

## Minor

### m2. Logging contract still needs reconciliation, `worker/contact.ts:277`

**Problem**: A failed status update still produces a separate `contact_outbox_update` line before the request outcome line. The earlier review identified the conflicting AC-12 and AC-18 requirements.

**Why it matters**: Two lines cannot be counted as one request without filtering by event.

**Suggested fix**: Complete the Tech Lead's contract decision on [JSM-57](/JSM/issues/JSM-57), then align the implementation and tests if required. This remains a tracked minor, not a new request for changes. Concurrent spec edits on that issue are outside this review's fixed commit scope.

## Strengths

* The fix preserves saving before sending and avoids retrying the email.
* The fake enforces the platform constraint across the delivery tests, rather than merely asserting a sleep call.
* The timing effect is injected at the Worker edge, so regression tests use a deterministic clock.

## Test coverage and limits

Independently ran `npm test -- --reporter=dot`: 35 test files passed, 853 tests passed, one skipped. Confirmed Worker files matched `d358fe5` before and after the run. The shared checkout advanced to `ad14e01` during review; concurrent spec changes were not included in this approval. No application code, tests, specs or scope files were edited by this review.

The browser code did not change. Build and browser results from the Engineer remain prior evidence, not independently rerun results. This code review does not establish production delivery or real widget accessibility.

## Existing gates and next action

Approval completes the independent code review stage only. The Tech Lead and Engineer still need the local verification decision on [JSM-57](/JSM/issues/JSM-57), the manual challenge evidence on [JSM-56](/JSM/issues/JSM-56), and the setup gates on [JSM-51](/JSM/issues/JSM-51), [JSM-52](/JSM/issues/JSM-52), [JSM-53](/JSM/issues/JSM-53) and [JSM-54](/JSM/issues/JSM-54). Replace the production site key and KV namespace placeholders before merge. No merge, deployment or feature completion is authorized by this review.

Scope: the contact feature had no `Review it` checkbox in the reviewed revision. The original review is preserved.
