# Source Rule Traceability

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Purpose: prove source-rule accounting after the root-anchored graph-driven refinement.

## Preserved Source Baseline

| Source | Blob SHA | Coverage |
|---|---|---|
| `tools/prompting/01-diagnose-plan-package.md` | `0cb6a366d2d97d1a288a8f51a4d66bd5939a7581` | ACCOUNTED |
| `tools/prompting/02-execute-verify-close.md` | `21c8e89ab0da12dc9bde55fd663c987a6be1ab2b` | ACCOUNTED |
| `tools/prompting/03-end-to-end-fail-closed.md` | `97ab148843de8a21113be3fc758894d0553b31eb` | ACCOUNTED |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | `b0735847180d69886e715aa23d1685344a7c017e` | ACCOUNTED |
| `tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md` | `53afe043118b9fe18a5069200edfbc6392b9c048` | ACCOUNTED |

Any source SHA drift reopens this map. `UNACCOUNTED` / `DROPPED` forbidden.

## Current Explicit Agreement — Root Anchoring

New stronger rule adopted:

```text
ORCHESTRATION_ROOT = resolved TARGET/task root.
LATEST_HEAD = truth/integration baseline only.
LATEST_COMMIT/last-session topic/last changed file never chooses task direction.
Every invocation/resume restores root orientation first.
Prior valid diagnosis/evidence is reused; no blind restart.
Concurrent deltas are classified and attached to the correct graph nodes.
UNRELATED delta is preserved but not followed.
Only proven upstream/blocking/root/authority change may redirect/backtrack.
Execution frontier is derived/revalidated from ROOT_RECONCILED_GRAPH.
Recency is never execution priority.
```

This supersedes any interpretation of older `resume exact invalidated node` / `latest-head execution` that could skip root orientation.

## Existing Graph/Closure Rules Preserved

```text
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
ACCOUNTING PREVENTS SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
LATEST HEAD GOVERNS TRUTH/WRITES, NOT NAVIGATION.
ONE INTEGRATION OWNER MUTATES TARGET BRANCH AT A TIME.
EVIDENCE GOVERNS CLOSURE.
```

Movement remains non-linear after root orientation; Structured Backtracking/Reopen and graph-proven parallel frontiers remain first-class.

Decision/root-cause impact propagates immediately through the proven impact graph. Findings never disappear. Coherent cutover, cleanup, governance, fresh-head, adversarial and final read-only verification rules remain unchanged.

## Tooling Binding

- `00-OVERVIEW.template.md`: root/frontier provenance fields.
- `new-package.mjs`: initializes resolved root and stale frontier.
- `root-anchor-gate.mjs`: validates root/frontier provenance against live SHA.
- `new-sequence.mjs`: refuses JIT derivation on stale root.
- `OVERVIEW-CONTRACT.md`: defines root invariants.
- Orchestrator `00/01/03/04/06`: prevents recency-driven navigation.

## Final Coverage Gate

```text
SOURCE_BASELINES_PINNED = YES
ROOT_ANCHOR_AGREEMENT = ACCOUNTED
GRAPH_DRIVEN_MODEL = ACCOUNTED
MULTI_AGENT_CONCURRENCY = ACCOUNTED
ACCOUNTING = ACCOUNTED
LATEST_HEAD_INTEGRATION = ACCOUNTED
HIGH_RISK_RULES = ACCOUNTED
UNACCOUNTED = 0
DROPPED = 0
```

This proves methodology/source-rule accounting only, not Product/Runtime correctness.
