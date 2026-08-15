# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

## 1) Constitutional Accounting

```text
EVERY MATERIAL THING → GRAPH + COVERAGE
EVERY DEFECT/GAP/CONTRADICTION → FINDING ID
EVERY MATERIAL FINDING → ROOT-CAUSE CLUSTER OR PROVEN DISPOSITION
EVERY MATERIAL ROOT-CAUSE CLUSTER → PRIORITY POSITION
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

## 3) Target Landscape / Root-Cause Cluster Accounting

قبل أول Frontier تنفيذية:

```text
TARGET-WIDE MATERIAL DISCOVERY
→ Finding IDs
→ correlation / de-duplication
→ RC-NNN clusters
→ dependency/impact placement
→ comparative priority
→ adversarial missing-cluster challenge
```

لا يُسمح ببقاء Finding مادية مكتشفة خارج Cluster/Disposition، ولا Cluster مادية بلا ترتيب:

```text
UNCLUSTERED_MATERIAL_FINDINGS = 0
UNRANKED_MATERIAL_CLUSTERS = 0
```

كثرة Findings تحت Cluster واحدة ترفع `FINDING_DENSITY` لكنها لا تتغلب تلقائيًا على upstream dependency/foundation/blocking/risk/blast-radius/unlock evidence.

## 4) Foreign Delta Classification

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

No delta gets priority because it is newest. `UNRELATED` is preserved but not followed. Related delta updates the correct graph node/root-cause cluster and invalidates only affected evidence/priority assumptions.

## 5) Findings / Decisions

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
→ re-cluster/re-rank if causal placement or leverage changed
```

## 6) Priority Constitution

Frontier priority is comparative, evidence-backed systemic leverage:

```text
UPSTREAM / ROOT-CAUSE DEPTH
> BLOCKING POWER
> CANONICAL / FOUNDATION IMPORTANCE
> BLAST RADIUS
> RISK / SEVERITY
> UNLOCK VALUE
> FINDING DENSITY / RECURRENCE
> STRUCTURAL-DEBT MULTIPLIER
```

`>` expresses default causal precedence, not an arithmetic score. Evidence may show a later dimension is materially dominant, but that rationale must be explicit.

Forbidden priority shortcuts:

```text
RECENCY
MOST_FINDINGS_ALONE
MOST_CHANGED_FILES
EASIEST_FIX
LAST_SESSION
SEQUENCE_NUMBER
```

Allowed Sequence priority classes:

```text
PRIMARY_SYSTEMIC
UPSTREAM_FOUNDATION
INDEPENDENT_PARALLEL
DEPENDENT_SECONDARY
LEAF_LOCAL
```

## 7) Sequence / Frontier Derivation

A Sequence is a proven closure unit, not the newest feature branch topic or one Finding.

Boundary may follow distinct Root Cause / Canonical Owner / hard dependency / journey-state / verification-runtime / protected risk / consumer migration / durable governance boundary.

Before deriving/revalidating frontier:

```text
ROOT_RECONCILIATION_REQUIRED = NO
ROOT_RECONCILED_SHA = LATEST_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE = YES
LANDSCAPE_RECONCILED_SHA = LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE = YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED = YES
UNCLUSTERED_MATERIAL_FINDINGS = 0
PRIORITY_MODEL_COMPLETE = YES
PRIORITY_DERIVATION_SOURCE = ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS = 0
PRIMARY_FRONTIER_JUSTIFIED = YES
LANDSCAPE_ADVERSARIAL_PASS = YES
FRONTIER_DERIVATION_SOURCE = ROOT_GRAPH
```

Sequence numbers are creation history, not priority.

## 8) Priority Invalidation / Anti-Drift

أي material discovery أو Decision أو foreign delta أو upstream fix يقوم بأحد التالي:

```text
creates a new RC-NNN
merges/splits an existing cluster
changes canonical owner
changes dependency position
changes blocking power/blast radius/risk/unlock value
invalidates landscape evidence
```

يجب أن يفعل:

```text
PRIORITY_MODEL_COMPLETE = NO
PRIMARY_FRONTIER_JUSTIFIED = NO
LANDSCAPE_ADVERSARIAL_PASS = NO when completeness is affected
→ reconcile only affected landscape cone
→ rerank
→ rejustify frontier
```

لا تستمر في Frontier قديمة لمجرد أنها بدأت سابقًا إذا ثبت أن upstream/root priority تغيرت؛ استخدم structured suspension/backtrack.

## 9) Structured Backtracking / Reopen

```text
current detects upstream
→ SUSPENDED_BY_DEPENDENCY
→ update cluster/priority graph
→ open upstream JIT only when re-ranked as proven frontier
→ resolve upstream
→ invalidate affected descendants
→ root/landscape/graph reconcile
→ REOPEN/RESUME descendant
```

A completed sequence may reopen if new root/canonical truth invalidates it.

## 10) Parallelism

Parallel analysis may be broad. Parallel writes require proven-independent Conflict Domains + isolated workspaces + execution owners **and** `PRIORITY_CLASS=INDEPENDENT_PARALLEL`. One target-branch Integration Owner at a time.

## 11) Accounting Gate

Before final handoff/closure:

```text
FINDINGS_ACCOUNTED=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
UNRANKED_MATERIAL_CLUSTERS=0
```

Adversarial negative-space discovery must challenge missing/unmapped nodes and falsely local symptoms.

## 12) Fresh Head

Before sequence creation/live write/integration/closure:

```text
re-resolve HEAD
→ classify semantic delta
→ update affected graph/root-cause clusters
→ set root/landscape/priority stale only when required by affected truth
→ never change frontier by recency
→ rederive/revalidate from root graph + priority landscape
```
