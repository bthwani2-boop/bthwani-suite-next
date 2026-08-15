# Closure Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: closure sections of `03-VERIFICATION-CLOSURE.md`

## PREPARE_ONLY

Highest allowed task state:

```text
STOP_PREPARED / PACKAGE_READY
```

Required proof:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
```

No product DONE/CLOSED claim is permitted.

## EXECUTE_END_TO_END

Final closure requires all applicable gates:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
IMPLEMENTATION_COMPLETE
CLEANUP_COMPLETE
EVIDENCE_COMPLETE
GOVERNANCE_SYNC_COMPLETE
FRESH_HEAD_VALID
FINAL_ADVERSARIAL_PASS
```

And:

```text
ZERO known fixable in-scope defects
ZERO unresolved material findings
ZERO unverified fixes
ZERO required missing/stale evidence
ZERO required missing/unproven approvals
ZERO unresolved material decisions required for the outcome
ZERO unjustified duplicate/parallel truth
ZERO known stale/dead/legacy reachable path tied to the scope
ZERO known structural/naming/placement/context defect tied to the scope
ZERO durable resolved truth existing only in task artifacts
ZERO plan/package assertion treated as live truth without revalidation
```

## Governance Sync

Must prove, when applicable:

```text
durable decisions promoted to current canonical owner
governance ↔ Product Truth consistent
governance ↔ machine contracts/registries consistent
governance ↔ implementation consistent
governance ↔ runtime/readback consistent
```

## Fresh-Head

Record:

```text
FINAL_CANDIDATE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
candidate/head relationship
concurrent movement classification
reconciliation performed
```

Do not close the current branch head on evidence bound to an older un-reconciled candidate.

## Final Adversarial Pass

Must deliberately seek:

```text
unclosed root causes
missing consumers/writers/readers
hidden fallbacks/legacy paths
cross-surface contradictions
contract/schema/data drift
security/finance/concurrency/recovery gaps
stale runtime/config/process/data
weak/flaky/modified tests or guards
orphan/stale references
wrong ownership/placement/naming
unnecessary structural residue
```

Any material new finding reopens the task.

## Final Decision

Use only current governance decision vocabulary. If any required gate cannot be proven, record `OPEN/BLOCKED` with exact missing proof and resume point; do not invent DONE.