# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

## 1) New Invocation = New Package

```text
NEW INVOCATION
→ unique TASK/PACKAGE identity
→ dedicated TASK_BRANCH from exact latest INTEGRATION_TARGET SHA
→ isolated workspace
→ NEW 00-OVERVIEW.md
```

Existing package reuse is forbidden unless the user explicitly requests resume of that exact package.

Package history may be searched/reused as evidence after freshness/root-placement validation; it never authorizes implicit continuation.

## 2) Package V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<sequence>.md
└── ...
```

Sequence IDs = creation history, not forced execution chain.

## 3) Overview Ownership

Overview owns:
- task/package identity and invocation origin;
- integration target + task branch + workspace isolation;
- `ORCHESTRATION_ROOT`;
- root reconciliation provenance;
- Macro Graph/frontier validity/source;
- registry/concurrency/accounting/final closure metadata.

## 4) Workspace Bootstrap

Before package creation:

```text
resolve exact INTEGRATION_TARGET HEAD
→ derive unique TASK_BRANCH
→ create TASK_BRANCH from exact target HEAD
→ LOCAL: create dedicated worktree
   REMOTE/API: use TASK_BRANCH as isolated remote workspace
→ prove task isolation
→ create package inside/on TASK_BRANCH
```

`INTEGRATION_TARGET` is never the normal working branch.

## 5) Root Before Frontier

On every invocation/resume, do not jump directly to persisted frontier:

```text
restore root
→ reconcile Macro Graph on latest target truth
→ classify foreign delta
→ reuse valid prior evidence
→ derive/revalidate frontier
```

Before Sequence derivation:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
```

## 6) JIT / Backtracking

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

## 7) EXECUTE Write Gate

Before live write:

```text
root-anchor gate PASS on latest integration-target SHA
task-isolation gate PASS
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

## 8) Coherent Cutover

No COMPLETE with known affected consumer, contradictory truth, required migration, reachable obsolete path, workaround, or unclassified scope delta required for correctness.

## 9) Multi-Agent

Read-only discovery/diagnosis workers may operate against pinned refs.
Writing workers require isolated task workspaces and owned Conflict Domains.
Independent writing workers may use child worker branches/worktrees if graph-proven independent; their deltas integrate into the task branch first.
Target integration remains serialized.

## 10) Foreign Work

Foreign/pre-existing delta is preserved. It may update graph evidence but **never becomes current work merely because it is latest**.

## 11) Integration Gate

Before target mutation:

```text
task branch work complete for intended integration unit
→ resolve latest INTEGRATION_TARGET
→ classify target movement
→ semantic rebase/rebuild task delta
→ rerun invalidated checks
→ assign single INTEGRATION_OWNER
→ non-force/fast-forward-safe integration
→ INTEGRATION_COMPLETE=YES
```

No direct integration-target writes by ordinary execution workers.

## 12) PREPARE_ONLY Delivery

PREPARE package remains isolated while being prepared. Before final handoff, reconcile/integrate the final package state through the Integration Owner so the authoritative handoff is visible from the latest Integration Target; then set `INTEGRATION_COMPLETE=YES`.

## 13) Global Completion

All material graph nodes + sequence records + accounting must reconcile from the root before final cleanup/governance/evidence/fresh-head/adversarial gates.

Final closure/handoff additionally requires task-isolation provenance and completed integration.
