# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: agent/worktree topology, explicit resume, foreign delta, backtracking, concurrency and recovery.

## 1) General

```text
NEW INVOCATION=NEW PACKAGE.
RESUME=EXPLICIT EXACT PACKAGE.
PARALLELISM=GRAPH-PROVEN + PRIORITY-JUSTIFIED.
ONE WRITING OWNER PER CONFLICT DOMAIN.
ONE WRITING WORKER PER ISOLATED WORKSPACE.
ONE INTEGRATION OWNER PER TARGET.
LATEST TARGET HEAD=TRUTH/INTEGRATION ONLY.
```

## 2) Task context

Direction governed by THIS TASK/PACKAGE/TARGET/Operational Root/Root Graph/RC Landscape/Priority Model. Other sessions are `FOREIGN_DELTA` until proven related. Never chase recency.

## 3) Workspace topology

Local: `INTEGRATION_TARGET → TASK_BRANCH → dedicated worktree`.
Remote/API: `INTEGRATION_TARGET → TASK_BRANCH` where every ordinary write explicitly targets Task Branch.
Read-only agents may inspect pinned refs.

## 4) Explicit resume order

```text
user identifies exact package
→ recover package/task branch/target/mode
→ task-isolation resume gate with explicit authorization
→ resolve latest target
→ mark persisted frontier/priority/operational coverage untrusted until reconciled
→ restore ORCHESTRATION_ROOT + diagnostic altitude
→ classify foreign delta
→ revalidate operational-root machine registry against current truth
→ reopen affected operational categories/nodes
→ rerun affected negative-space/adversarial challenge
→ reconcile findings/RC clusters
→ competitive deepening where winner can change
→ rerank
→ rederive frontier
→ continue highest proven graph action
```

Persisted frontier is never resume authority.

## 5) Foreign delta classification

```text
UNRELATED → preserve; no direction/priority change
RELATED_NON_BLOCKING → attach to node/RC; invalidate affected evidence only
UPSTREAM_OR_ROOT_CHANGING → operational/root reconciliation + backtrack
BLOCKING → update dependency/blocking + rerank affected frontier
SEMANTIC_OVERLAP → affected re-diagnosis/recluster
DIRECT_CONFLICT → block conflict domain only
AUTHORITY_OR_TRUTH_CHANGE → reread truth + operational/root/priority reconciliation
```

## 6) Agent topology

- Orchestrator: shared operational graph, RC landscape, priority, accounting, assignments, gates.
- Breadth workers: read-only complementary angles (actors/journeys; states/handoffs; truth/flows; negative-space/adversarial).
- Competitive-deepening workers: answer discriminating hypotheses, not independently redefine global priority.
- Execution workers: only proven independent selected frontiers in isolated workspaces.
- Verification workers: challenge candidate/root/coverage/priority.
- Integration Owner: sole target mutator.

Every mission binds scope/input SHA/authority/conflict domain/workspace/output/handoff/invalidation trigger.

## 7) Worker branches

Independent writers:

```text
TASK_BRANCH
├─ worker/<scope-a> + worktree
└─ worker/<scope-b> + worktree
```

Integrate into TASK_BRANCH first. Parallel live write requires machine-selected `INDEPENDENT_PARALLEL`, `PARALLEL_SAFETY=PROVEN_INDEPENDENT`, and semantic conflict-domain independence.

## 8) Structured backtracking

إذا ظهر Root أعلى:

```text
current Sequence
→ upstream material evidence
→ update Operational/RC machine registries
→ invalidate affected priority/frontier
→ if upstream wins: current=SUSPENDED_BY_DEPENDENCY
→ upstream JIT only after gates
→ fix/verify upstream
→ invalidate descendant cone
→ reconcile operational/root/priority
→ resume descendant only if still justified
```

Sunk cost does not protect current Sequence.

## 9) Invalidation triggers

Reopen affected cone when authority/journey/state/handoff/truth owner/dependency/blocking/blast radius/risk/unlock value/cluster composition changes, or when foreign target movement invalidates evidence. Retain proven-unrelated evidence.

## 10) Recovery

If branch/worktree isolation stale: repair isolation before writes. If machine registries stale: no priority/frontier/write. If target moves during final review: classify movement, reopen affected cone, rerun gates/evidence, refreeze new candidate.

## 11) Exact resume state

Persist/restore at least: task identity, Integration Target/Task Branch/workspace, ORCHESTRATION_ROOT, diagnostic altitude, latest target SHA, Operational Root registry status/SHA, lower-layer HOLD count, RC landscape SHA, priority winner/invalidated cone, active/suspended/reopened sequences, Integration Owner, last passed gate, open Findings/RCs/Decisions/Scope Deltas/Blockers, invalidated evidence, NEXT_GRAPH_ACTION.

`NEXT_GRAPH_ACTION` derives from current operational+causal graph, never recency/old frontier/finding count/easiest fix/sequence number.

## 12) Latest-target reconciliation

Before semantic write/integration/resume continuation:

```text
resolve latest INTEGRATION_TARGET
→ compare last reconciled target SHA → live target
→ classify semantic delta
→ preserve unrelated work/evidence without following it
→ attach related delta to exact operational/RC node
→ invalidate only affected operational/root/priority/evidence cone
→ semantic rebase/rebuild task work when required
→ rerun affected machine gates
→ rejustify frontier before write
```

Git textual mergeability alone does not prove semantic compatibility.

## 13) Evidence under concurrency

Branch movement/upstream fixes/worker integration produce an invalidation cone. Retain proven-unrelated evidence. Stale only claims actually affected unless security/data/finance/policy requires broader reacquisition. Evidence that changes causal structure also invalidates clustering/priority; it is not merely test output.

Foreign technical commits or newly observed CI/UI/code failures remain lower-layer observations until operational parent/root/priority proof exists; recency cannot promote them.

## 14) Integration serialization / collision

Only the Integration Owner may mutate the Integration Target. Before target write: fetch/resolve latest, classify concurrent delta as disjoint/related/overlap/conflict/authority-change, reconcile semantically, rerun invalidated checks and use non-force/fast-forward-safe integration. Parallel push assumptions are forbidden; one push/integration owner at a time.

If another task changes the same canonical owner/authority/contract/data/runtime boundary, block only the affected conflict domain and re-diagnose/re-rank it; independent proven work may continue.

## 15) Resume / package collision

A package name/path collision never authorizes reuse. New invocation chooses a new identity. Existing package may be resumed only by explicit user request for that exact package, after branch/workspace/root/machine-registry compatibility and freshness checks. If any of these cannot be proven, resume fails closed rather than silently forking task meaning.
