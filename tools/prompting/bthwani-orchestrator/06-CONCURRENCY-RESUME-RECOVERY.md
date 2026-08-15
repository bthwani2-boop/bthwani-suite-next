# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/06-CONCURRENCY-RESUME-RECOVERY.md`

## 1) General

```text
NEW INVOCATION = NEW PACKAGE.
RESUME = EXPLICIT USER REQUEST FOR EXACT PACKAGE.
PARALLELISM IS GRAPH-PROVEN, NOT AGENT-COUNT-DRIVEN.
ONE WRITING OWNER PER CONFLICT DOMAIN.
ONE WRITING WORKER PER ISOLATED WORKSPACE.
ONE INTEGRATION OWNER PER INTEGRATION TARGET.
LATEST TARGET HEAD GOVERNS TRUTH/INTEGRATION — NOT TASK NAVIGATION.
```

## 2) Task Context Isolation

Current direction is governed only by:

```text
THIS TASK
THIS PACKAGE
THIS TARGET / ORCHESTRATION_ROOT
THIS ROOT-RECONCILED GRAPH
```

Other sessions/branches/commits are `FOREIGN_DELTA` until proven related.

```text
FOREIGN_DELTA → classify → preserve → attach if relevant → never chase by recency
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

## 4) Root-Anchored Explicit Resume

Explicit resume only:

```text
user identifies exact package
→ recover package/task branch/integration target
→ prove RESUME_POLICY
→ task-isolation gate --phase resume --explicit-resume YES
→ resolve latest target HEAD
→ mark persisted frontier untrusted until orientation check
→ ROOT / MACRO ORIENTATION CHECK
→ reuse still-valid findings/decisions/evidence
→ classify concurrent/foreign delta
→ reconcile root graph
→ rederive/revalidate execution frontier
→ continue exact graph action
```

Forbidden:

```text
latest package → automatic resume
latest commit → next task
last changed file → next task
last session topic → next task
persisted frontier → immediate execution without root/isolation checks
```

## 5) Foreign Delta

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

## 6) Latest-Target Reconciliation

Before semantic write/integration:

```text
resolve latest INTEGRATION_TARGET
→ compare task base/reconciled target → latest target
→ classify semantic delta
→ retain unrelated evidence
→ invalidate affected cone
→ rebuild/rebase task work semantically as needed
```

Git textual mergeability ≠ semantic safety.

## 7) Root / Frontier Provenance

Before derive/resume/write/complete:

```text
ROOT_RECONCILIATION_REQUIRED=NO
ROOT_RECONCILED_SHA=LATEST_RECONCILED_SHA=<live integration-target SHA>
FRONTIER_DERIVATION_SOURCE=ROOT_GRAPH
FRONTIER_VALID=YES
```

For first Sequence, derive phase allows `FRONTIER_VALID=NO` before creation; `new-sequence.mjs` sets it YES.

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

- Orchestrator: task/root/graph/accounting/dedup/assignment/gates.
- Discovery/diagnosis: scoped read-only/isolated probes.
- Execution: independent conflict domains only.
- Verification/adversarial: independent challenge.
- Integration owner: sole Integration Target mutation owner at a time.

Every assignment records mission, graph scope, input SHA, task/worker branch, workspace, authority, conflict domain, output, handoff, invalidation trigger.

## 10) Worker Branches

A task may have multiple proven-independent writing workers:

```text
TASK_BRANCH
├─ worker/<scope-a> + worktree
└─ worker/<scope-b> + worktree
```

Workers integrate into TASK_BRANCH under the task orchestrator first. They do not independently push to Integration Target.

## 11) Backtracking

```text
current → SUSPENDED_BY_DEPENDENCY
→ upstream JIT
→ upstream fix/verify
→ invalidate descendant cone
→ root/graph reconcile
→ REOPEN/RESUME
```

## 12) Integration Serialization

```text
task result ready
→ Integration Owner resolves latest target
→ classifies target movement
→ reconciles/rebuilds task delta
→ reruns invalidated checks
→ fast-forward-safe/non-force target update
→ re-resolve target
→ INTEGRATION_COMPLETE=YES only after exact result is proven on target
```

## 13) Evidence

Branch movement/upstream fix/integration produces an invalidation cone. Retain proven-unrelated evidence; stale only affected claims unless policy/risk requires broader proof.

## 14) Exact Resume Point

```text
TASK_ID / TASK_NAME
PACKAGE_ORIGIN / RESUME_POLICY
INTEGRATION_TARGET / TASK_BRANCH / WORKSPACE_ISOLATION_MODE
ORCHESTRATION_ROOT
LATEST_OBSERVED_TARGET_SHA
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

`NEXT_GRAPH_ACTION` must be derived from the root-reconciled graph, never from recency.
