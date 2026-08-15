# Source Rule Traceability

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Purpose: prove section-level accounting and high-risk-rule preservation from the preserved prompts into the self-contained orchestrator.

## Source Baseline — exact blobs reviewed

| Source | Blob SHA | Coverage status |
|---|---|---|
| `tools/prompting/01-diagnose-plan-package.md` | `0cb6a366d2d97d1a288a8f51a4d66bd5939a7581` | ACCOUNTED |
| `tools/prompting/02-execute-verify-close.md` | `21c8e89ab0da12dc9bde55fd663c987a6be1ab2b` | ACCOUNTED |
| `tools/prompting/03-end-to-end-fail-closed.md` | `97ab148843de8a21113be3fc758894d0553b31eb` | ACCOUNTED |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | `b0735847180d69886e715aa23d1685344a7c017e` | ACCOUNTED |
| `tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md` | `53afe043118b9fe18a5069200edfbc6392b9c048` | ACCOUNTED |

If any source SHA drifts, this map becomes STALE until reread/reconciliation. Allowed mapping: `ADOPTED / MERGED_WITH_EQUIVALENT / SUPERSEDED_BY_STRONGER_RULE / NOT_APPLICABLE_WITH_REASON`. Forbidden: `UNACCOUNTED / DROPPED`.

## Source 01 — Diagnosis / package preparation

| Source section | Destination owner | Status |
|---|---|---|
| Inputs / blank TARGET semantics | `00`, `01`, generator | ADOPTED |
| §1 Authority/truth + plans derived | `01` | ADOPTED |
| §2 Remote pinning + capability | `01`, `06` | ADOPTED |
| §3 CODE_BASED_LEAN / scope | `01` | ADOPTED |
| §4 Seeded coverage | `03` | SUPERSEDED_BY_STRONGER_RULE |
| §5 Deep diagnosis + reuse-before-create | `02` | ADOPTED |
| §6 FAIL-CLOSED diagnosis | `01`, `03` | ADOPTED |
| §7 Full-stack multi-surface trace | `02` | ADOPTED |
| §8 Structural/hygiene | `02`, `05` | ADOPTED |
| §9 Canonical truth/reference network | `01`, `05` | ADOPTED |
| §10 Adversarial diagnosis | `02`, `03` | SUPERSEDED_BY_STRONGER_RULE |
| §11 True decisions only | `03`, decision contract | ADOPTED |
| §12 Domain risk gates | `01`, `04`, `05` | ADOPTED |
| §13 Concurrent-agent planning | `06` | ADOPTED |
| §14 Create/resume/rebaseline | `04`, `06` | ADOPTED |
| §15 Safe package creation | V2 overview + JIT sequence creation | SUPERSEDED_BY_STRONGER_RULE |
| §16 Coverage/units/ordering | Dependency-graph Sequences + V2 registry | SUPERSEDED_BY_STRONGER_RULE |
| §17 Verification-plan capability binding | `05`, evidence contract | ADOPTED |
| §18 Handoff mapping | overview/sequence/evidence contracts | MERGED_WITH_EQUIVALENT |
| §19 Readiness gate | per-sequence gates + global handoff/closure | SUPERSEDED_BY_STRONGER_RULE |
| §20 Latest-head delivery semantics | `01`, `06` | ADOPTED |
| §21 Retention | `06` | ADOPTED |
| §22 Report/decision | overview + sequence records + contracts | SUPERSEDED_BY_STRONGER_RULE |

## Source 02 — Execute / verify / close

| Source section | Destination owner | Status |
|---|---|---|
| §0 FAIL-CLOSED | `01` | ADOPTED |
| Inputs/§1 old modes | two user modes + sequence/review/freeze states | SUPERSEDED_BY_STRONGER_RULE |
| §2 Authority/truth/package not truth | `01` | ADOPTED |
| §3 Pin/task/resume | `01`, `06` | ADOPTED |
| §4 Capability/protected authority | `01` | ADOPTED |
| §5 Scope/Blast Radius | `01` | ADOPTED |
| §6 Candidate lifecycle | `05` | ADOPTED |
| §7 Deterministic candidate/base | `05` | ADOPTED |
| §8 Candidate existence/reachability | `05`, closure contract, validator | ADOPTED |
| §9 Workspace/staging | `01`, `06` | ADOPTED |
| §10 Concurrent isolation | `06` | ADOPTED |
| §11 Atomic GitHub writes | `06` | ADOPTED |
| §12 Push serialization | `06` | ADOPTED |
| §13 Findings Ledger | owning Sequence + `03` | SUPERSEDED_BY_STRONGER_RULE |
| §14 Root-cause loop | `04` | ADOPTED |
| §15 CI/runtime failure loop | `05` | ADOPTED |
| §16 Full-stack closure | `02`, `04`, `05` | ADOPTED |
| §17 Domain gates | `04`, `05` | ADOPTED |
| §18 Runtime freshness | `05` | ADOPTED |
| §19 Verification strategy | `05`, evidence contract | ADOPTED |
| §20 Evidence invalidation | `05`, evidence contract | ADOPTED |
| §21 Package schema/revalidation | V2 overview + JIT sequence validator | SUPERSEDED_BY_STRONGER_RULE |
| §22 Bookkeeping before Freeze | `05` | ADOPTED |
| §23 Cleanup/finishing | `04`, `05` | ADOPTED |
| §24 Latest-head integration | `05`, `06` | ADOPTED |
| §25 Delivery boundary | MODE + authority + concurrency | SUPERSEDED_BY_STRONGER_RULE |
| §26 Freeze | `05` | ADOPTED |
| §27 Final cleanup/red-team | `05` | ADOPTED |
| §28 Final read-only verification | `05` | ADOPTED |
| §29 Evidence provenance | `05`, evidence contract | ADOPTED |
| §30 Branch-race gates | `05`, `06` | ADOPTED |
| §31 Independence provenance | `05`, sequence evidence | ADOPTED |
| §32 Claim/diff/test review | `05` | ADOPTED |
| §33 Evidence Matrix | evidence contract + sequence files | ADOPTED |
| §34 Approval Matrix | `01`, `05`, sequence files | ADOPTED |
| §35 Repository-platform truth | `01`, `05` | ADOPTED |
| §36 Package validation | V2 validator + `04/05` | SUPERSEDED_BY_STRONGER_RULE |
| §37 Retention | `06` | ADOPTED |
| §38 Final closure | `05`, closure contract, validator | ADOPTED |
| §39 Final report | V2 overview/sequence records | SUPERSEDED_BY_STRONGER_RULE |
| §40 Golden rule | `00`, `01` | ADOPTED |

## Source 03 — End-to-End FAIL-CLOSED

All §§0–26 remain accounted through `01/02/04/05/06` and the current contracts. Root cause, blast radius, cleanup, canonical source consolidation, reference integrity, real/failure behavior, latest-head verification and DONE/closure conditions are unchanged. V2 changes only Derived Support structure, not proof strength. Status: **ZERO UNACCOUNTED**.

## Source 04 — Journey / multisurface diagnosis

All §§0–17 remain represented by `00/01/02/03/04` and decision/sequence contracts. The method remains Journey × Multi-Surface × Cross-Layer, strengthened by Macro Blueprint, Relation Graph, Universe/Coverage, Scope Delta, bidirectional traceability, Structured Backtracking, dependency-derived Sequences and independent adversarial completeness. Status: **ZERO UNACCOUNTED**.

## Execution Card

| Card section | Destination owner | Status |
|---|---|---|
| §1 PIN + TRUTH | `01`, `06` | ADOPTED |
| §2 root-cause execution | `01`, `04` | ADOPTED |
| §3 evidence routing | `01`, `05`, evidence contract | ADOPTED |
| §4 failure → action / no fake green | `05` | ADOPTED |
| §5 fast CI topology | `05` | ADOPTED |
| §6 special gates | `01`, `04`, `05` | ADOPTED |
| §7 write/candidate/merge safety | `05`, `06` | ADOPTED |
| §8 recovery/resume | `06` | ADOPTED |
| Golden Rules | `00`, `01` | ADOPTED |

## High-Risk Rule Preservation Audit

```text
FAIL-CLOSED + positive evidence
plans/prompts are derived, never live truth
exact remote SHA + fresh-head reconciliation
CODE_BASED_LEAN + Blast Radius/Consumers/Dependencies/Contracts/Data/Runtime
true Decision Boundary; no discoverable-fact questions
decision impact propagation + re-diagnosis
dependency ordering + Structured Backtracking
Universe/Coverage/Scope Delta/bidirectional traceability
Journey × Multi-Surface × Cross-Layer
root cause first; redesign/rebuild when structural
consumer migration + obsolete parallel-path removal
same-candidate evidence + invalidation
runtime freshness/readback
no blind rerun
workspace/foreign-change discipline
atomic writes + single push owner + no force
approval/independent-review provenance
cleanup/naming/reference/source-of-truth consolidation
Governance Promotion + Governance Reconciliation
canonical lifecycle vs decision separation
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA for branch-head closure
current closureRules.closedDecision only
retention/Git history archive
```

Result: **ACCOUNTED**.

## Explicitly Agreed Methodology — current

```text
Two modes only: PREPARE_ONLY / EXECUTE_END_TO_END
MODE is write authority, not diagnosis method
same sequential diagnosis → decision → re-diagnosis in both modes
same dependency/Structured Backtracking order

Package schema is adaptive and sequential:
00-OVERVIEW.md + NNN-<sequence>.md
one file = one coherent execution/closure sequence
no diagnosis/execution/verification split for a sequence
no fixed number of files
no fixed domain/surface directory tree
no subdirectories inside a V2 task package
sequences are derived from dependency graph
sequences are created Just-In-Time
no future placeholder sequences
at most one active non-terminal sequence by default

00-OVERVIEW is small global control/index only
sequence file owns local diagnosis/findings/root cause/decisions/re-diagnosis/target/treatment/consumers/governance/cleanup/verification/evidence/exit

PREPARE_ONLY:
each sequence fully diagnosed/decided/re-diagnosed and made execution-ready
no live mutation
sequence terminal = PREPARED
final handoff only after all sequences + global reconciliation + PACKAGE_READY

EXECUTE_END_TO_END:
execute current sequence immediately after solution/write gate
no dependent next sequence before current COMPLETE
sequence terminal = COMPLETE
final target closure only after all sequences + global reconciliation + cleanup + governance + fresh-head + adversarial/read-only verification

If a sequence grows because it contains independent closure boundaries, split the graph into multiple sequences.
Do not split merely by line count, repository folder, app, or desire to reduce file size.
Do not merge unrelated root causes merely to reduce file count.
```

Result: **ACCOUNTED**.

# Final Source Coverage Gate

```text
SOURCE_BASELINES_PINNED = YES
01 = ACCOUNTED
02 = ACCOUNTED
03 = ACCOUNTED
04 = ACCOUNTED
Execution Card = ACCOUNTED
Explicit agreements = ACCOUNTED
HIGH_RISK_SPOT_CHECK = ACCOUNTED
UNACCOUNTED = 0
DROPPED = 0
```

This proves methodology/source-rule accounting for the pinned sources. It does not prove Product/Runtime correctness. Source drift or material orchestrator/schema change reopens this gate until reconciled.
