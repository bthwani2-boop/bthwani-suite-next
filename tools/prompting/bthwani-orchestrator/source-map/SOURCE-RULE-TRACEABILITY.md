# Source Rule Traceability

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Purpose: prove that the new orchestrator accounts for all material rule sections from the preserved source prompts plus the explicitly agreed methodology.

Allowed status only:

```text
ADOPTED
MERGED_WITH_EQUIVALENT
SUPERSEDED_BY_STRONGER_RULE
NOT_APPLICABLE_WITH_REASON
```

Forbidden final status:

```text
UNACCOUNTED
DROPPED
```

## Sources Preserved Unchanged

```text
tools/prompting/01-diagnose-plan-package.md
tools/prompting/02-execute-verify-close.md
tools/prompting/03-end-to-end-fail-closed.md
tools/prompting/04-journey-multisurface-operational-diagnosis.md
tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md
```

The new package does not require agents to reload those sources during normal task execution; their durable methodology is consolidated below.

---

## Source 01 — `01-diagnose-plan-package.md`

| Source section | Destination owner | Status | Consolidation |
|---|---|---|---|
| Intro/inputs/TARGET semantics | `00-ORCHESTRATOR`, `01-CORE-CONTRACT` | ADOPTED | Invocation, blank-target and mode-aware scope rules |
| §1 Authority/truth + plans are derived | `01-CORE-CONTRACT` | ADOPTED | Single truth hierarchy + derived-support rule |
| §2 Remote pinning/capabilities | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Pinning in Core; head movement in concurrency |
| §3 CODE_BASED_LEAN/scope | `01-CORE-CONTRACT` | ADOPTED | One scope owner |
| §4 Seeded Coverage | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | SUPERSEDED_BY_STRONGER_RULE | Replaced by Universe Inventory + bounded coverage + supported exclusions |
| §5 Deep diagnosis | `02-DISCOVERY-DIAGNOSIS` | ADOPTED | Journey/graph-driven diagnosis |
| §6 FAIL-CLOSED diagnosis | `01-CORE-CONTRACT`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED | Core state + coverage gates |
| §7 Full-stack multi-surface trace | `02-DISCOVERY-DIAGNOSIS` | ADOPTED | Cross-surface/cross-layer journey model |
| §8 Structural cleanup diagnosis | `02-DISCOVERY-DIAGNOSIS`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED | Diagnose residue early; final cleanup later |
| §9 Canonical truth/reference network | `01-CORE-CONTRACT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED | Ownership + reference integrity |
| §10 Adversarial Diagnosis | `02-DISCOVERY-DIAGNOSIS`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | SUPERSEDED_BY_STRONGER_RULE | Adds independent completeness pass and reopen behavior |
| §11 Questions/decision gate | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, decision contract | ADOPTED | True decision boundary + batch/dedup |
| §12 Domain risks | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED | Risk escalation + domain gates |
| §13 Concurrent-agent planning | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Central concurrency owner |
| §14 Package create/resume/rebaseline | `04-PACKAGE-EXECUTION`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Three-file package + resume/rebaseline |
| §15 Safe package creation | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Atomic remote writes and verification |
| §16 Coverage/units/ordering | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, `04-PACKAGE-EXECUTION` | SUPERSEDED_BY_STRONGER_RULE | Graph coverage + root-cause execution ordering replaces old file-heavy schema |
| §17 Verification plan/capability binding | `05-VERIFICATION-CLEANUP-CLOSURE`, evidence contract | ADOPTED | Candidate-bound evidence contract |
| §18 Handoff mapping | diagnosis/execution/evidence contracts | MERGED_WITH_EQUIVALENT | Mapped into the three task-package documents instead of a parallel schema |
| §19 Readiness Gate | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, `04-PACKAGE-EXECUTION` | SUPERSEDED_BY_STRONGER_RULE | Four explicit readiness gates + PACKAGE_READY |
| §20 Delivery/latest-head | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Mode write authority + latest-head reconciliation |
| §21 Retention | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED | Derived support + Git history archive |
| §22 Report/decision | output contracts, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED | Split by lifecycle document, not duplicated |

Result: **ZERO UNACCOUNTED source sections.**

---

## Source 02 — `02-execute-verify-close.md`

| Source section | Destination owner | Status |
|---|---|---|
| §0 FAIL-CLOSED contract | `01-CORE-CONTRACT` | ADOPTED |
| Inputs + §1 execution modes/handoff | `00-ORCHESTRATOR`, `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION` | SUPERSEDED_BY_STRONGER_RULE |
| §2 Authority/truth/package not truth | `01-CORE-CONTRACT` | ADOPTED |
| §3 Pin/task identity/resume | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §4 Capability + protected authority gate | `01-CORE-CONTRACT` | ADOPTED |
| §5 Scope/Blast Radius | `01-CORE-CONTRACT` | ADOPTED |
| §6 Candidate lifecycle | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §7 AUTO resolution | `05-VERIFICATION-CLEANUP-CLOSURE`, `06-CONCURRENCY-RESUME-RECOVERY` | MERGED_WITH_EQUIVALENT |
| §8 candidate existence/relation | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §9 workspace/staging hygiene | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §10 concurrent isolation | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §11 atomic GitHub writes | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §12 push serialization | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §13 Findings Ledger | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §14 Root-Cause loop | `04-PACKAGE-EXECUTION` | ADOPTED |
| §15 CI/runtime failure loop | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §16 Full-stack closure | `02-DISCOVERY-DIAGNOSIS`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §17 Domain Gates | `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §18 Runtime freshness/state isolation | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §19 Verification strategy | `05-VERIFICATION-CLEANUP-CLOSURE`, evidence contract | ADOPTED |
| §20 Evidence invalidation | `05-VERIFICATION-CLEANUP-CLOSURE`, evidence contract | ADOPTED |
| §21 Package current-schema/revalidation | `04-PACKAGE-EXECUTION`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §22 Package bookkeeping before Freeze | `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §23 Cleanup/refactor/finishing | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §24 Final latest-head integration | `05-VERIFICATION-CLEANUP-CLOSURE`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §25 Delivery boundary | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | SUPERSEDED_BY_STRONGER_RULE |
| §26 Freeze | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §27 Final cleanup/hardening/red-team | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §28 Final read-only verification | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §29 Evidence provenance/artifacts | evidence contract | ADOPTED |
| §30 Branch-race gates | `06-CONCURRENCY-RESUME-RECOVERY`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §31 Independence provenance | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §32 Claim/diff/test review | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §33 Evidence Matrix | evidence contract | ADOPTED |
| §34 Approval Matrix | `01-CORE-CONTRACT`, closure contract | ADOPTED |
| §35 GitHub/CI/repository-platform truth | `01-CORE-CONTRACT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §36 Package validation semantics | `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §37 Retention | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §38 Final closure gate | `05-VERIFICATION-CLEANUP-CLOSURE`, closure contract | ADOPTED |
| §39 Final report | closure/evidence/execution contracts | MERGED_WITH_EQUIVALENT |
| §40 Golden rule | `01-CORE-CONTRACT`, `00-ORCHESTRATOR` | ADOPTED |

Execution-mode simplification note: old `EXECUTE_PACKAGE/EXECUTE_DIRECT/REVIEW_CANDIDATE` user-facing modes are **superseded** in this package by two user-facing modes only: `PREPARE_ONLY` and `EXECUTE_END_TO_END`. Internal review/freeze states remain in the state machine, preserving the safety requirements without exposing extra invocation complexity.

Result: **ZERO UNACCOUNTED source sections.**

---

## Source 03 — `03-end-to-end-fail-closed.md`

| Source section | Destination owner | Status |
|---|---|---|
| §0 governing rule + source truth + decision/capabilities | `01-CORE-CONTRACT` | ADOPTED |
| §1 Root Cause | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION` | ADOPTED |
| §2 zero tolerance | `01-CORE-CONTRACT`, closure contract | ADOPTED |
| §3 Blast Radius scope | `01-CORE-CONTRACT` | ADOPTED |
| §4 E2E path | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §5 no partial success | `01-CORE-CONTRACT`, evidence contract | ADOPTED |
| §6 execute not report | `04-PACKAGE-EXECUTION` | ADOPTED |
| §7 cleanup part of DONE | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §8 all structural levels | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §9 remove obsolete material | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §10 Git is history | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §11 structural organization | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §12 naming | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §13 one source of truth | `01-CORE-CONTRACT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §14 reference network | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §15 noise reduction | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §16 prevent new technical debt | `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §17 real/failure behavior | `02-DISCOVERY-DIAGNOSIS`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §18 adversarial verification | `02-DISCOVERY-DIAGNOSIS`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §19 execution/verification cycle | `00-ORCHESTRATOR`, `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | MERGED_WITH_EQUIVALENT |
| §20 authority to refactor | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION` | ADOPTED |
| §21 final finishing gate | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §22 final technical gate | `05-VERIFICATION-CLEANUP-CLOSURE`, evidence contract | ADOPTED |
| §23 latest-head verification | `05-VERIFICATION-CLEANUP-CLOSURE`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §24 DONE conditions | closure contract | ADOPTED |
| §25 DONE definition | closure contract | ADOPTED |
| §26 final decision questions | closure contract, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |

Result: **ZERO UNACCOUNTED source sections.**

---

## Source 04 — `04-journey-multisurface-operational-diagnosis.md`

| Source section | Destination owner | Status |
|---|---|---|
| §0 objective | `00-ORCHESTRATOR`, `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §1 wave methodology | `00-ORCHESTRATOR`, `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §2 real scope | `01-CORE-CONTRACT` | ADOPTED |
| §3 broad discovery | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §4 journey × surface × layer | `02-DISCOVERY-DIAGNOSIS`, diagnosis contract | ADOPTED |
| §5 multi-direction analysis | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §6 UX states | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §7 Findings Ledger | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §8 evidence conflict | `01-CORE-CONTRACT` | SUPERSEDED_BY_STRONGER_RULE |
| §9 Decision Boundary | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §10 when to ask | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §11 Decision Ledger | decision contract | ADOPTED |
| §12 Re-Diagnosis | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| §13 journey ordering | `02-DISCOVERY-DIAGNOSIS` | SUPERSEDED_BY_STRONGER_RULE |
| §14 journey-understanding gate | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| §15 readiness | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | SUPERSEDED_BY_STRONGER_RULE |
| §16 package creation | `04-PACKAGE-EXECUTION` | SUPERSEDED_BY_STRONGER_RULE |
| §17 golden rules | `00-ORCHESTRATOR`, `01-CORE-CONTRACT` | ADOPTED |

Stronger replacements added: Macro Blueprint Gate, Relation Graph ordering, Coverage accounting, Scope Delta, bidirectional traceability, and independent adversarial completeness.

Result: **ZERO UNACCOUNTED source sections.**

---

## Execution Card — `BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md`

| Source section | Destination owner | Status |
|---|---|---|
| §1 PIN + TRUTH | `01-CORE-CONTRACT`, `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| §2 root-cause execution | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION` | ADOPTED |
| §3 applicable evidence | `01-CORE-CONTRACT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §4 failure→action | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §5 fast CI topology | `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §6 special gates | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §7 write/candidate/merge | `06-CONCURRENCY-RESUME-RECOVERY`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| §8 recovery command | `06-CONCURRENCY-RESUME-RECOVERY` | ADOPTED |
| Golden Rules | `00-ORCHESTRATOR`, `01-CORE-CONTRACT` | ADOPTED |

Result: **ZERO UNACCOUNTED source sections.**

---

## Explicitly Agreed Methodology Beyond the Five Sources

| Agreed rule | Destination owner | Status |
|---|---|---|
| Two invocation modes only: PREPARE_ONLY / EXECUTE_END_TO_END | `00-ORCHESTRATOR`, `01-CORE-CONTRACT` | ADOPTED |
| MODE is write authority, not a label | `01-CORE-CONTRACT` | ADOPTED |
| Command package under `tools/prompting/**` is documentation only | `00-ORCHESTRATOR`, `01-CORE-CONTRACT` | ADOPTED |
| Task packages live under `plans/diagnose-implementing/**` | `00-ORCHESTRATOR`, `04-PACKAGE-EXECUTION` | ADOPTED |
| Task package has three lifecycle files by default | `04-PACKAGE-EXECUTION`, output contracts | ADOPTED |
| Durable truth must survive deletion of prompt/plan packages | `01-CORE-CONTRACT`, `04-PACKAGE-EXECUTION`, closure contract | ADOPTED |
| Governance Promotion + Governance Reconciliation | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| ACTUAL / INTENDED / DESIRED / CONFLICT separation | `01-CORE-CONTRACT`, diagnosis contract | ADOPTED |
| Macro Operational Blueprint before expensive micro-diagnosis | `02-DISCOVERY-DIAGNOSIS`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| Graph-driven dependency ordering + structured backtracking | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| Universe Inventory + Coverage Ledger | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| Bidirectional traceability | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| Scope Delta Ledger | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| Wave Exit Gate + periodic reconciliation | `03-DECISIONS-COVERAGE-ANTI-DRIFT` | ADOPTED |
| Independent adversarial completeness pass | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| Global breadth + local/risk-adaptive depth | `00-ORCHESTRATOR`, `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| Hypothesis → cheapest discriminating evidence | `02-DISCOVERY-DIAGNOSIS` | ADOPTED |
| Affected surfaces may be IN_SCOPE / READ_ONLY / NOT_AFFECTED_WITH_PROOF | `01-CORE-CONTRACT`, `03-DECISIONS-COVERAGE-ANTI-DRIFT` | MERGED_WITH_EQUIVALENT |
| Cleanup occurs locally after root fix and globally before closure | `04-PACKAGE-EXECUTION`, `05-VERIFICATION-CLEANUP-CLOSURE` | ADOPTED |
| Final completeness cannot rely on ZERO KNOWN alone | `03-DECISIONS-COVERAGE-ANTI-DRIFT`, closure contract | ADOPTED |
| Source rules have one owner; avoid prompt duplication/context noise | package structure itself | ADOPTED |

Result: **ZERO UNACCOUNTED agreed rules.**

---

# Final Source Coverage Gate

```text
01-diagnose-plan-package.md: ACCOUNTED
02-execute-verify-close.md: ACCOUNTED
03-end-to-end-fail-closed.md: ACCOUNTED
04-journey-multisurface-operational-diagnosis.md: ACCOUNTED
Execution Card: ACCOUNTED
Explicitly agreed methodology: ACCOUNTED

UNACCOUNTED = 0
DROPPED = 0
```

This matrix proves **rule-accounting coverage of the identified source sections and agreements**. It does not prove product correctness, runtime correctness, or that no future governance/source change can invalidate this package. If any preserved source changes materially, this matrix and affected orchestrator modules must be re-reconciled before claiming the package remains current.