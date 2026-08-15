# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

## Model

```text
Graph-Driven Multi-Agent Root-Cause Closure
```

```text
plans/diagnose-implementing/<TASK>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

`ONE FILE = ONE COHERENT ROOT-CAUSE / EXECUTION / VERIFICATION / CLOSURE UNIT`.

Sequence numbers are creation IDs, **not** a forced linear execution chain. The Dependency/Impact Graph may jump, backtrack, suspend, reopen and run independent fronts in parallel.

## Core rules

```text
GRAPH GOVERNS MOVEMENT
ROOT CAUSE GOVERNS SCOPE
ACCOUNTING PREVENTS SILENT LOSS
DEPENDENCIES GOVERN ORDER
INDEPENDENCE GOVERNS PARALLELISM
LATEST HEAD GOVERNS WRITES
ONE INTEGRATION OWNER MUTATES TARGET BRANCH AT A TIME
EVIDENCE GOVERNS CLOSURE
```

No fixed number of files, no domain tree, no split by diagnosis/execution/verification, no speculative future sequences.

## Accounting

Every material node/finding/scope delta/decision/consumer/evidence/cleanup item must be ID-addressable and dispositioned. Final handoff/closure requires all accounting flags + `ACCOUNTING_COMPLETE=YES`.

## Multi-Agent

Use an Orchestrator role plus scoped discovery/diagnosis/execution/verification/adversarial workers as useful. Parallel live execution is allowed only on graph-proven independent Conflict Domains in isolated workspaces. One Execution Owner per Conflict Domain; one Integration Owner for the target branch at a time.

## Backtracking / Reopen

A sequence may become `SUSPENDED_BY_DEPENDENCY` and later `REOPENED`. Finish the upstream/root dependency, invalidate affected descendant evidence, re-diagnose, then resume. Independent fronts continue when safe.

## Continuous latest-head

Before sequence creation, live write, integration, push and final decision: fetch latest head and classify movement as DISJOINT / RELATED_NON_CONFLICTING / SEMANTIC_OVERLAP / DIRECT_CONFLICT / AUTHORITY_OR_TRUTH_CHANGE. Carry forward disjoint work automatically; pause only affected conflict domains.

## Create package

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> --branch <branch> `
  --start-sha <40-sha> --current-sha <40-sha> `
  --mode <PREPARE_ONLY|EXECUTE_END_TO_END> `
  --target "<target>" --objective "<objective>"
```

Creates `00-OVERVIEW.md` only.

## Create Sequence

Normal frontier:

```powershell
node plans/diagnose-implementing/new-sequence.mjs `
  --package <task-name> --name <slug> --title "<title>" `
  --base-sha <latest-reconciled-sha> `
  --basis "<proven boundary>" --depends-on "<SEQ-NNN|NONE>"
```

Backtrack while current focus is explicitly suspended:

```powershell
... --suspend-current YES
```

Independent parallel frontier after graph proof:

```powershell
... --parallel YES
```

Before any parallel live writes, set distinct `CONFLICT_DOMAIN`, assign `EXECUTION_OWNER`, and prove `PARALLEL_SAFETY=PROVEN_INDEPENDENT`.

For `--suspend-current YES`, the generator requires exactly one current focus already marked `SUSPENDED_BY_DEPENDENCY`; it pushes that ID into `SUSPENSION_STACKS` and makes the new upstream sequence the active focus. For `--parallel YES`, it adds a graph-proven independent frontier; live writes still fail validation until distinct Conflict Domains, Execution Owners, and `PARALLEL_SAFETY=PROVEN_INDEPENDENT` are recorded.

## Validate

```powershell
node plans/diagnose-implementing/validate-package.mjs <package>
node plans/diagnose-implementing/validate-package.mjs <package> --sequence-ready --sequence SEQ-NNN
node plans/diagnose-implementing/validate-package.mjs <package> --sequence-complete --sequence SEQ-NNN
node plans/diagnose-implementing/validate-package.mjs <package> --handoff
node plans/diagnose-implementing/validate-package.mjs <package> --closure
```

Validator proves structural/accounting/sequence-gate consistency only, not Product/Runtime correctness.
