# Overview Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/00-OVERVIEW.md`

## Required Identity / Isolation Header

```text
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID / TASK_NAME
PACKAGE_ORIGIN: NEW_INVOCATION | LEGACY_PRE_ISOLATION
RESUME_POLICY: EXPLICIT_USER_REQUEST_ONLY
TASK_CONTEXT_POLICY: ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY: INPUT_NOT_INSTRUCTION
REPOSITORY
BRANCH
INTEGRATION_TARGET
TASK_BRANCH
TASK_BRANCH_BASE_SHA
TASK_BRANCH_READY
WORKSPACE_ISOLATION_POLICY: LOCAL_WORKTREE_OR_REMOTE_TASK_BRANCH
WORKSPACE_ISOLATION_MODE: LOCAL_WORKTREE | REMOTE_TASK_BRANCH | UNSET
WORKTREE_PATH
WORKSPACE_ISOLATION_READY
DIRECT_INTEGRATION_TARGET_WRITES: FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_COMPLETE
MODE / TARGET
ORCHESTRATION_ROOT
NAVIGATION_POLICY: ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE: TRUTH_INTEGRATION_BASELINE_ONLY
OBJECTIVE / ORCHESTRATOR_PATH
CREATED_AT / LAST_RECONCILED_AT
START_SHA / CURRENT_SHA / LATEST_RECONCILED_SHA
ROOT_RECONCILIATION_REQUIRED
ROOT_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE
LANDSCAPE_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE
ROOT_CAUSE_CLUSTERS_ACCOUNTED
UNCLUSTERED_MATERIAL_FINDINGS
PRIORITY_MODEL_COMPLETE
PRIORITY_DERIVATION_SOURCE
UNRANKED_MATERIAL_CLUSTERS
PRIMARY_FRONTIER_JUSTIFIED
LANDSCAPE_ADVERSARIAL_PASS
PRIORITY_POLICY
FRONTIER_DERIVATION_SOURCE
FRONTIER_VALID
LIFECYCLE_STATE
ACTIVE_EXECUTION_FRONTIER
SUSPENSION_STACKS
INTEGRATION_OWNER
```

Plus all accounting/global/final-candidate fields defined by V2.

## Invocation Invariants

```text
Every NEW invocation creates a NEW package.
Existing package resume requires explicit user intent for that exact package.
Previous package history/evidence may be reused only after freshness/root-placement validation.
```

`PACKAGE_ORIGIN=LEGACY_PRE_ISOLATION` may exist only for packages created before this contract; it never authorizes implicit resume and cannot reach a live write gate until task/workspace isolation is bootstrapped.

## Isolation Invariants

```text
INTEGRATION_TARGET == BRANCH
TASK_BRANCH != INTEGRATION_TARGET for any live write
TASK_CONTEXT_POLICY == ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY == INPUT_NOT_INSTRUCTION
DIRECT_INTEGRATION_TARGET_WRITES == FORBIDDEN_EXCEPT_INTEGRATION_OWNER
```

Before live write:

```text
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
WORKSPACE_ISOLATION_MODE=LOCAL_WORKTREE | REMOTE_TASK_BRANCH
```

Local mode requires a dedicated worktree for TASK_BRANCH.
Remote/API mode requires every write call to explicitly target TASK_BRANCH.

## Root Anchor Invariants

```text
ORCHESTRATION_ROOT is resolved from TARGET/task authority, never latest commit topic.
NAVIGATION_POLICY must remain ROOT_ANCHORED_GRAPH_ONLY.
LATEST_HEAD_ROLE must remain TRUTH_INTEGRATION_BASELINE_ONLY.
```

## Target Landscape / Root-Cause Priority Invariants

Before the first execution frontier, and after any material causal/priority invalidation, the Overview must prove:

```text
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
```

`TARGET_LANDSCAPE_COMPLETE` means the target-wide material landscape is sufficient to rank known/probed root-cause clusters before execution; it does not mean final deep diagnosis/closure is complete.

Priority is comparative and evidence-backed, not a blind arithmetic score. Finding count/density is a supporting signal only; recency, changed-file count, easiest-fix bias, last-session topic and Sequence number never determine priority.

Any material change that creates/merges/splits a root-cause cluster or changes canonical owner/dependency/blocking/blast radius/risk/unlock value invalidates affected priority provenance until re-ranked.

## Frontier Invariants

Before frontier execution:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE=YES
LANDSCAPE_RECONCILED_SHA=LATEST_RECONCILED_SHA
PRIORITY_MODEL_COMPLETE=YES
PRIMARY_FRONTIER_JUSTIFIED=YES
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
FRONTIER_VALID=YES
```

## Required Sections

```text
1. Truth Baseline
2. Macro Blueprint / Dependency Graph
   + Target-Wide Gap & Root-Cause Landscape
3. Sequence Registry / Execution Frontier
4. Global Decisions / Blockers
5. Global Accounting / Coverage / Reconciliation
6. Final Target Handoff / Closure
```

Root-cause landscape rows use `RC-NNN` IDs. Sequence rows remain one row ↔ one materialized file and must carry Root-Cause Cluster + Priority Class + Priority Basis. No placeholder future Sequence rows. Foreign/concurrent observations without materialized sequence files stay in section 4/5 until root/priority graph proves placement.

## Integration Invariants

Task-branch success is not target closure.

Before final handoff/closure:

```text
INTEGRATION_COMPLETE=YES
INTEGRATION_OWNER != UNASSIGNED
latest Integration Target movement reconciled
final candidate provenance points to Integration Target after integration
TARGET_LANDSCAPE_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
UNRANKED_MATERIAL_CLUSTERS=0
LANDSCAPE_ADVERSARIAL_PASS=YES
```

Final handoff/closure also requires all accounting/global gates and fresh root/head reconciliation.
