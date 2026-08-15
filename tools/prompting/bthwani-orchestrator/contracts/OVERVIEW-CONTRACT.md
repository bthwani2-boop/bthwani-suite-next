# Overview Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/00-OVERVIEW.md`

## Required Root/Truth Header

```text
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID / TASK_NAME / REPOSITORY / BRANCH / MODE / TARGET
ORCHESTRATION_ROOT
NAVIGATION_POLICY: ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE: TRUTH_INTEGRATION_BASELINE_ONLY
OBJECTIVE / ORCHESTRATOR_PATH
CREATED_AT / LAST_RECONCILED_AT
START_SHA / CURRENT_SHA / LATEST_RECONCILED_SHA
ROOT_RECONCILIATION_REQUIRED
ROOT_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE
FRONTIER_VALID
LIFECYCLE_STATE
ACTIVE_EXECUTION_FRONTIER
SUSPENSION_STACKS
INTEGRATION_OWNER
```

Plus all accounting/global/final candidate fields already defined by V2.

## Root Anchor Invariants

```text
ORCHESTRATION_ROOT is resolved from TARGET/task authority, never latest commit topic.
NAVIGATION_POLICY must remain ROOT_ANCHORED_GRAPH_ONLY.
LATEST_HEAD_ROLE must remain TRUTH_INTEGRATION_BASELINE_ONLY.
```

Before frontier execution:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
FRONTIER_VALID=YES
```

Before first JIT sequence, root reconciliation must pass; sequence creation establishes the frontier.

## Required Sections

```text
1. Truth Baseline
2. Macro Blueprint / Dependency Graph
3. Sequence Registry / Execution Frontier
4. Global Decisions / Blockers
5. Global Accounting / Coverage / Reconciliation
6. Final Target Handoff / Closure
```

Sequence rows remain one row ↔ one materialized file. No placeholder rows. Foreign/concurrent observations without materialized sequence files stay in section 4/5 until root graph proves placement.

Final handoff/closure also requires all accounting/global gates and fresh root/head reconciliation.
