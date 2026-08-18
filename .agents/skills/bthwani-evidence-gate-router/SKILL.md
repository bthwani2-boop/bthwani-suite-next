---
name: bthwani-evidence-gate-router
version: 2026.08.18-v2
summary: Select the smallest sufficient evidence for the exact engineering claim without creating a stage or guard bureaucracy.
---

# bthwani-evidence-gate-router

## Purpose

Map a claim to the smallest set of evidence that can actually prove it.

## Invoke when

- Verification, readiness, or closure is requested and the necessary evidence is unclear.
- A material code/runtime/security/finance change spans more than one evidence type.

## Do not invoke when

- A specialist route already defines the exact targeted check and no broader claim is requested.
- The task is text-only and makes no implementation/runtime claim.

## Evidence scopes

Use only scopes materially affected by the claim:

- `static/code`
- `contracts/data`
- `runtime`
- `visual/accessibility`
- `security/privacy`
- `finance`
- `ci`
- `release/production` only when explicitly claimed

Tests are evidence for the behavior they exercise; they are not ceremonial stages.

## Routing rule

1. Pin the exact candidate SHA.
2. Identify the claimed outcome and affected cone.
3. Select targeted checks with unique assurance.
4. Add runtime/readback only when runtime truth is affected or claimed.
5. Add security/finance/visual evidence only when those risks are material.
6. Expand to full verification only when closure risk or verification-authority changes justify it.
7. Never consult or create guard-assurance registries, governance validation workflows, SDLC stages, or evidence-manifest bureaucracy.

## Forbidden

- Running every guard/tool by default.
- Requiring screenshots, full builds, or evidence packs for every small change.
- Treating a generated report, declaration, fixture, or prior run as proof for a newer commit.
- Treating a scope-specific pass as proof for unrelated scopes.
- Producing transient evidence artifacts by default.

## Required output

```text
resolved_commit_sha:
claim:
affected_scopes:
selected_checks:
executed_evidence:
missing_evidence:
decision:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `BLOCKED_EXTERNAL`.
