---
name: bthwani-sdlc-stage-gate-orchestrator
version: 2026.07.17-v2
summary: Route governed changes through G0-G9 without owning specialist approval or final closure.
---

# bthwani-sdlc-stage-gate-orchestrator

## Purpose

Own formal SDLC stage routing, applicable-gate selection, no-skip validation, and evidence reconciliation for changes that require lifecycle control.

## Invoke when

- A task requires G0-G9 stage transitions, formal QA/security/release approval, production readiness, or residual-risk acceptance.
- A high-risk capability needs an artifact manifest and change-impact contract.

## Do not invoke when

- A low-risk code-only change requires only targeted verification.
- The task is analysis-only and does not request a stage decision.
- A commercial SaaS activation decision is requested while SaaS implementation remains explicitly deferred.

## Authority boundary

This skill owns SDLC routing and stage-state validation only. It does not approve product scope, functional acceptance, architecture, implementation, QA, security, release, production verification, residual risk, or final closure on behalf of those authorities.

## Resolution and workflow

1. Use `bthwani-current-workspace-authority` to pin remote or local mode, branch, and immutable commit.
2. Classify task mode and risk from the real diff or declared scope.
3. Require Product Truth for user-visible, role-sensitive, cross-surface, workflow, or commercial capabilities.
4. Build or validate change impact and artifact manifest.
5. Select the immediate next stage only; stage skipping is forbidden.
6. Run `pnpm run guard:sdlc` with artifact and impact inputs for affected formal transitions.
7. Collect specialist evidence and approvals without manufacturing them.
8. Map the result through `governance/contracts/decision-vocabulary.json`.

## Forbidden

- Assuming local mode when the named source is GitHub Remote.
- Mutating stage state from a validator.
- Passing an affected formal transition without artifact, impact, Product Truth when applicable, and required approvals.
- Using stale SHA, another branch, merge ref, or documentation-only evidence as current proof.
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

Allowed decisions: `GATE_PASS`, `FIX_REQUIRED`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `BLOCKED_EXTERNAL`, and `CLOSED_WITH_EVIDENCE` only at the applicable final stage with complete independent evidence.
