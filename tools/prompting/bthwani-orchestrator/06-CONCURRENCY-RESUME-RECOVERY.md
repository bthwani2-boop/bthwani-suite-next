# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/06-CONCURRENCY-RESUME-RECOVERY.md`

## 1) General

```text
NEW INVOCATION = NEW PACKAGE.
RESUME = EXPLICIT USER REQUEST FOR EXACT PACKAGE.
PARALLELISM IS GRAPH-PROVEN + PRIORITY-JUSTIFIED, NOT AGENT-COUNT-DRIVEN.
ONE WRITING OWNER PER CONFLICT DOMAIN.
ONE WRITING WORKER PER ISOLATED WORKSPACE.
ONE INTEGRATION OWNER PER INTEGRATION TARGET.
LATEST TARGET HEAD GOVERNS TRUTH/INTEGRATION — NOT TASK NAVIGATION OR PRIORITY.
SYSTEMIC LEVERAGE GOVERNS FRONTIER PRIORITY.
```

## 2) Task Context Isolation

Current direction is governed only by:

```text
THIS TASK
THIS PACKAGE
THIS TARGET / ORCHESTRATION_ROOT
THIS ROOT-RECONCILED GRAPH
THIS TARGET-WIDE ROOT-CAUSE LANDSCAPE
THIS CURRENT PRIORITY MODEL
```

Other sessions/branches/commits are `FOREIGN_DELTA` until proven related.

```text
FOREIGN_DELTA → classify → preserve → attach if relevant → update affected cluster/priority only when proven → never chase by recency
```

## 3) Workspace Topology

### Local shell

```text
INTEGRATION_TARGET (e.g. A)
└─ TASK_BRANCH
   └─ dedicated git worktree
```

Every writing worker must use an isolated worktree/branch. Read-only workers may inspect pinned refs without their own worktree.

### Remote/API-only

```text
INTEGRATION_TARGET
└─ TASK_BRANCH  ← every package/product write targets this branch explicitly
```

Remote Task Branch is the workspace isolation boundary. Ordinary workers never write directly to Integration Target.

## 4) Root-Anchored + Priority-Anchored Explicit Resume

Explicit resume only:

```text
user identifies exact package
→ recover package/task branch/integration target
→ prove RESUME_POLICY
→ task-isolation gate --phase resume --explicit-resume YES
→ resolve latest target HEAD
→ mark persisted frontier AND persisted priority as untrusted until reconciliation
→ ROOT / MACRO ORIENTATION CHECK
→ reuse still-valid findings/decisions/evidence
→ classify concurrent/foreign delta
→ reconcile root graph
→ reconcile Target-Wide Gap & Root-Cause Landscape
→ classify every material Finding into RC-NNN/disposition
→ merge/split/revalidate affected clusters
→ rerank all material clusters needed for correct frontier selection
→ run landscape adversarial challenge when completeness/priority was affected
→ rederive/revalidate execution frontier
→ continue highest-leverage proven graph action
```

Forbidden:

```text
latest package → automatic resume
latest commit → next task
last changed file → next task
last session topic → next task
most findings → next task by count alone
easiest fix → next task
persisted frontier → immediate execution without root/landscape/isolation checks
persisted priority → trusted without current-truth reconciliation
```

## 5) Foreign Delta

```text
UNRELATED
→ preserve, do not follow
→ no priority/frontier change

RELATED_NON_BLOCKING
→ attach to graph / correct RC cluster
→ update affected evidence
→ no recency promotion

UPSTREAM/ROOT_CHANGING
→ root + landscape reconcile
→ rerank affected clusters
→ backtrack if newly proven systemic priority

BLOCKING
→ update blocking power / dependency placement
→ rerank affected frontier

SEMANTIC_OVERLAP
→ affected-node re-diagnosis
→ re-cluster/re-rank if causal meaning changed

DIRECT_CONFLICT
→ block affected conflict domain
→ independent proven frontiers may continue

AUTHORITY/TRUTH_CHANGE
→ reread truth
→ affected root + cluster + priority reconciliation
```

Independent work continues only when its Root-Cause Cluster, priority placement, conflict domain and evidence remain proven unaffected.

## 6) Latest-Target Reconciliation

Before semantic write/integration:

```text
resolve latest INTEGRATION_TARGET
→ compare task base/reconciled target → latest target
→ classify semantic delta
→ retain unrelated evidence
→ invalidate affected graph/evidence/landscape/priority cone
→ rebuild/rebase task work semantically as needed
→ rejustify affected frontier before write
```

Git textual mergeability ≠ semantic safety.

## 7) Root / Landscape / Priority / Frontier Provenance

Before derive/resume/write/complete:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA=<live integration-target SHA>
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
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
FRONTIER_VALID=YES
```

For first Sequence, derive phase allows `FRONTIER_VALID=NO` before creation, but all Root/Landscape/Priority prerequisites must already pass; `new-sequence.mjs` establishes the frontier.

Any material causal/priority invalidation reopens these affected gates before continuation.

## 8) Task Isolation Provenance

Before any live/product/package execution write after bootstrap:

```text
TASK_CONTEXT_POLICY=ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY=INPUT_NOT_INSTRUCTION
INTEGRATION_TARGET == BRANCH
TASK_BRANCH != INTEGRATION_TARGET
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
DIRECT_INTEGRATION_TARGET_WRITES=FORBIDDEN_EXCEPT_INTEGRATION_OWNER
```

Local mode additionally proves current git branch/worktree. Remote API mode proves every write call explicitly targets TASK_BRANCH.

## 9) Agent Topology

- Orchestrator: task/root/graph/**landscape/clustering/priority**/accounting/dedup/assignment/gates.
- Discovery/diagnosis: scoped read-only/isolated probes from complementary angles; feed one shared landscape/graph.
- Execution: graph-proven independent conflict domains with priority-justified frontiers only.
- Verification/adversarial: independently challenge completeness, root-cause clustering, priority inversions and candidate claims.
- Integration owner: sole Integration Target mutation owner at a time.

Every assignment records mission, graph scope, root-cause cluster/question, input SHA, task/worker branch, workspace, authority, conflict domain, output, handoff and invalidation trigger.

No worker may independently redefine global priority; workers return evidence and the Orchestrator reconciles it into the shared landscape/priority model.

## 10) Worker Branches

A task may have multiple proven-independent writing workers:

```text
TASK_BRANCH
├─ worker/<scope-a> + worktree
└─ worker/<scope-b> + worktree
```

Workers integrate into TASK_BRANCH under the task orchestrator first. They do not independently push to Integration Target.

Parallel live writing requires all participating Sequences to be:

```text
PRIORITY_CLASS=INDEPENDENT_PARALLEL
PARALLEL_SAFETY=PROVEN_INDEPENDENT
```

plus distinct semantic Conflict Domains.

## 11) Structured Backtracking / Priority Inversion

إذا ظهر Root Cause أعلى أثناء العمل:

```text
current Sequence
→ new/upgraded upstream material Finding
→ correlate into existing/new RC-NNN
→ invalidate affected priority model
→ compare dependency/blocking/foundation/blast-radius/risk/unlock value
→ if upstream cluster now outranks current:
     current = SUSPENDED_BY_DEPENDENCY
     rerank affected landscape
     open upstream JIT only after priority gate passes
→ upstream fix/verify
→ invalidate descendant cone
→ root/landscape/priority reconcile
→ REOPEN/RESUME descendant only if it remains justified
```

A current Sequence is not protected from suspension merely because execution already started. Root-cause closure outranks sunk-cost/sequence convenience.

## 12) Priority Invalidation Triggers

Invalidate affected priority provenance when evidence:

```text
creates a new material RC cluster
merges/splits clusters
changes canonical owner/source of truth
changes dependency/upstream position
changes blocking power
changes blast radius
changes security/data/finance/operational risk
changes unlock value
reveals high-risk low-frequency defect
shows a supposedly local symptom is cross-surface/systemic
invalidates landscape completeness
```

Then:

```text
PRIORITY_MODEL_COMPLETE=NO
PRIMARY_FRONTIER_JUSTIFIED=NO
LANDSCAPE_ADVERSARIAL_PASS=NO when completeness was affected
→ reconcile affected landscape cone
→ rerank
→ rejustify frontier
```

## 13) Integration Serialization

```text
task result ready
→ Integration Owner resolves latest target
→ classifies target movement
→ reconciles/rebuilds task delta
→ reconciles affected root-cause landscape/priority
→ reruns invalidated checks
→ fast-forward-safe/non-force target update
→ re-resolve target
→ INTEGRATION_COMPLETE=YES only after exact result is proven on target
```

## 14) Evidence

Branch movement/upstream fix/integration produces an invalidation cone. Retain proven-unrelated evidence; stale only affected claims unless policy/risk requires broader proof.

Evidence that changes causal structure also invalidates the affected clustering/priority model; evidence is not only test proof but may change what should be worked on next.

## 15) Exact Resume Point

```text
TASK_ID / TASK_NAME
PACKAGE_ORIGIN / RESUME_POLICY
INTEGRATION_TARGET / TASK_BRANCH / WORKSPACE_ISOLATION_MODE
ORCHESTRATION_ROOT
LATEST_OBSERVED_TARGET_SHA
ROOT_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE / LANDSCAPE_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE / ROOT_CAUSE_CLUSTERS_ACCOUNTED
UNCLUSTERED_MATERIAL_FINDINGS
PRIORITY_MODEL_COMPLETE / PRIORITY_DERIVATION_SOURCE
UNRANKED_MATERIAL_CLUSTERS
PRIMARY_FRONTIER_JUSTIFIED
LANDSCAPE_ADVERSARIAL_PASS
PRIORITY_POLICY
FRONTIER_VALID
ACTIVE_EXECUTION_FRONTIER
SUSPENDED/REOPENED
INTEGRATION_OWNER
LAST_PASSED_GATE
OPEN_FINDINGS / OPEN_ROOT_CAUSE_CLUSTERS / DECISIONS / SCOPE_DELTAS / BLOCKERS
INVALIDATED_EVIDENCE / INVALIDATED_PRIORITY_CONE
NEXT_GRAPH_ACTION
```

`NEXT_GRAPH_ACTION` must be derived from the **current root-reconciled + target-wide clustered/ranked landscape**, never from recency, previous frontier, Finding count alone, easiest-fix bias or Sequence number.
