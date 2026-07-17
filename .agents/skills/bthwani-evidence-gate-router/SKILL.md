---
name: bthwani-evidence-gate-router
version: 2026.07.17-v1
summary: Select the smallest sufficient evidence scopes and checks without granting approval or closure.
---

# bthwani-evidence-gate-router

## Purpose

Classify the evidence needed for a claim and select the smallest sufficient static, contract, test, runtime, visual, QA, security, release, or production checks.

## Invoke when

- A task requests verification, readiness, closure, or a decision whose evidence scope is unclear.
- A high-risk change requires independent or multi-scope evidence.
- Another skill needs a precise verification route.

## Do not invoke when

- The task is text-only and makes no implementation, readiness, or closure claim.
- A specialist skill already defines the exact targeted check and no broader decision is requested.

## Authority boundary

This skill owns evidence-scope routing only. It cannot approve its own evidence, change stage state, accept residual risk, approve release, or declare final closure.

## Evidence scopes

- `STATIC_CODE`
- `SCHEMA_CONTRACT`
- `UNIT_TEST`
- `INTEGRATION_TEST`
- `RUNTIME_SMOKE`
- `VISUAL_FLOW`
- `INDEPENDENT_QA`
- `SECURITY_REVIEW`
- `RELEASE_READINESS`
- `PRODUCTION_VERIFICATION`

Use `CODE_BASED_LEAN` for ordinary work. Escalate only when the claim, risk, or requested stage requires it. Evidence must be tied to the same commit for any readiness or closure decision.

## Forbidden

- Requiring broad builds, screenshots, or evidence packs for every small change.
- Treating a generated report, declaration, runtime map, or prior run as proof for a newer commit.
- Mapping a scope-specific pass directly to `CLOSED_WITH_EVIDENCE`.
- Producing or committing transient evidence by default.

## Required output

```text
evidence_mode:
claim:
required_scopes:
selected_checks:
same_commit_required:
independent_approvals:
missing_evidence:
decision:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `OUT_OF_SCOPE_FOR_THIS_JOURNEY`.
