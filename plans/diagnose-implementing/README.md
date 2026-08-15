# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

## Model

```text
Root-Anchored Graph-Driven Multi-Agent Root-Cause Closure
+ New-Package-Per-Invocation
+ Task-Branch / Worktree Isolation
+ Target-Wide Root-Cause Landscape
+ Highest-Proven-Systemic-Leverage Priority
```

```text
plans/diagnose-implementing/<TASK>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
└── ...
```

## Invocation rule

```text
NEW INVOCATION = NEW PACKAGE BY DEFAULT
RESUME OLD PACKAGE = EXPLICIT USER REQUEST ONLY
```

Never continue the last open package automatically. Previous packages are reusable evidence/history after freshness/root-placement validation.

## Branch/workspace roles

```text
INTEGRATION_TARGET (for example A)
= latest truth + final delivery target

TASK_BRANCH
= isolated branch for this invocation/package

LOCAL_WORKTREE
= isolated local filesystem for TASK_BRANCH when shell/git writes are available
```

Ordinary writing workers never use Integration Target as shared working context.

## Critical distinction

```text
TARGET / ORCHESTRATION_ROOT → where the task starts and how it is oriented
LATEST INTEGRATION TARGET HEAD → current truth + integration baseline only
ROOT-RECONCILED GRAPH → causal/dependency movement
ROOT-CAUSE LANDSCAPE → what material systemic problems exist
PRIORITY MODEL → which proven cluster should be treated first
TASK_BRANCH/WORKSPACE → where this task writes
LATEST COMMIT → never task direction by recency
```

## New invocation bootstrap

```text
resolve latest Integration Target SHA
→ derive unique package/task name
→ create TASK_BRANCH from exact target SHA
→ LOCAL: create dedicated worktree for TASK_BRANCH
   REMOTE/API: use TASK_BRANCH as isolated remote workspace
→ create NEW package on TASK_BRANCH
→ Root/Macro reconciliation
→ target-wide Gap & Root-Cause Landscape
→ correlate Findings into RC-NNN clusters
→ rank all material clusters by systemic leverage
→ adversarially challenge the landscape/ranking
→ Graph/Frontier derivation
```

Suggested local topology:

```text
C:\bthwani-suite-next                         # Integration Target workspace
C:\bthwani-suite-next-worktrees\<task-name> # Task worktree
```

Example Git commands:

```powershell
git fetch origin A
git branch task/orch/<task-name> origin/A
git worktree add C:\bthwani-suite-next-worktrees\<task-name> task/orch/<task-name>
```

Do not reuse an existing worktree/branch for a different invocation.

## Create package

Run from the isolated task workspace/branch:

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <optional-unique-task-name> `
  --branch <integration-target-branch> `
  --task-branch <dedicated-task-branch> `
  --workspace-mode <LOCAL_WORKTREE|REMOTE_TASK_BRANCH> `
  --worktree-path "<path|NOT_APPLICABLE_REMOTE_API>" `
  --start-sha <40-sha> --current-sha <40-sha> `
  --mode <PREPARE_ONLY|EXECUTE_END_TO_END> `
  --target "<target>" --objective "<objective>"
```

If `--name` is omitted, the generator creates a unique timestamp/SHA-based name.

## Root Anchor fields

```text
ORCHESTRATION_ROOT
NAVIGATION_POLICY=ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE=TRUTH_INTEGRATION_BASELINE_ONLY
ROOT_RECONCILIATION_REQUIRED
ROOT_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE
FRONTIER_VALID
```

## Target landscape / priority fields

```text
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
PRIORITY_POLICY=HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
```

The landscape is target-wide, not necessarily whole-repository-wide when TARGET is narrow.

Priority is evidence-backed comparison, not a blind numerical score:

```text
UPSTREAM / ROOT-CAUSE DEPTH
→ BLOCKING POWER
→ CANONICAL / FOUNDATION IMPORTANCE
→ BLAST RADIUS
→ RISK / SEVERITY
→ UNLOCK VALUE
→ FINDING DENSITY / RECURRENCE
→ STRUCTURAL-DEBT MULTIPLIER
```

`MOST_FINDINGS` is a correlation signal, not an automatic winner.

## Task isolation fields

```text
PACKAGE_ORIGIN
RESUME_POLICY
TASK_CONTEXT_POLICY
FOREIGN_DELTA_POLICY
INTEGRATION_TARGET
TASK_BRANCH
TASK_BRANCH_BASE_SHA
TASK_BRANCH_READY
WORKSPACE_ISOLATION_MODE
WORKTREE_PATH
WORKSPACE_ISOLATION_READY
DIRECT_INTEGRATION_TARGET_WRITES
INTEGRATION_COMPLETE
```

## Gates

Root:

```powershell
node plans/diagnose-implementing/root-anchor-gate.mjs <package> `
  --latest-sha <live-integration-target-sha> `
  --phase <derive|frontier|closure>
```

Root-cause landscape / priority:

```powershell
node plans/diagnose-implementing/root-cause-priority-gate.mjs <package> `
  --latest-sha <live-integration-target-sha> `
  --phase <derive|frontier|closure>
```

Isolation:

```powershell
node plans/diagnose-implementing/task-isolation-gate.mjs <package> `
  --latest-target-sha <live-integration-target-sha> `
  --phase <write|resume|integrate> `
  --runtime <local|remote-api> `
  [--explicit-resume YES] `
  [--current-branch <branch>]
```

## Foreign changes

```text
UNRELATED → preserve, do not follow
RELATED → attach to correct root graph / RC cluster
UPSTREAM/BLOCKING → may alter priority/frontier only with proof
AUTHORITY/ROOT CHANGE → re-anchor/re-diagnose/re-rank affected cone
RECENCY ALONE → never priority
```

## Create Sequence

After Root + Target Landscape/Priority + Task Isolation are valid:

```powershell
node plans/diagnose-implementing/new-sequence.mjs `
  --package <task-name> --name <slug> --title "<title>" `
  --base-sha <latest-reconciled-target-sha> `
  --cluster <RC-NNN> `
  --priority-class <PRIMARY_SYSTEMIC|UPSTREAM_FOUNDATION|INDEPENDENT_PARALLEL|DEPENDENT_SECONDARY|LEAF_LOCAL> `
  --priority-basis "<comparative systemic-leverage proof>" `
  --basis "<root-graph-proven boundary>" `
  --depends-on "<SEQ-NNN|NONE>"
```

Supports `--suspend-current YES` for structured backtracking and `--parallel YES` only with `priority-class=INDEPENDENT_PARALLEL` and graph-proven independent frontier.

## Re-ranking rule

Any material discovery/decision/dependency/foreign delta that creates, merges, splits, or materially reprioritizes a root-cause cluster invalidates affected priority provenance:

```text
PRIORITY_MODEL_COMPLETE=NO
PRIMARY_FRONTIER_JUSTIFIED=NO
LANDSCAPE_ADVERSARIAL_PASS=NO when landscape completeness changed
→ reconcile affected landscape cone
→ rerank
→ justify frontier again
```

Do not mechanically continue the next Sequence ID.

## Integration

Workers integrate into TASK_BRANCH first. Before target integration:

```text
resolve latest Integration Target
→ classify foreign delta
→ semantic rebuild/rebase
→ rerun invalidated evidence
→ single Integration Owner
→ non-force/fast-forward-safe integration
→ INTEGRATION_COMPLETE=YES
→ final candidate on Integration Target
```

## Other invariants

- one file = one coherent root-cause/execution/verification/closure unit
- JIT sequences only; no placeholder Sequence rows/files
- every material Finding clustered/dispositioned before frontier selection
- every material RC cluster ranked before frontier selection
- highest proven systemic leverage governs priority
- graph-driven non-linear movement after root orientation
- full impact propagation after decisions/root causes
- accounting prevents silent loss
- parallel live writes only on independent conflict domains and priority frontiers
- one writing workspace per writing worker
- one Integration Owner per target at a time
- evidence governs closure
