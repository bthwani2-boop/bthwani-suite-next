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

## Required Sections

```text
1. Truth Baseline
2. Capability / Evidence Limits
3. Scope / Universe Inventory + Supported Exclusions + Scope Delta
4. Macro Operational Blueprint
5. Relation Graph / Foundations
6. Journey-by-Journey Diagnosis
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
LOCATION / JOURNEY / SURFACE
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
AFFECTED_JOURNEY/SURFACE
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

## Final Diagnosis Gate

The header gates become `YES` only when equivalent evidence proves:

```text
ZERO material UNVISITED / UNCLASSIFIED / UNTRACED / UNOWNED
ZERO unrecorded material Finding
ZERO unresolved required Decision
ZERO silent Scope Delta
re-diagnosis complete after decisions/drift
alternative-entry adversarial completeness produced no uncovered material node
CURRENT_SHA reconciled with live target head at readiness
```
