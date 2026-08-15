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

**Source Drift Rule:** if any current source blob SHA differs from this table, this map becomes `STALE` until the changed source is reread and affected mappings are reconciled. A stale map cannot support `ZERO UNACCOUNTED`.

Allowed mapping status:

```text
ADOPTED
MERGED_WITH_EQUIVALENT
SUPERSEDED_BY_STRONGER_RULE
NOT_APPLICABLE_WITH_REASON
```

Forbidden:

```text
UNACCOUNTED
DROPPED
```

## Source 01 — Diagnosis / package preparation

| Source section | Destination owner | Status |
|---|---|---|
| Inputs / blank TARGET semantics | `00-ORCHESTRATOR`, `01-CORE-CONTRACT`, current generator | ADOPTED |
| §1 Authority/truth + plans are derived | `01-CORE-CONTRACT` | ADOPTED |
| §2 Remote pinning + capability preflight | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §3 CODE_BASED_LEAN / real scope | `01-CORE-CONTRACT` | ADOPTED |
| §4 Seeded coverage | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | SUPERSEDED_BY_STRONGER_RULE |
| §5 Deep diagnosis + reuse-before-create | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §6 FAIL-CLOSED diagnosis | `01-CORE-CONTRACT`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §7 Full-stack multi-surface trace | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §8 Structural/hygiene diagnosis | `02-DISCOVERY-DIAGNOSIS`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §9 Canonical truth/reference network | `01-CORE-CONTRACT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §10 Adversarial diagnosis | `02-DISCOVERY-DIAGNOSIS`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | SUPERSEDED_BY_STRONGER_RULE |
| §11 Questions/true decision gate | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, decision contract | ADOPTED |
| §12 PostgreSQL/compat/security/DSH-WLT/mobile/control-panel/design risks | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §13 Concurrent-agent planning | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §14 Create/resume/rebaseline | `04-PACKAGE-EXECUTION`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §15 Safe package creation | `04-PACKAGE-EXECUTION`, `06-CONCURRENCY-RESUME-RECOVERY`, current generator | ADOPTED |
| §16 Coverage/units/ordering | graph/coverage + exact three-file schema | SUPERSEDED_BY_STRONGER_RULE |
| §17 Verification-plan capability binding | `05-VERIFICATION-CLEANUP-CLOSURE`, evidence contract | ADOPTED |
| §18 Handoff mapping | diagnosis/execution/evidence contracts | MERGED_WITH_EQUIVALENT |
| §19 Readiness gate | four pre-package gates + `PACKAGE_READY` | SUPERSEDED_BY_STRONGER_RULE |
| §20 Delivery/latest-head semantics | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §21 Retention | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §22 Report/decision | current three output files + contracts | ADOPTED |

## Source 02 — Execute / verify / close

| Source section | Destination owner | Status |
|---|---|---|
| §0 FAIL-CLOSED | `01-CORE-CONTRACT` | ADOPTED |
| Inputs/§1 old execution modes | two user modes + internal review/freeze states | SUPERSEDED_BY_STRONGER_RULE |
| §2 Authority/truth/package not truth | `01-CORE-CONTRACT` | ADOPTED |
| §3 Pin/task identity/resume | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §4 Capability + protected authority | `01-CORE-CONTRACT` | ADOPTED |
| §5 Scope/Blast Radius | `01-CORE-CONTRACT` | ADOPTED |
| §6 Candidate lifecycle | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §7 Deterministic AUTO/base/candidate resolution | deterministic Candidate/Base section in `05` | SUPERSEDED_BY_STRONGER_RULE |
| §8 Candidate existence/reachability/head relation | `05`, closure contract, validator branch-head equality | ADOPTED |
| §9 Workspace/staging hygiene | `01`, `06` | ADOPTED |
| §10 Concurrent isolation | `06` | ADOPTED |
| §11 Atomic GitHub writes | `06` | ADOPTED |
| §12 Push serialization | `06` | ADOPTED |
| §13 Findings Ledger | `03` | ADOPTED |
| §14 Root-cause loop | `04` | ADOPTED |
| §15 CI/runtime failure loop | `05` | ADOPTED |
| §16 Full-stack closure | `02`, `05` | ADOPTED |
| §17 Domain gates | `04`, `05` | ADOPTED |
| §18 Runtime freshness/state isolation | `05` | ADOPTED |
| §19 Verification strategy | `05`, evidence contract | ADOPTED |
| §20 Evidence invalidation | `05`, evidence contract | ADOPTED |
| §21 Package current-schema/revalidation | `04`, `06`, validator | ADOPTED |
| §22 Package bookkeeping before Freeze | `05` | ADOPTED |
| §23 Cleanup/refactor/finishing | `05` | ADOPTED |
| §24 Final latest-head integration | `05`, `06` | ADOPTED |
| §25 Delivery boundary | MODE + protected-action authority + concurrency rules | SUPERSEDED_BY_STRONGER_RULE |
| §26 Freeze | `05` | ADOPTED |
| §27 Final cleanup/hardening/red-team | `05` | ADOPTED |
| §28 Final read-only verification | `05` | ADOPTED |
| §29 Evidence provenance/artifact integrity | `05`, evidence contract | ADOPTED |
| §30 Branch-race gates | `05`, `06` | ADOPTED |
| §31 Independence provenance | `05`, current 03 task template | ADOPTED |
| §32 Claim/diff/test review | `05` | ADOPTED |
| §33 Evidence Matrix | evidence contract + current 03 task template | ADOPTED |
| §34 Approval Matrix | `01`, `05`, current 03 task template | ADOPTED |
| §35 GitHub/CI/repository-platform truth | `01`, `05` | ADOPTED |
| §36 Package validation semantics | current validator + `05` | ADOPTED |
| §37 Retention | `06` | ADOPTED |
| §38 Final closure gate | `05`, closure contract, validator | ADOPTED |
| §39 Final report | current three-file schema/contracts | MERGED_WITH_EQUIVALENT |
| §40 Golden rule | `00`, `01` | ADOPTED |

## Source 03 — End-to-End FAIL-CLOSED

| Source section | Destination owner | Status |
|---|---|---|
| §0 governing rule/source truth/decision/capabilities | `01` | ADOPTED |
| §1 Root Cause / redesign when structural | `01`, `04` | ADOPTED |
| §2 zero tolerance | `01`, closure contract | ADOPTED |
| §3 Blast Radius | `01` | ADOPTED |
| §4 E2E path | `02` | ADOPTED |
| §5 no partial success | `01`, evidence contract | ADOPTED |
| §6 execute not report | `04` | ADOPTED |
| §7 cleanup part of DONE | `05` | ADOPTED |
| §8 all structural levels | `05` | ADOPTED |
| §9 remove obsolete material | `05` | ADOPTED |
| §10 Git is history | `06` | ADOPTED |
| §11 structural organization | `05` | ADOPTED |
| §12 naming | `05` | ADOPTED |
| §13 one source of truth | `01`, `05` | ADOPTED |
| §14 reference network | `05` | ADOPTED |
| §15 noise reduction | `05` | ADOPTED |
| §16 prevent new debt | `04`, `05` | ADOPTED |
| §17 real/failure behavior | `02`, `05` | ADOPTED |
| §18 adversarial verification | `02`, `05` | ADOPTED |
| §19 execution/verification cycle | `00`, `04`, `05` | MERGED_WITH_EQUIVALENT |
| §20 authority to refactor | `01`, `04` | ADOPTED |
| §21 final finishing gate | `05` | ADOPTED |
| §22 final technical gate | `05`, evidence contract | ADOPTED |
| §23 latest-head verification | `05`, `06`, validator | ADOPTED |
| §24 DONE conditions | closure contract | ADOPTED |
| §25 DONE definition | closure contract | ADOPTED |
| §26 final decision questions | closure contract + canonical decision vocabulary separation | ADOPTED |

## Source 04 — Journey / multisurface diagnosis

All §§0–17 are represented by `00/01/02/03/04` and the Diagnosis/Decision contracts. The original method is strengthened by Macro Blueprint Gate, Relation Graph ordering, Universe/Coverage, Scope Delta, bidirectional traceability, structured backtracking and independent adversarial completeness. Status: **ZERO UNACCOUNTED**.

## Execution Card

| Card section | Destination owner | Status |
|---|---|---|
| §1 PIN + TRUTH | `01`, `06` | ADOPTED |
| §2 root-cause execution | `01`, `04` | ADOPTED |
| §3 applicable evidence routing | `01`, `05`, evidence contract | ADOPTED |
| §4 failure → action / no fake green | `05` | ADOPTED |
| §5 fast CI topology / no duplicate heavy CI | explicit CI topology in `05` | ADOPTED |
| §6 special gates | `01`, `04`, `05` | ADOPTED |
| §7 write/candidate/merge safety | `05`, `06` | ADOPTED |
| §8 recovery/resume | `06` | ADOPTED |
| Golden Rules | `00`, `01` | ADOPTED |

## High-Risk Rule Preservation Audit

These rules were independently spot-checked after section mapping because section accounting alone can hide semantic loss:

```text
FAIL-CLOSED default and positive evidence
plans/prompts are derived, never live truth
exact remote SHA + fresh-head reconciliation
CODE_BASED_LEAN + Blast Radius/Consumers/Dependencies/Contracts/Data/Runtime
all applicable capabilities, never blind tool use or invented execution
true Decision Boundary; no discoverable-fact questions
decision impact propagation + re-diagnosis
Universe/Coverage/Scope Delta/bidirectional traceability
Journey × Multi-Surface × Cross-Layer + forward/reverse/temporal/failure/recovery
root cause first; redesign/rebuild when root is structural
consumer migration + removal of obsolete parallel path
candidate/base deterministic resolution; no arbitrary parent
package bookkeeping before Freeze
no writes during final read-only verification
same-candidate evidence + evidence invalidation
runtime freshness/readback
failure classification; no blind rerun
fast CI topology; no duplicate heavy CI on same valid candidate
workspace/staging/foreign-change discipline
atomic remote writes + single push owner + no force
approval matrix + protected action authority
independent-review provenance
cleanup/structural hygiene/naming/reference/source-of-truth consolidation
Governance Promotion + Governance Reconciliation
canonical lifecycle-vs-decision separation
branch-head closure requires HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
current closureRules.closedDecision only
retention/Git history archive
```

Result: **ACCOUNTED**.

## Explicitly Agreed Methodology

```text
Two modes only: PREPARE_ONLY / EXECUTE_END_TO_END
MODE is write authority
command package = documentation/control plane only
task package = derived data plane under plans
exactly three task-package files
no parallel legacy template/schema
ACTUAL / INTENDED / DESIRED / CONFLICT
Macro Blueprint before expensive deep waves
Graph-driven foundations + structured backtracking
Global breadth + risk-adaptive depth
Hypothesis → cheapest discriminating evidence
Governance Promotion of durable truth
local cleanup after each root fix + final structural sweep
source rules have one owner; avoid context duplication
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

This proves methodology/source-rule accounting for the pinned sources. It does **not** prove product/runtime correctness. Any source blob drift, governance vocabulary drift, or orchestrator change reopens this source-coverage gate until reconciled.
