# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

## 1) Constitutional Accounting

```text
EVERY MATERIAL THING → GRAPH + COVERAGE
EVERY DEFECT/GAP/CONTRADICTION → FINDING ID
EVERY DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA ID
EVERY TRUE DECISION → DECISION ID
EVERY DECISION → FULL IMPACT PROPAGATION + RE-DIAGNOSIS
EVERY PROVEN CLOSURE BOUNDARY → SEQUENCE REGISTRY
EVERY REQUIRED PROOF → EVIDENCE ID
NO SILENT MATERIAL ELEMENT
```

## 2) Root-Anchored Coverage

Coverage starts from `ORCHESTRATION_ROOT`, not from changed-file/commit recency:

```text
Root/Macro Model
→ Canonical Owners / Foundations / Invariants
→ Domains / Services / Contracts / Data
→ Journeys / States / Handoffs
→ Surfaces / Consumers
→ implementation/runtime detail
```

Reverse/cross-surface/cross-layer traces then challenge completeness.

## 3) Foreign Delta Classification

Latest-head delta must be attached to the root graph as:

```text
UNRELATED
RELATED_NON_BLOCKING
UPSTREAM_OR_ROOT_CHANGING
BLOCKING
SEMANTIC_OVERLAP
DIRECT_CONFLICT
AUTHORITY_OR_TRUTH_CHANGE
```

No delta gets priority because it is newest. `UNRELATED` is preserved but not followed. Related delta updates the correct graph node and invalidates only affected evidence.

## 4) Findings / Decisions

Finding disposition:

```text
SAME_ROOT_CAUSE
UPSTREAM_OR_BLOCKER
INDEPENDENT_IN_SCOPE
SUPPORTED_EXCLUSION_WITH_PROOF
```

Decision resolution:

```text
derive if possible
→ true decision boundary only when non-derivable
→ resolve
→ propagate through full impact graph
→ invalidate affected assumptions/evidence
→ re-diagnose
```

## 5) Sequence / Frontier Derivation

A Sequence is a proven closure unit, not the newest feature branch topic.

Boundary may follow distinct Root Cause / Canonical Owner / hard dependency / journey-state / verification-runtime / protected risk / consumer migration / durable governance boundary.

Before deriving/revalidating frontier:

```text
ROOT_RECONCILIATION_REQUIRED = NO
ROOT_RECONCILED_SHA = LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE = ROOT_GRAPH
```

Sequence numbers are creation history, not priority.

## 6) Structured Backtracking / Reopen

```text
current detects upstream
→ SUSPENDED_BY_DEPENDENCY
→ open upstream JIT
→ resolve upstream
→ invalidate affected descendants
→ root/graph reconcile
→ REOPEN/RESUME descendant
```

A completed sequence may reopen if new root/canonical truth invalidates it.

## 7) Parallelism

Parallel analysis may be broad. Parallel writes require proven-independent Conflict Domains + isolated workspaces + execution owners. One target-branch Integration Owner at a time.

## 8) Accounting Gate

Before final handoff/closure:

```text
FINDINGS_ACCOUNTED=YES
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
```

Adversarial negative-space discovery must challenge missing/unmapped nodes.

## 9) Fresh Head

Before sequence creation/live write/integration/closure:

```text
re-resolve HEAD
→ classify semantic delta
→ set root reconciliation stale only when required by affected truth
→ never change frontier by recency
→ rederive/revalidate from root graph
```
