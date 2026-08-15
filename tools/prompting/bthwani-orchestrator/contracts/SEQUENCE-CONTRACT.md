# Sequence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/NNN-<sequence-name>.md`

## Identity / Graph / Isolation / Priority Fields

```text
TASK_ID
REPOSITORY
BRANCH
TASK_BRANCH
MODE
SEQUENCE_ID
SEQUENCE_NAME
SEQUENCE_ORDER
BASE_SHA
RECONCILED_HEAD_SHA
ROOT_CAUSE_CLUSTER_ID
PRIORITY_CLASS
PRIORITY_BASIS
DERIVATION_BASIS
DEPENDS_ON
BLOCKS
UNLOCKS
CONFLICT_DOMAIN
EXECUTION_OWNER
PARALLEL_SAFETY
SUSPENDED_BY
RESUME_AFTER
INVALIDATES
SEQUENCE_STATUS
```

`BRANCH` = Integration Target identity. `TASK_BRANCH` = isolated working branch and must match the owning Overview.

`ROOT_CAUSE_CLUSTER_ID` must be an `RC-NNN` material cluster present in the current target-wide landscape.

Allowed `PRIORITY_CLASS`:

```text
PRIMARY_SYSTEMIC
UPSTREAM_FOUNDATION
INDEPENDENT_PARALLEL
DEPENDENT_SECONDARY
LEAF_LOCAL
```

`PRIORITY_BASIS` must explain why this cluster is the highest-leverage current frontier or why it safely parallels another frontier. It must compare causal/dependency position, blocking power, canonical/foundation importance, blast radius, risk/severity, unlock value, finding density/recurrence and relevant structural debt. No priority by recency, most Findings alone, easiest fix, last session or Sequence number.

Allowed `SEQUENCE_STATUS`:

```text
DIAGNOSING / DECISION_REQUIRED / SOLUTION_READY / READY_TO_EXECUTE
EXECUTING / VERIFYING / SUSPENDED_BY_DEPENDENCY / REOPENED
BLOCKED_EXTERNAL / PREPARED / COMPLETE
```

`PARALLEL_SAFETY`: `UNPROVEN / SERIAL_REQUIRED / PROVEN_INDEPENDENT`.

`PRIORITY_CLASS=INDEPENDENT_PARALLEL` requires graph-proven semantic independence and `PARALLEL_SAFETY=PROVEN_INDEPENDENT` before live parallel write.

## Gate Fields

```text
ROOT_CAUSE_PROVEN: YES|NO
DECISIONS_RESOLVED: YES|NO
DECISION_IMPACT_PROPAGATED: YES|NO
REDIAGNOSIS_COMPLETE: YES|NO
IMPACT_MAPPED: YES|NO
FINDINGS_DISPOSITIONED: YES|NO
DEPENDENCIES_DISPOSITIONED: YES|NO
VERIFICATION_DEFINED: YES|NO
SOLUTION_READY: YES|NO
IMPLEMENTATION_COMPLETE: YES|NO
CONSUMERS_RECONCILED: YES|NO
LOCAL_CLEANUP_COMPLETE: YES|NO
VERIFICATION_PASS: YES|NO
GOVERNANCE_SYNC: YES|NO|NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED: YES|NO
```

## Required Sections

```text
1. Scope / Context / Graph Position
2. Diagnosis / Findings / Disposition
3. Root Cause / Blast Radius
4. Decisions / Impact Propagation / Re-Diagnosis
5. Exact Target State / Coherent Cutover
6. Treatment / Execution
7. Consumers / Contracts / Data / Governance
8. Cleanup
9. Verification / Runtime / Evidence
10. Sequence Exit / Suspension / Reopen
```

Section 1 must preserve the cluster/priority provenance and justify why this Sequence outranks or safely parallels other open material clusters.

## Priority Invalidation

If a new finding/decision/dependency/foreign delta/upstream fix changes the cluster definition, canonical owner, dependency position, blocking power, blast radius, risk or unlock value:

```text
owning Overview priority model becomes stale for the affected landscape cone
→ re-cluster/re-rank
→ rejustify frontier
→ suspend/reopen this Sequence when required
```

A Sequence cannot use an old `PRIORITY_BASIS` to bypass a newly proven upstream/foundation root cause.

## PREPARE_ONLY terminal

`PREPARED` + all common solution/accounting gates YES + `IMPLEMENTATION_COMPLETE=NO`.

## EXECUTE_END_TO_END terminal

`COMPLETE` + all common gates YES + implementation/consumers/cleanup/verification/governance/scope-delta gates PASS.

A Sequence may be suspended/reopened by graph evidence. Dependent work cannot falsely close around unresolved upstream dependency. Parallel execution requires distinct proven conflict domains, explicit execution ownership, isolated writing workspaces and priority-class consistency. Integration Target mutation remains serialized through the package Integration Owner.
