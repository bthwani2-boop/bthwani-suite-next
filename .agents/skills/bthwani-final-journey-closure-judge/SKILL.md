---
name: bthwani-final-journey-closure-judge
version: 2026.08.18-v4
summary: Decide final closure from exact-candidate evidence for the material scopes actually affected by the change.
---

# bthwani-final-journey-closure-judge

## Purpose

Reconcile the exact candidate and determine whether the requested capability or change is closed with sufficient evidence. Closure is claim-based and affected-scope driven, not stage-driven.

## Invoke when

- Final closure, complete readiness, or a no-known-gap judgment is explicitly requested.
- Implementation is complete enough for final evidence reconciliation.

## Do not invoke when

- Work is still in discovery or active implementation.
- The request asks only for one local code check.

## Required evidence model

Select only scopes materially affected by the change:

- static/code: typecheck, tests, build, architecture/import and contract checks;
- data: migrations, ownership, persistence/readback where affected;
- runtime: startup, health, request/response, failure path and readback where runtime truth is claimed;
- frontend/visual/accessibility: rendered behavior and interaction where affected;
- security/privacy: authorization, session, secret, dependency or isolation evidence where affected;
- finance: ledger/payment/settlement/reconciliation evidence where affected;
- CI: executable workflow syntax/security/pinning plus actual exact-candidate run result when CI success is claimed;
- release/production: only when the user explicitly requests those environments or claims.

A scope that is not materially affected does not need ceremonial evidence. A scope that is affected cannot be skipped merely to obtain closure.

## Required method

1. Pin the exact branch and live candidate SHA.
2. Derive the smallest complete affected cone from the actual diff and dependencies.
3. Reconcile targeted verification already run for that exact candidate.
4. Require runtime/visual/security/finance evidence only when the corresponding claim or risk exists.
5. Re-check known failures and stale references after the final relevant write.
6. Run one full verification only when closure risk or verification-authority changes justify it.
7. Do not create or consult governance guard registries, workflow registries, SDLC stage state, or guard-assurance bookkeeping.
8. If required evidence is unavailable, return `NEEDS_EVIDENCE`; do not manufacture proof.

## Forbidden

- Closure from documentation or configuration alone when runtime behavior is part of the claim.
- Re-running every guard/tool merely because closure was requested.
- Treating a static check as runtime/financial/security proof outside what it actually tested.
- Inventing approvals, collaborators, branch rules, workflow results, runtime state, or production evidence.

## Required output

```text
resolved_commit_sha:
affected_scopes:
checks_and_evidence:
failed_or_missing_evidence:
open_blockers:
residual_risks:
decision:
```

Allowed decisions: `CLOSED_WITH_EVIDENCE`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, and `BLOCKED_EXTERNAL`.
