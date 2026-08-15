# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

## Model

```text
Root-Anchored Graph-Driven Multi-Agent Root-Cause Closure
```

```text
plans/diagnose-implementing/<TASK>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
└── ...
```

## Critical distinction

```text
TARGET / ORCHESTRATION_ROOT → where the task starts and how it is oriented
LATEST HEAD → current truth + integration/write baseline only
ROOT-RECONCILED GRAPH → what to do next
LATEST COMMIT → never task direction by recency
```

Every invocation/resume starts with root/macro orientation, reuses still-valid prior work, classifies foreign deltas, reconciles the graph, then derives/revalidates the frontier.

## Root Anchor fields

Overview carries:

```text
ORCHESTRATION_ROOT
NAVIGATION_POLICY=ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE=TRUTH_INTEGRATION_BASELINE_ONLY
ROOT_RECONCILIATION_REQUIRED
ROOT_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE
FRONTIER_VALID
```

Before derive/resume/write:

```powershell
node plans/diagnose-implementing/root-anchor-gate.mjs <package> `
  --latest-sha <live-branch-sha> `
  --phase <derive|frontier|closure>
```

## Foreign changes

UNRELATED changes are preserved but not followed. Related changes attach to their correct graph nodes. Only proven upstream/blocking/authority/root changes can alter priority/frontier. Recency never does.

## Create package

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> --branch <branch> `
  --start-sha <40-sha> --current-sha <40-sha> `
  --mode <PREPARE_ONLY|EXECUTE_END_TO_END> `
  --target "<target>" --objective "<objective>"
```

Creates only `00-OVERVIEW.md` with root reconciliation required.

## Create Sequence

After root reconciliation is recorded on latest truth:

```powershell
node plans/diagnose-implementing/new-sequence.mjs `
  --package <task-name> --name <slug> --title "<title>" `
  --base-sha <latest-reconciled-sha> `
  --basis "<root-graph-proven boundary>" --depends-on "<SEQ-NNN|NONE>"
```

Supports `--suspend-current YES` for structured backtracking and `--parallel YES` only for graph-proven independent frontier.

## Other invariants

- one file = one coherent root-cause/execution/verification/closure unit
- JIT sequences only; no placeholder rows/files
- graph-driven non-linear movement after root orientation
- full impact propagation after decisions/root causes
- accounting prevents silent loss
- parallel live writes only on independent conflict domains
- one target-branch integration owner at a time
- latest-head semantic reconciliation before writes
- evidence governs closure
