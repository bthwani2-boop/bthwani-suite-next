# Source Rule Traceability

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Purpose: prove source-rule accounting after the root-anchored, task-isolated, graph-driven, systemic-priority refinement.

## Preserved Source Baseline

| Source | Blob SHA | Coverage |
|---|---|---|
| `tools/prompting/01-diagnose-plan-package.md` | `0cb6a366d2d97d1a288a8f51a4d66bd5939a7581` | ACCOUNTED |
| `tools/prompting/02-execute-verify-close.md` | `21c8e89ab0da12dc9bde55fd663c987a6be1ab2b` | ACCOUNTED |
| `tools/prompting/03-end-to-end-fail-closed.md` | `97ab148843de8a21113be3fc758894d0553b31eb` | ACCOUNTED |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | `b0735847180d69886e715aa23d1685344a7c017e` | ACCOUNTED |
| `tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md` | `53afe043118b9fe18a5069200edfbc6392b9c048` | ACCOUNTED |

Any source SHA drift reopens this map. `UNACCOUNTED` / `DROPPED` forbidden.

## Current Explicit Agreement — Invocation / Task Isolation

```text
NEW INVOCATION = NEW PACKAGE BY DEFAULT.
OLD PACKAGE RESUME = EXPLICIT USER INTENT FOR EXACT PACKAGE ONLY.
PACKAGE HISTORY = REUSABLE EVIDENCE, NOT IMPLICIT CONTINUATION AUTHORITY.

INTEGRATION_TARGET = latest truth + final delivery target.
TASK_BRANCH = isolated working branch.
LOCAL WRITES = TASK_BRANCH + dedicated worktree.
REMOTE/API WRITES = dedicated TASK_BRANCH.
DIRECT TARGET WRITES = integration owner only.

THIS TASK/PACKAGE/ROOT/GRAPH governs direction.
FOREIGN DELTA = INPUT_NOT_INSTRUCTION.
```

This supersedes any earlier behavior that could reuse the last open package automatically, follow the most recent session/commit, or use the Integration Target as a shared working branch.

## Root Anchoring Preserved

```text
ORCHESTRATION_ROOT = resolved TARGET/task root.
LATEST_HEAD = truth/integration baseline only.
LATEST_COMMIT/last-session topic/last changed file never chooses task direction.
Every invocation/resume restores root orientation first.
Execution frontier is derived/revalidated from ROOT_RECONCILED_GRAPH.
```

## Current Explicit Agreement — Target-Wide Root-Cause Landscape / Priority

New stronger rule adopted:

```text
BEFORE FIRST EXECUTION FRONTIER:
TARGET-wide material discovery
→ Finding IDs
→ symptom correlation
→ RC-NNN root-cause clusters
→ dependency/impact placement
→ comparative systemic-leverage ranking
→ adversarial challenge
→ justified execution frontier
```

Priority rule:

```text
PRIORITY = HIGHEST PROVEN SYSTEMIC LEVERAGE
```

Comparative dimensions:

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

`MOST_FINDINGS` is a correlation/density signal, not automatic execution priority. A smaller cluster may outrank a noisier one when it is more upstream/foundational/blocking/risky or unlocks more of the graph.

Forbidden priority shortcuts:

```text
RECENCY
MOST_FINDINGS_ALONE
MOST_CHANGED_FILES
EASIEST_FIX
LAST_SESSION_TOPIC
SEQUENCE_NUMBER
```

Every material Finding must be clustered/dispositioned; every material root-cause cluster must be ranked before frontier selection. Any new causal/dependency/authority truth that changes clustering or systemic leverage invalidates the affected priority model and requires re-ranking before continuation.

Resume/backtracking preserve the same rule: a persisted frontier or old priority model is never continuation authority. Resume must reconcile Root + Landscape + Clusters + Priority on current truth before `NEXT_GRAPH_ACTION` is restored.

## Existing Graph/Closure Rules Preserved

```text
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
SYSTEMIC LEVERAGE GOVERNS PRIORITY.
ACCOUNTING PREVENTS SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
TASK ISOLATION GOVERNS WRITES.
ONE INTEGRATION OWNER MUTATES TARGET BRANCH AT A TIME.
EVIDENCE GOVERNS CLOSURE.
```

Movement remains non-linear after root orientation; Structured Backtracking/Reopen and graph-proven parallel frontiers remain first-class.

Decision/root-cause impact propagates immediately through the proven impact graph. Findings never disappear. Coherent cutover, cleanup, governance, fresh-head, adversarial and final read-only verification rules remain unchanged.

## Integration Strengthening

Task-branch PASS is not target closure.

```text
task branch
→ latest target reconciliation
→ semantic rebuild/rebase
→ invalidated verification
→ affected landscape/priority reconciliation
→ serialized integration
→ INTEGRATION_COMPLETE=YES
→ final candidate on Integration Target
→ final read-only verification
```

## Tooling Binding

- `00-OVERVIEW.template.md`: invocation/root/task-isolation/landscape/priority/frontier provenance fields and root-cause landscape table.
- `new-package.mjs`: creates only a fresh package and requires isolated task workspace inputs.
- `root-anchor-gate.mjs`: validates root/frontier provenance against live target SHA.
- `root-cause-priority-gate.mjs`: validates target-wide landscape, clustering, ranking and frontier-priority provenance.
- `task-isolation-gate.mjs`: validates task branch/worktree/remote isolation and explicit resume/integration phases.
- `new-sequence.mjs`: refuses JIT derivation unless Root + Landscape/Priority + Isolation gates are represented and requires `RC-NNN` + priority class/basis.
- `validate-package.mjs`: rejects ready/complete/handoff/closure when landscape/clustering/ranking/priority provenance is incomplete or stale.
- `SEQUENCE.template.md`: binds every Sequence to a root-cause cluster and comparative priority rationale.
- `OVERVIEW-CONTRACT.md` / `SEQUENCE-CONTRACT.md` / `CLOSURE-CONTRACT.md`: define landscape/priority + isolation + closure invariants.
- Orchestrator `00/01/02/03/04/05/06`: applies systemic-priority rules consistently across invocation, diagnosis, coverage, execution, verification/closure, concurrency, resume and recovery.

## Final Coverage Gate

```text
SOURCE_BASELINES_PINNED = YES
NEW_PACKAGE_PER_INVOCATION = ACCOUNTED
EXPLICIT_RESUME_ONLY = ACCOUNTED
TASK_CONTEXT_ISOLATION = ACCOUNTED
WORKTREE_LOCAL_ISOLATION = ACCOUNTED
REMOTE_TASK_BRANCH_ISOLATION = ACCOUNTED
ROOT_ANCHOR_AGREEMENT = ACCOUNTED
TARGET_WIDE_LANDSCAPE = ACCOUNTED
ROOT_CAUSE_CLUSTERING = ACCOUNTED
SYSTEMIC_LEVERAGE_PRIORITY = ACCOUNTED
PRIORITY_INVALIDATION_RERANK = ACCOUNTED
LANDSCAPE_ADVERSARIAL_PASS = ACCOUNTED
RESUME_PRIORITY_RECONCILIATION = ACCOUNTED
GRAPH_DRIVEN_MODEL = ACCOUNTED
MULTI_AGENT_CONCURRENCY = ACCOUNTED
ACCOUNTING = ACCOUNTED
LATEST_TARGET_INTEGRATION = ACCOUNTED
FINAL_INTEGRATION_GATE = ACCOUNTED
HIGH_RISK_RULES = ACCOUNTED
UNACCOUNTED = 0
DROPPED = 0
```

This proves methodology/source-rule accounting only, not Product/Runtime correctness or literal discovery of every possible defect.
