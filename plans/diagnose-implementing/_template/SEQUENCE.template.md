# __SEQUENCE_ID__ — __SEQUENCE_TITLE__

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
SEQUENCE_ID: __SEQUENCE_ID__
SEQUENCE_NAME: __SEQUENCE_NAME__
SEQUENCE_ORDER: __SEQUENCE_ORDER__
BASE_SHA: __BASE_SHA__
DERIVATION_BASIS: __DERIVATION_BASIS__
DEPENDS_ON: __DEPENDS_ON__
SEQUENCE_STATUS: DIAGNOSING
ROOT_CAUSE_PROVEN: NO
DECISIONS_RESOLVED: NO
REDIAGNOSIS_COMPLETE: NO
IMPACT_MAPPED: NO
VERIFICATION_DEFINED: NO
SOLUTION_READY: NO
IMPLEMENTATION_COMPLETE: NO
CONSUMERS_RECONCILED: NO
LOCAL_CLEANUP_COMPLETE: NO
VERIFICATION_PASS: NO
GOVERNANCE_SYNC: NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED: NO

> One file = one coherent execution/closure sequence. Do not split diagnosis/execution/verification into separate files. Do not create this file before its boundary is proven from the Dependency Graph.

## 1. Scope / Context

- Why this Sequence exists:
- Exact dependency boundary:
- Depends on:
- Unlocks:
- In-scope journeys/surfaces/contracts/data/runtime:
- Supported exclusions + proof:

## 2. Diagnosis / Findings

Record ACTUAL / INTENDED / DESIRED / CONFLICT, exact evidence, findings, failure/recovery, cross-surface/cross-layer traces.

## 3. Root Cause / Blast Radius

- Root cause:
- Competing hypotheses rejected:
- Canonical owner/source of truth:
- Writers/readers/consumers:
- States/transitions/handoffs:
- Security/data/finance/operational risks:

## 4. Decisions / Re-Diagnosis

Record only true Decision Boundaries. After each resolved decision: impact propagation + affected re-diagnosis + new findings/decisions.

## 5. Exact Target State

Define the final semantic/architectural state for this Sequence without implementation ambiguity.

## 6. Treatment / Execution

### PREPARE_ONLY
Specify exact root treatment, order, paths/symbols/contracts/data changes, obsolete removals, acceptance. Do not fabricate actual execution.

### EXECUTE_END_TO_END
Record planned action and actual change/commit/candidate evidence as it occurs.

## 7. Consumers / Contracts / Data / Governance

| Item | Before | Required/Actual transition | After | Verification |
|---|---|---|---|---|

Governance durable truth:
- classification:
- canonical owner:
- PREPARE pending semantic change / EXECUTE actual promotion:
- parity evidence:

## 8. Cleanup

Trace and resolve dead/stale/duplicate/legacy/compatibility/workaround/reference/naming/ownership residue related to this Sequence.

## 9. Verification / Runtime / Evidence

| Verification ID | Claim | Check/source | Candidate/runtime provenance | Result | Proof limit | Reopen trigger |
|---|---|---|---|---|---|---|

Runtime/E2E/readback only marked PASS when actually executed on fresh applicable state.

## 10. Sequence Exit Gate / Reopen

### Common solution-ready gate

```text
ROOT_CAUSE_PROVEN
DECISIONS_RESOLVED
REDIAGNOSIS_COMPLETE
IMPACT_MAPPED
VERIFICATION_DEFINED
SOLUTION_READY
```

### PREPARE_ONLY
Terminal: `SEQUENCE_STATUS=PREPARED`; no live implementation claim.

### EXECUTE_END_TO_END
Terminal: `SEQUENCE_STATUS=COMPLETE` plus implementation/consumers/cleanup/verification/governance/scope-delta gates.

Reopen triggers:
- new material dependency/finding/decision
- related head drift
- invalidated evidence
- failed verification/runtime
- governance/contract truth change
