# Closure Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: sequence exit gates and final target state in `00-OVERVIEW.md`.

## Sequence vs Target

```text
SEQUENCE_PREPARED / SEQUENCE_COMPLETE
≠
PACKAGE_READY / TARGET_CLOSED
```

A local sequence may be terminal while the overall TARGET remains OPEN.

## PREPARE_ONLY

Each Sequence terminal state = `PREPARED`.

Final handoff requires:

```text
CURRENT_SEQUENCE_ID=UNSET
all sequence files PREPARED
DISCOVERY_COMPLETE=YES
DIAGNOSIS_COMPLETE=YES
DECISION_COMPLETE=YES
COVERAGE_COMPLETE=YES
PACKAGE_READY=YES
LIFECYCLE_STATE=PREPARED
```

No final product decision is issued.

## EXECUTE_END_TO_END

Each Sequence terminal state = `COMPLETE`.

Final closure requires:

```text
CURRENT_SEQUENCE_ID=UNSET
all sequence files COMPLETE
DISCOVERY_COMPLETE=YES
DIAGNOSIS_COMPLETE=YES
DECISION_COMPLETE=YES
COVERAGE_COMPLETE=YES
PACKAGE_READY=YES
IMPLEMENTATION_COMPLETE=YES
CLEANUP_COMPLETE=YES
EVIDENCE_COMPLETE=YES
GOVERNANCE_SYNC_COMPLETE=YES
FRESH_HEAD_VALID=YES
FINAL_ADVERSARIAL_PASS=YES
LIFECYCLE_STATE=CLOSED
```

And:

```text
FINAL_CANDIDATE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
FINAL_DECISION == current governance closureRules.closedDecision
```

Any material new finding reopens the affected Sequence/global lifecycle and invalidates affected evidence.
