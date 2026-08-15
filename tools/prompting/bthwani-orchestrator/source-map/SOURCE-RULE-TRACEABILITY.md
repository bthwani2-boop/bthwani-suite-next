# Source Rule Traceability

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Purpose: prove source-rule accounting after the graph-driven multi-agent refinement.

## Source Baseline — exact preserved blobs

| Source | Blob SHA | Coverage |
|---|---|---|
| `tools/prompting/01-diagnose-plan-package.md` | `0cb6a366d2d97d1a288a8f51a4d66bd5939a7581` | ACCOUNTED |
| `tools/prompting/02-execute-verify-close.md` | `21c8e89ab0da12dc9bde55fd663c987a6be1ab2b` | ACCOUNTED |
| `tools/prompting/03-end-to-end-fail-closed.md` | `97ab148843de8a21113be3fc758894d0553b31eb` | ACCOUNTED |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | `b0735847180d69886e715aa23d1685344a7c017e` | ACCOUNTED |
| `tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md` | `53afe043118b9fe18a5069200edfbc6392b9c048` | ACCOUNTED |

Any source SHA drift reopens this map until reconciliation. `UNACCOUNTED` and `DROPPED` are forbidden.

## Preserved source families

```text
Authority/truth/plans-derived → 01/06
Deep Journey × Multi-Surface × Cross-Layer diagnosis → 02/03
Root Cause + Blast Radius + Consumers/Dependencies/Contracts/Data/Runtime → 01/02/04
True Decision Boundary + impact propagation + re-diagnosis → 03
Package creation/resume/readiness → 00/04 + overview/sequence contracts + generators/validator
Execution/root fix/consumer migration → 04
Verification/runtime/evidence/cleanup/governance/fresh-head/closure → 05
Concurrency/atomic writes/resume/branch movement → 06
```

All historical requirements remain represented; the current user-approved model supersedes only older **linear/one-active-sequence** assumptions with stronger graph/accounting/concurrency rules.

## Current Explicitly Agreed Methodology

```text
Two modes only: PREPARE_ONLY / EXECUTE_END_TO_END.
MODE controls write authority, not diagnosis rigor.

Package structure remains:
00-OVERVIEW.md + NNN-<sequence>.md
one file = one coherent root-cause/execution/verification/closure unit
no fixed count, no domain tree, no diagnosis/execution/verification split
sequences are Just-In-Time and graph-derived

THE GRAPH GOVERNS MOVEMENT; SEQUENCES GOVERN CLOSURE.
Movement is non-linear: vertical/horizontal/reverse/cross-layer/cross-surface/jump-to-root.
Sequence numbers are creation/identity order, not a forced execution chain.

A decision/root cause propagates immediately through the full proven impact graph.
Implementation remains dependency-ordered.
No coherent-cutover sequence may close with required affected consumer, parallel truth,
required migration, reachable obsolete path, temporary workaround, or fixable blocker unresolved.

Every material discovery must be accounted:
Graph Node / Finding / Scope Delta / Decision / Consumer / Evidence / Cleanup disposition.
No IGNORE, silent TODO, or disappearing finding.
Final handoff/closure requires all category flags + ACCOUNTING_COMPLETE=YES.

Structured Backtracking is first-class:
Sequence may become SUSPENDED_BY_DEPENDENCY, upstream dependency is opened JIT,
then descendant is REOPENED/RESUMED with invalidated evidence re-diagnosed.
Previously complete sequences may reopen if new truth invalidates them.

Multi-agent is encouraged when useful:
Orchestrator role owns graph/accounting/dedup/gates.
Discovery/diagnosis workers may probe in parallel.
Execution workers may write in parallel only on graph-proven independent Conflict Domains.
Verification/adversarial workers independently challenge closure.
One Execution Owner per Conflict Domain.
One target-branch Integration Owner at a time.

Parallelism is graph-proven, not agent-count-driven.
No agent without mission + graph scope + input SHA + authority + conflict domain + expected output + invalidation trigger.
No duplicate investigation unless intentional independence is the purpose.

Continuous latest-head execution:
before sequence creation/live write/integration/push/final decision, re-resolve latest remote HEAD.
DISJOINT movement is carried forward automatically.
RELATED movement reconciles affected assumptions/checks.
SEMANTIC_OVERLAP pauses only affected graph nodes.
DIRECT_CONFLICT blocks only the conflict domain while independent work may continue.
AUTHORITY_OR_TRUTH_CHANGE invalidates affected model/evidence and forces reread/re-diagnosis.
Git textual mergeability is not semantic safety.
No stale push; no force push.

PREPARE_ONLY: sequence terminal PREPARED after full diagnosis/decision/propagation/re-diagnosis/executable handoff.
EXECUTE_END_TO_END: sequence terminal COMPLETE only after root fix + consumers + cleanup + verification + governance/scope gates.
Final TARGET closure only after global graph/accounting reconciliation + final cleanup + governance + fresh-head + adversarial + final read-only verification.
```

## High-Risk Rule Preservation Audit

```text
FAIL-CLOSED + positive evidence
plans/prompts are derived, never live truth
exact remote SHA + continuous latest-head reconciliation
CODE_BASED_LEAN + proven blast-radius expansion only
true decision boundary; no discoverable-fact questions
decision impact propagation + re-diagnosis
graph-driven dependency ordering + structured backtracking + reopen
Universe/Coverage/Scope Delta/bidirectional traceability
root cause first; redesign/rebuild when structural
consumer migration + obsolete parallel-path removal
same-candidate evidence + invalidation cone
runtime freshness/readback
no blind rerun
isolated workspaces + foreign-change discipline
parallel execution only on proven independent conflict domains
one integration owner + atomic/fast-forward-safe writes + no force
cleanup/naming/reference/source-of-truth consolidation
Governance Promotion + Governance Reconciliation
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA for branch-head closure
current closureRules.closedDecision only
retention/Git history archive
```

Result: **ACCOUNTED**.

# Final Source Coverage Gate

```text
SOURCE_BASELINES_PINNED = YES
SOURCE_FAMILIES = ACCOUNTED
CURRENT_EXPLICIT_AGREEMENTS = ACCOUNTED
HIGH_RISK_SPOT_CHECK = ACCOUNTED
UNACCOUNTED = 0
DROPPED = 0
```

This proves methodology/source-rule accounting only. It does not prove Product/Runtime correctness.
