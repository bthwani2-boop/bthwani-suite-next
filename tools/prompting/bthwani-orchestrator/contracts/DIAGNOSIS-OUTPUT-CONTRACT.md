# Diagnosis Output Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/01-DIAGNOSIS.md`

## Required Header

```text
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V1
TASK_ID
TASK_NAME
REPOSITORY
BRANCH
MODE
TARGET
OBJECTIVE
ORCHESTRATOR_PATH
authoritative CREATED_AT / LAST_RECONCILED_AT
START_SHA
CURRENT_SHA
DIAGNOSIS_STATUS
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
```

`START_SHA` هو baseline التشخيص، و`CURRENT_SHA` آخر HEAD تمت مصالحته. لا تخلطهما.

The header completion gates are **global final-target gates**. Package creation and incremental Wave documentation occur before they become `YES`. In `EXECUTE_END_TO_END`, an early Wave may execute while global gates remain `NO` if that Wave's exact pre-write gate in `02-EXECUTION.md` has passed.

## Required Sections

```text
1. Truth Baseline
2. Capability / Evidence Limits
3. Scope / Universe Inventory + Supported Exclusions + Scope Delta
4. Macro Operational Blueprint
5. Relation Graph / Foundations
6. Journey-by-Journey Diagnosis + Sequential Wave Ledger
7. Findings Ledger
8. Coverage Ledger
9. Decision Ledger
10. ACTUAL / INTENDED / DESIRED / CONFLICT
11. Governance Delta Candidates + Re-Diagnosis
12. Final Diagnosis Gate
```

## Minimum Finding Record

```text
FINDING_ID
WAVE_ID / LOCATION / JOURNEY / SURFACE
CATEGORY / SEVERITY
OBSERVED
EXPECTED_OR_TARGET when derivable
EVIDENCE
COMPETING_HYPOTHESIS_CHECKED
ROOT_CAUSE_OR_MISSING_PROOF
CANONICAL_OWNER
WRITERS/READERS/CONSUMERS
BLAST_RADIUS
CONFIDENCE
STATUS
REQUIRED_ACTION_OR_DECISION
VERIFICATION
REOPEN_TRIGGER
```

## Minimum Coverage Record

```text
NODE_ID
TYPE
RELATION
STATUS
EVIDENCE
OWNER
AFFECTED_JOURNEY/SURFACE/WAVE
DISPOSITION
REOPEN_TRIGGER
```

Allowed status:

```text
UNVISITED
IN_PROGRESS
PROVEN
CONTRADICTED
DECISION_REQUIRED
BLOCKED_EXTERNAL
NOT_APPLICABLE_WITH_PROOF
```

## Sequential Wave Record

```text
WAVE_ID
DEPENDS_ON
ROOT_CAUSE_STATUS
DECISION_STATUS
REDIAGNOSIS_STATUS
SOLUTION_READY
MODE_SPECIFIC_EXIT_STATUS
NEXT_OR_REOPEN_TRIGGER
```

Shared rule:

```text
diagnose current wave
→ resolve derivable facts
→ ask only true decision(s) when required
→ bind decision
→ impact propagation
→ re-diagnose
→ solution-ready
→ mode-specific exit gate
→ next wave
```

`PREPARE_ONLY` exit means exact executable handoff documented without live mutation. `EXECUTE_END_TO_END` exit means that Wave is implemented, consumers reconciled, locally cleaned, required verification passed, governance synchronized/NA, and new scope delta classified before the next dependent Wave.

## Final Diagnosis Gate

The header gates become `YES` only when equivalent evidence proves for the complete target:

```text
ZERO material UNVISITED / UNCLASSIFIED / UNTRACED / UNOWNED
ZERO unrecorded material Finding
ZERO unresolved required Decision
ZERO silent Scope Delta
re-diagnosis complete after decisions/drift
every material Wave passed its MODE-specific exit gate
alternative-entry adversarial completeness produced no uncovered material node
CURRENT_SHA reconciled with live target head at final readiness
```

For `PREPARE_ONLY`, final `PACKAGE_READY=YES` additionally means every Wave has a root-cause execution design complete enough for another agent to execute without Product/Architecture guessing.

For `EXECUTE_END_TO_END`, final `PACKAGE_READY=YES` is a pre-closure global reconciliation state; it is not a prerequisite for earlier per-wave writes.
