---
name: bthwani-sdlc-stage-gate-orchestrator
version: 2026.07.17-v3
summary: Route governed changes through G0-G10 and final closure without owning specialist approval.
---

# bthwani-sdlc-stage-gate-orchestrator

## Purpose

Own formal SDLC stage routing, applicable-gate selection, no-skip validation, and evidence reconciliation for changes that require lifecycle control.

## Invoke when

- A task requires G0-G10 transitions, formal product, governance, CI, QA, security, release, production, or residual-risk decisions.
- A high-risk capability needs an artifact manifest and change-impact contract.

## Do not invoke when

- A low-risk code-only change requires only targeted verification.
- The task is analysis-only and does not request a stage decision.
- The task attempts to introduce tenancy or classify BThwani as SaaS without an explicit owner instruction replacing `governance/product/platform-model.yaml`; return `PROTOCOL_VIOLATION` rather than creating a deferred lifecycle.

## Authority boundary

This skill owns SDLC routing and stage-state validation only. It does not approve product scope, functional acceptance, architecture, implementation, governance, CI, QA, security, release, production verification, residual risk, or final closure on behalf of their authorities.

## Resolution and workflow

1. Pin repository mode, branch, and immutable commit with `bthwani-current-workspace-authority`.
2. Read and enforce `governance/product/platform-model.yaml` before classifying commercial or isolation impact.
3. Classify task mode, risk, and real impact.
4. Require Product Truth for applicable user-visible, role-sensitive, cross-surface, workflow, or commercial changes.
5. Build or validate change-impact and artifact-manifest inputs.
6. Select the immediate next stage only; stage skipping is forbidden without explicit not-applicable evidence.
7. Run `pnpm run guard:sdlc` with artifact and impact inputs for affected formal transitions.
8. Require governance-contract and CI-workflow approvals when their impact flags are true.
9. Collect specialist evidence and approvals without manufacturing them.
10. Map the result through the canonical decision vocabulary.

## Forbidden

- Treating any lifecycle that ends before G10 as complete; the active lifecycle is G0-G10 plus `CLOSED_WITH_EVIDENCE`.
- Assuming local mode when GitHub Remote is named.
- Mutating stage state from a validator.
- Passing an affected transition without artifact, impact, Product Truth when applicable, and required approvals.
- Using stale SHA, another branch, merge ref, or documentation-only evidence as current proof.
- Treating a partner subscription, commission model, operator context, partner, store, or organization as a tenant or as evidence that BThwani is SaaS.
- Emitting deprecated gate-decision aliases; use scoped `PASS`.
- Claiming `CLOSED_WITH_EVIDENCE` from `guard:sdlc` alone.

## Required output

```json
{
  "capabilityId": "<id>",
  "branch": "<branch>",
  "resolvedCommitSha": "<sha>",
  "currentStage": "<stage>",
  "requestedStage": "<stage>",
  "applicableGates": [],
  "passedGates": [],
  "failedGates": [],
  "missingEvidence": [],
  "requiredApprovals": [],
  "separationOfDutiesPass": false,
  "openBlockers": [],
  "residualRisks": [],
  "decision": "FIX_REQUIRED"
}
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `BLOCKED_EXTERNAL`, `PROTOCOL_VIOLATION`, and `CLOSED_WITH_EVIDENCE` only after the applicable final stage with complete independent evidence.
