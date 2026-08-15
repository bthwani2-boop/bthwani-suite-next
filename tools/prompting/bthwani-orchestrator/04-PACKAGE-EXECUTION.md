# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

## 1) Package V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<sequence>.md
└── ...
```

Sequence IDs = creation history, not forced execution chain.

## 2) Overview Ownership

Overview owns task identity/SHA, `ORCHESTRATION_ROOT`, root reconciliation provenance, Macro Graph, frontier validity/source, registry, concurrency/accounting/final closure metadata.

## 3) Root Before Frontier

On every invocation/resume, do not jump directly to persisted frontier:

```text
restore root
→ reconcile Macro Graph on latest truth
→ classify foreign delta
→ reuse valid prior evidence
→ derive/revalidate frontier
```

Before first or later Sequence derivation:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
```

`new-sequence.mjs` must reject stale/unreconciled root state.

## 4) JIT / Backtracking

Normal:

```text
root-reconciled graph → prove closure boundary → create sequence JIT
```

Backtrack:

```text
current SUSPENDED_BY_DEPENDENCY
→ upstream sequence JIT
→ upstream complete/prepare
→ re-root/reconcile affected graph
→ resume descendant
```

No future speculative sequence.

## 5) EXECUTE Write Gate

Before live write:

```text
root-anchor gate PASS on live latest SHA
FRONTIER_VALID=YES
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
DECISION_IMPACT_PROPAGATED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
FINDINGS_DISPOSITIONED=YES
DEPENDENCIES_DISPOSITIONED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
CONFLICT_DOMAIN classified
EXECUTION_OWNER assigned
```

Then root fix/refactor/redesign/rebuild → required consumers → contracts/data/generated sync → obsolete/parallel truth removal → cleanup → verification/readback → COMPLETE.

## 6) Coherent Cutover

No COMPLETE with known affected consumer, contradictory truth, required migration, reachable obsolete path, workaround, or unclassified scope delta required for correctness.

## 7) Multi-Agent

Independent workers may execute in parallel only when graph proves independent conflict domains. Target branch integration is serialized and always rebuilt/reconciled on latest HEAD.

## 8) Foreign Work

Foreign/pre-existing delta is preserved. It may update graph evidence but **never becomes current work merely because it is latest**.

## 9) Global Completion

All material graph nodes + sequence records + accounting must reconcile from the root before final cleanup/governance/evidence/fresh-head/adversarial gates.
