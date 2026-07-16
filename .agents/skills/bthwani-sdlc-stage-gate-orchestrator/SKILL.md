---
name: bthwani-sdlc-stage-gate-orchestrator
description: Route BThwani changes through governed SDLC stage gates. Use when a task mentions SDLC, stage gates, QA/security/release approval, risk acceptance, production readiness, tenant/SaaS activation governance, or asks to classify a change and choose applicable gates before closure.
---

# BThwani SDLC Stage Gate Orchestrator

## Purpose

Coordinate governed BThwani changes through formal SDLC stage gates while preserving lean, affected-only execution for ordinary changes.

## Workflow

1. Establish the local branch and commit with `git branch --show-current` and `git rev-parse HEAD`.
2. Classify the task mode: `analysis_only`, `implementation_or_closure`, or `merge_review`.
3. Build a compact change impact from the real diff or requested scope:
   - affected paths
   - services and surfaces
   - API/database/runtime/security/WLT/tenant impact
   - risk class
4. Read only the relevant governance sources:
   - `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`
   - `governance/06_EVIDENCE_AND_GATES.md`
   - `governance/07_SECURITY_AND_SECRETS.md` when security-sensitive
   - `governance/operational_journey_protocol_package/sdlc/README.md`
   - `governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md` when tenant/SaaS conditions apply
5. Select the requested stage and applicable gates.
6. Run the smallest validation command that matches the task. For SDLC package integrity use:

```powershell
pnpm run guard:sdlc -- --capability <CAPABILITY_ID> --stage <REQUESTED_STAGE> --affected
```

## Decision Rules

- Do not mutate stage state directly.
- Do not claim `CLOSED_WITH_EVIDENCE` from `guard:sdlc` alone.
- Treat missing evidence, missing approval, self-approval, unknown stage, or unowned residual risk as `FIX_REQUIRED`.
- Treat missing external access, unavailable CI/runtime, or unpushed remote ref as `HARD_BLOCKED_EXTERNAL_ONLY` only when no local progress is possible.
- Use existing specialist skills and guards for API, runtime, security, WLT, UI, and release evidence instead of duplicating their work.

## Output

Return a compact machine-readable decision when asked for a gate result:

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