---
name: bthwani-evidence-gate-router
version: 2026.07.17-v1
summary: Select the smallest sufficient canonical evidence scopes and checks without granting approval or closure.
---

# bthwani-evidence-gate-router

## Purpose

Classify the evidence needed for a claim and route it through the canonical evidence scopes in `governance/contracts/decision-vocabulary.json`.

## Invoke when

- A task requests verification, readiness, closure, or a decision whose evidence scope is unclear.
- A protected change requires independent or multi-scope evidence.
- Another governed skill needs a precise verification route.

## Do not invoke when

- The task is text-only and makes no implementation, readiness, or closure claim.
- A specialist skill already defines the exact targeted check and no broader decision is requested.

## Authority boundary

This skill owns evidence-scope routing only. It cannot approve its own evidence, change stage state, accept residual risk, approve product, governance, CI, finance, QA, security, release, production, or final closure.

## Canonical evidence scopes

- `static`
- `product`
- `runtime`
- `visual`
- `qa`
- `security`
- `finance`
- `isolation`
- `governance`
- `ci`
- `release`
- `production`

`static` is always applicable to repository implementation. Other scopes are derived from declared impact. Tests are evidence inside the scope they exercise; they are not separate closure scopes that bypass Product Truth, runtime, finance, security, or release ownership.

Use `CODE_BASED_LEAN` for ordinary work. Escalate only when claim, risk, impact, or requested stage requires it. Read `governance/guards/guard-assurance.json` before treating a guard result as positive evidence.

## Forbidden

- Using obsolete scope names such as `STATIC_CODE`, `SCHEMA_CONTRACT`, or `RUNTIME_SMOKE` as canonical artifact scopes.
- Requiring broad builds, screenshots, or evidence packs for every small change.
- Treating a generated report, declaration, runtime map, seed, fixture, or prior run as proof for a newer commit.
- Mapping a scope-specific `PASS` directly to `CLOSED_WITH_EVIDENCE`.
- Omitting `finance` for WLT impact or `isolation` for tenant/isolation impact.
- Producing or committing transient evidence by default.

## Required output

```text
resolved_commit_sha:
claim:
impact:
applicable_scopes:
selected_checks:
guard_assurance_classes:
same_commit_required:
required_approvals:
missing_evidence:
decision:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, `OUT_OF_SCOPE_FOR_THIS_JOURNEY`, and `PROTOCOL_VIOLATION`.
