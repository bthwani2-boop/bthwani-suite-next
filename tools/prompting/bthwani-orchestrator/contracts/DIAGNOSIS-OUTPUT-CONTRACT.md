# Diagnosis Output Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/01-DIAGNOSIS.md`

هذا العقد يحدد **شكل الحد الأدنى** لمخرجات التشخيص، ولا يخلق Product Truth.

## Required Header

```text
TASK_ID
TASK_NAME
REPOSITORY
BRANCH
MODE
TARGET
STARTING_REMOTE_SHA
CURRENT_DIAGNOSIS_SHA
STATUS
ORCHESTRATOR_PATH
LAST_RECONCILED_AT
```

## Required Sections

```text
1. Scope / Supported Exclusions
2. Truth & Authority Baseline
3. Capability / Evidence Limits
4. Macro Operational Blueprint
5. Relation/System Graph Summary
6. Foundations / Dependency Order
7. Journey Diagnosis
8. Cross-Surface / Cross-Layer Analysis
9. ACTUAL / INTENDED / DESIRED / CONFLICT
10. Findings Ledger
11. Coverage / Scope Delta
12. Contradictions
13. Decisions
14. Governance Delta Candidates
15. Re-Diagnosis Results
16. Final Diagnosis Gate
```

## Minimum Finding Record

```text
FINDING_ID
LOCATION / JOURNEY / SURFACE
CATEGORY / SEVERITY
OBSERVED
EXPECTED_OR_TARGET when derivable
EVIDENCE
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

يجب أن يصرح صراحةً:

```text
DISCOVERY_COMPLETE = PASS|FAIL
DIAGNOSIS_COMPLETE = PASS|FAIL
DECISION_COMPLETE = PASS|FAIL
COVERAGE_COMPLETE = PASS|FAIL
PACKAGE_READY = PASS|FAIL
```

ولا يسمح بـ`PACKAGE_READY=PASS` مع Material UNVISITED/UNCLASSIFIED/UNTRACED/UNOWNED أو unresolved required decision.