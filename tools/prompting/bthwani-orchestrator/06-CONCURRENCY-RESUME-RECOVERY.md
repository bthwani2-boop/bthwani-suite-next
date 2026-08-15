# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/06-CONCURRENCY-RESUME-RECOVERY.md`

## 1) General

```text
PARALLELISM IS GRAPH-PROVEN, NOT AGENT-COUNT-DRIVEN.
ONE WRITING OWNER PER CONFLICT DOMAIN.
MULTIPLE INDEPENDENT FRONTS MAY RUN IN ISOLATION.
ONE TARGET-BRANCH INTEGRATION OWNER AT A TIME.
LATEST HEAD GOVERNS INTEGRATION — NOT TASK NAVIGATION.
```

## 2) Root-Anchored Resume

Every `continue/resume/new invocation`:

```text
recover task identity/package
→ recover ORCHESTRATION_ROOT
→ resolve latest remote HEAD
→ mark persisted frontier as untrusted until orientation check
→ ROOT / MACRO ORIENTATION CHECK
→ reuse still-valid findings/decisions/evidence
→ classify concurrent/foreign delta
→ reconcile root graph
→ rederive/revalidate execution frontier
→ continue exact graph action
```

**Forbidden:**

```text
latest commit → next task
last changed file → next task
last session topic → next task
persisted frontier → immediate execution without root check
```

## 3) Foreign Delta

```text
UNRELATED → preserve, do not follow
RELATED_NON_BLOCKING → attach to graph, no recency promotion
UPSTREAM/ROOT_CHANGING → root reconcile/backtrack
BLOCKING → alter affected dependency frontier only
SEMANTIC_OVERLAP → affected-node re-diagnosis
DIRECT_CONFLICT → block affected conflict domain
AUTHORITY/TRUTH_CHANGE → reread truth + affected root reconciliation
```

Independent work continues.

## 4) Latest-Head Integration

Before semantic write/integration/push:

```text
resolve latest
→ compare from work base
→ classify delta
→ rebuild/reconcile scoped delta on latest head
→ rerun invalidated evidence
→ one integration owner
→ fast-forward-safe non-force update
```

Git textual mergeability ≠ semantic safety.

## 5) Root / Frontier Provenance

Before derive/resume/write/complete:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA=<live head passed to gate>
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
FRONTIER_VALID=YES
```

For first Sequence, derive phase allows `FRONTIER_VALID=NO` before creation; `new-sequence.mjs` sets it YES.

## 6) Agent Topology

- Orchestrator: root/graph/accounting/dedup/assignment/gates.
- Discovery/diagnosis: scoped parallel probes.
- Execution: independent conflict domains only.
- Verification/adversarial: independent challenge.
- Integration owner: sole target-branch integration owner at a time.

Every assignment records mission, graph scope, input SHA, authority, conflict domain, output, handoff, invalidation trigger.

## 7) Backtracking

```text
current → SUSPENDED_BY_DEPENDENCY
→ upstream JIT
→ upstream fix/verify
→ invalidate descendant cone
→ root/graph reconcile
→ REOPEN/RESUME
```

## 8) Evidence

Branch movement/upstream fix produces an invalidation cone. Retain proven-unrelated evidence; stale only affected claims unless policy/risk requires broader proof.

## 9) Exact Resume Point

```text
TASK_ID
ORCHESTRATION_ROOT
LATEST_OBSERVED_SHA
ROOT_RECONCILED_SHA
FRONTIER_VALID
ACTIVE_EXECUTION_FRONTIER
SUSPENDED/REOPENED
INTEGRATION_OWNER
LAST_PASSED_GATE
OPEN_FINDINGS/DECISIONS/SCOPE_DELTAS/BLOCKERS
INVALIDATED_EVIDENCE
NEXT_GRAPH_ACTION
```

`NEXT_GRAPH_ACTION` must be derived from root-reconciled graph, never from recency.
