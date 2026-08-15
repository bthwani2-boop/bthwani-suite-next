# Closure Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `03-VERIFICATION-CLOSURE.md`

## Lifecycle State vs Governance Decision

These are different concepts:

```text
LIFECYCLE_STATE
= internal derived task state: OPEN | PREPARED | READY_TO_EXECUTE | EXECUTING | VERIFYING | BLOCKED | CLOSED

FINAL_DECISION
= optional canonical decision ID read from current governance/contracts/decision-vocabulary.json
```

Never use `OPEN`, `BLOCKED`, `DONE`, or invented aliases as canonical decisions unless current governance explicitly defines them.

## PREPARE_ONLY

Highest lifecycle state:

```text
PREPARED
```

Required gates:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
```

No final product decision/closure may be issued.

## EXECUTE_END_TO_END

Final closure requires:

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
ZERO required missing/stale/pending/cancelled evidence
ZERO required missing/unproven approvals or independent review
ZERO unresolved material decisions required for the outcome
ZERO unjustified duplicate/parallel truth
ZERO known stale/dead/legacy reachable path tied to scope
ZERO known structural/naming/placement/context defect tied to scope
ZERO durable resolved truth existing only in task artifacts
ZERO plan/package assertion treated as live truth without revalidation
```

## Candidate / Fresh Head

Record exact:

```text
FINAL_CANDIDATE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
```

For branch-head closure:

```text
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
```

Otherwise reconcile/rebuild/reverify; do not close an older head.

## Governance Sync

Prove when applicable:

```text
durable decisions promoted to canonical owner
governance ↔ Product Truth
governance ↔ machine contracts/registries
governance ↔ implementation/consumers
governance ↔ runtime/readback
```

## Final Decision

Read the current canonical vocabulary dynamically. Closure is allowed only with `closureRules.closedDecision` and all applicable evidence/approval scopes satisfied on the same immutable candidate. Any material new adversarial finding reopens the lifecycle before a final decision is issued.
