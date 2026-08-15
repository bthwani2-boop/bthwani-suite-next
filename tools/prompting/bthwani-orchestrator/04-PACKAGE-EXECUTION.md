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
- Macro Graph;
- target-wide Gap/Root-Cause Landscape + cluster/priority state;
- frontier validity/source;
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

## 5) Root + Landscape Before Frontier

On every invocation/resume, do not jump directly to persisted frontier:

```text
restore root
→ reconcile Macro Graph on latest target truth
→ classify foreign delta
→ reuse valid prior evidence
→ build/reconcile Target-Wide Gap & Root-Cause Landscape
→ correlate Findings into RC-NNN clusters
→ rank all material clusters by systemic leverage
→ adversarially challenge missing/unranked clusters
→ derive/revalidate frontier
```

Before Sequence derivation:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE=YES
LANDSCAPE_RECONCILED_SHA=LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
PRIORITY_DERIVATION_SOURCE=ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS=0
PRIMARY_FRONTIER_JUSTIFIED=YES
LANDSCAPE_ADVERSARIAL_PASS=YES
PRIORITY_POLICY=HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
```

## 6) Priority / Sequence Derivation

A Sequence must be attached to a proven `RC-NNN` and record:

```text
ROOT_CAUSE_CLUSTER_ID
PRIORITY_CLASS
PRIORITY_BASIS
DERIVATION_BASIS
```

Allowed priority classes:

```text
PRIMARY_SYSTEMIC
UPSTREAM_FOUNDATION
INDEPENDENT_PARALLEL
DEPENDENT_SECONDARY
LEAF_LOCAL
```

Default comparative priority:

```text
upstream/root-cause depth
→ blocking power
→ canonical/foundation importance
→ blast radius
→ risk/severity
→ unlock value
→ finding density/recurrence
→ structural-debt multiplier
```

Do not choose by recency, most Findings alone, changed-file count, easiest fix, last session, or Sequence number.

## 7) JIT / Backtracking

Normal:

```text
root-reconciled + prioritized landscape
→ prove highest-leverage closure boundary
→ create sequence JIT
```

Backtrack:

```text
current SUSPENDED_BY_DEPENDENCY
→ update affected root-cause landscape
→ rerank
→ upstream sequence JIT if now proven priority
→ upstream complete/prepare
→ re-root/reconcile affected graph/priority
→ resume descendant
```

No future speculative sequence.

## 8) EXECUTE Write Gate

Before live write:

```text
root-anchor gate PASS on latest integration-target SHA
root-cause-priority gate PASS
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

Then highest-leverage root fix/refactor/redesign/rebuild → required consumers → contracts/data/generated sync → obsolete/parallel truth removal → cleanup → verification/readback → COMPLETE.

## 9) Coherent Cutover

No COMPLETE with known affected consumer, contradictory truth, required migration, reachable obsolete path, workaround, or unclassified scope delta required for correctness.

## 10) Multi-Agent

Read-only discovery/diagnosis workers may operate against pinned refs and should be used across complementary diagnostic angles when useful.
Writing workers require isolated task workspaces and owned Conflict Domains.
Independent writing workers may use child worker branches/worktrees only when graph + priority model prove independent material frontiers; their deltas integrate into the task branch first.
Target integration remains serialized.

`INDEPENDENT_PARALLEL` is not inferred from different files; it requires semantic independence across canonical owner/state/contracts/data/runtime authority.

## 11) Foreign Work

Foreign/pre-existing delta is preserved. It may update graph/root-cause evidence but **never becomes current work merely because it is latest**. If it changes causal placement or leverage, invalidate/rerank only the affected landscape cone.

## 12) Post-Sequence Reconciliation

After every `PREPARED/COMPLETE`, and whenever material evidence changes causal placement:

```text
update graph + findings + RC clusters
→ close/reopen affected cluster state
→ recalculate dependency/blocking/blast-radius/risk/unlock relations
→ rerank remaining material clusters
→ adversarially challenge next frontier when landscape completeness changed
→ justify next frontier
```

Do not mechanically continue `SEQ-NNN+1`.

## 13) Integration Gate

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

## 14) PREPARE_ONLY Delivery

PREPARE package remains isolated while being prepared. Before final handoff, reconcile/integrate the final package state through the Integration Owner so the authoritative handoff is visible from the latest Integration Target; then set `INTEGRATION_COMPLETE=YES`.

## 15) Global Completion

All material graph nodes + Findings + Root-Cause Clusters + sequence records + accounting must reconcile from the root before final cleanup/governance/evidence/fresh-head/adversarial gates.

Final closure/handoff additionally requires:

```text
TARGET_LANDSCAPE_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
UNRANKED_MATERIAL_CLUSTERS=0
LANDSCAPE_ADVERSARIAL_PASS=YES
```

plus task-isolation provenance and completed integration.
