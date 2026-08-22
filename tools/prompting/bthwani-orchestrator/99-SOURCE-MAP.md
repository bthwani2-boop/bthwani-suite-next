# Source Consolidation and Atomic Semantic Disposition Record

STATUS: CONSOLIDATION_RECORD_ONLY
ATOMIC_SOURCE_AUDIT_REVISION: 4
RUNTIME_AUTHORITY: NO
EXECUTION_AUTHORITY: NO
EXTERNAL_SOURCE_DEPENDENCY: NONE

## 1. Purpose

This file records how material execution semantics were consolidated into the self-contained package. It exists for human review, future cleanup and proof that retained legacy source files are no longer required for execution.

It is **not** a validator, guard, registry, runtime dependency, plan package or execution entry point. Normal execution does not need to read it.

The legacy files listed below remain physically present only because the human explicitly required temporary retention. Their presence is historical/source-corpus retention only; they are not executable authority and may be deleted later after repository-wide reference/reachability proof and explicit authorization.

This revision records source material at **material semantic-atom** granularity rather than relying only on broad concept families. A semantic atom is a materially distinct law, constraint, procedure, failure mode, evidence rule, safety rule, scope rule, execution rule, exception or closure rule. Literal wording and repeated emphasis are not separate atoms when they express the same law.

## 2. Reviewed repository source corpus

| Source path | Blob SHA at consolidation review | Role after consolidation |
|---|---|---|
| `tools/commandn` | `6e13b3670a2ba7d73e2294da34ae3a4f17e43dac` | `HISTORICAL_SOURCE_CORPUS` |
| `tools/prompting/01-diagnose-plan-package.md` | `0cb6a366d2d97d1a288a8f51a4d66bd5939a7581` | `HISTORICAL_SOURCE_CORPUS` |
| `tools/prompting/02-execute-verify-close.md` | `21c8e89ab0da12dc9bde55fd663c987a6be1ab2b` | `HISTORICAL_SOURCE_CORPUS` |
| `tools/prompting/03-end-to-end-fail-closed.md` | `97ab148843de8a21113be3fc758894d0553b31eb` | `HISTORICAL_SOURCE_CORPUS` |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | `b0735847180d69886e715aa23d1685344a7c017e` | `HISTORICAL_SOURCE_CORPUS` |
| `tools/prompting/05-universal-deep-diagnose-prepare-execute-reconstruct.md` | `b08b11bf6188e5c03d1172466777dfbb9d352e90` | `HISTORICAL_SOURCE_CORPUS` |

Current human review material supplied on 2026-08-17 was also reviewed for extraction gaps, especially goal-driven invocation, research escalation, source-disposition traceability, staging/hunk safety, repository-platform truth, canonical target modeling, patch-loop prevention, parallel-truth root detection and engineering-governance/toolchain efficiency. It is not a runtime dependency after the current requirements were incorporated.

## 3. Disposition vocabulary

```text
MIGRATED
= concept retained with a canonical owner in the current package.

MERGED
= overlapping/repeated formulations consolidated into one canonical law.

GENERALIZED
= task/package/topology-specific wording replaced by a reusable invariant preserving its material intent.

SUPERSEDED
= historical mechanism intentionally replaced by a simpler current model while retaining any material invariant.

TASK_SPECIFIC_NOT_CANONICAL
= useful only to a historical invocation/ref/topology; not adopted as a universal package law.

REJECTED_AS_SELF_REFERENTIAL_AUTOMATION
= machine machinery whose purpose was to run/validate/police the orchestrator itself; intentionally excluded.

REJECTED_AS_DEFAULT_PLAN_MACHINERY
= mandatory planning/package lifecycle intentionally removed from normal live execution.

REJECTED_AS_RIGID_NUMERIC_RULE
= useful intent retained, but fixed numeric topology was not adopted because ownership/value is the real invariant.
```

## 4. Canonical internal ownership map

| Concept owner | Responsibility |
|---|---|
| `00-ORCHESTRATOR.md` | Governing law; objective-driven lifecycle; invocation; independence/protection; valid stop states. |
| `01-SCOPE-AUTHORITY-RULES.md` | Authority/truth; objective/focus/scope routing; research/capability discipline; exclusions; concurrency; longevity. |
| `02-DIAGNOSE-ROOT-CAUSE.md` | Coverage; journeys; diagnostic angles; findings; decisions; root proof/ranking; canonical target model; readiness. |
| `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` | Actual treatment; reconstruction; cutover; cleanup; migrations; engineering-control-path treatment; workspace/staging/mutation discipline. |
| `04-VERIFY-REDIAGNOSE-CLOSE.md` | Candidate/evidence provenance; repository-platform truth when required; verification; re-diagnosis; closure. |
| `focus/code-architecture-organization.md` | Code/architecture/structure/UI/UX/discoverability application. |
| `focus/governance-product-design.md` | Product/governance semantics; engineering-governance value; new-control-artifact gate. |
| `focus/data-contracts-runtime-security-quality.md` | Data/contracts/runtime/security/finance/quality/control-path efficiency application. |

## 5. Cross-source material concept disposition

| Material concept from reviewed corpus | Canonical destination | Disposition | Reason |
|---|---|---|---|
| Goal/objective-driven execution with scope derived from semantic outcome | `00`, `01` | `MIGRATED` | Revision 4 makes objective the first-class routing input. |
| Semantic-first / top-down operational diagnosis | `00`, `01`, `02` | `MIGRATED` | Prevents leaf-first execution. |
| Bottom-up evidence with technical findings held until promoted | `00`, `02` | `MERGED` | One evidence-authority model. |
| Highest proven systemic root / competitive deepening / leverage ranking | `02` | `MIGRATED` | Canonical root-selection method. |
| Product outcome → actors → journeys → states → handoffs → owners descent | `02` | `MIGRATED` | Canonical semantic model. |
| Journey-by-journey × multi-surface × cross-layer diagnosis | `02` | `MIGRATED` | Includes forward/reverse/temporal/responsibility/cross-surface. |
| Invariant / counterfactual / negative-space / experimental / adversarial diagnosis | `02` | `MIGRATED` | Preserved as mandatory applicable angles. |
| Findings ledger + falsification + root proof | `02` | `MIGRATED` | Findings remain addressable and challengeable. |
| True Decision Boundary + batched high-value questions + re-diagnosis after decision | `00`, `02` | `MERGED` | One decision model. |
| Research escalation for technical/standard/platform knowledge gaps | `00`, `01`, `02`, `focus/governance-product-design.md` | `MIGRATED` | Current human requirement; external evidence cannot invent Product Truth. |
| Capability → evidence → acquisition path → proof limit binding | `01`, `04` | `MIGRATED` | Prevents capability gaps from becoming assumed PASS. |
| Source-of-Fix / actual implementation owner required before execution | `02`, `03` | `MIGRATED` | Documentation cannot close implementation roots. |
| Canonical Target Model before material reconstruction | `02` | `MIGRATED` | Prevents random/local refactor and makes target falsifiable. |
| Patch-loop breaker / re-diagnose upstream after repeated descendant fixes | `02` | `MIGRATED` | Prevents symptom treadmill. |
| Parallel truth / duplicate writer / shadow state as root-level signals | `02`, `03`, `04` | `MIGRATED` | Canonical ownership/cutover is root treatment, not cleanup-only. |
| Root fix across writers/readers/consumers/contracts/data/runtime/surfaces | `03` | `MIGRATED` | Canonical live treatment. |
| Canonical cutover + zero parallel truth + remove reachable obsolete paths | `00`, `03`, `04` | `MERGED` | One final-state truth. |
| Preserve proven value; KEEP/HARDEN/MOVE/RENAME/MERGE/SPLIT/REFACTOR/MIGRATE/REGENERATE/REWRITE/REPLACE/DELETE | `03` | `MIGRATED` | Reconstruction without value destruction. |
| No clean-room rebuild of sound foundations | `03` | `MIGRATED` | Rebuild wrong context/ownership, not sound lines. |
| Git is history; active tree is present truth | `03` | `MIGRATED` | Avoid active backup/legacy residue. |
| Structural/naming/reference/discoverability finishing | `03`, `focus/code-architecture-organization.md` | `MIGRATED` | Cleanup includes future-maintainer clarity. |
| Strict workspace/staging/hunk ownership; no blind broad staging/reset/clean | `03` | `MIGRATED` | Revision 4 restores foreign-hunk protection. |
| Forward-only migrations + backfill/cutover/readback | `03`, `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Protects applied history and canonical data truth. |
| Finance/WLT canonical authority + idempotency/unknown-result/reconciliation | `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Preserved financial safety semantics. |
| Security/auth/authz/isolation/IDOR/provider-signature lens | `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Preserved as always-on impact lens. |
| Exact candidate lifecycle, freeze, runtime provenance, evidence invalidation | `04` | `MIGRATED` | Evidence bound to actual claimed state. |
| Minimal material evidence provenance record | `04` | `MIGRATED` | Retains candidate/run/environment/proof-limit value without mandatory matrix bureaucracy. |
| Repository-platform truth: live checks/rulesets/reviews/mergeability when claim depends on them | `04` | `MIGRATED` | Tracked config does not prove live platform state. |
| Concurrent/foreign delta reconciliation + non-force atomic update preference | `01`, `03`, `04` | `MERGED` | Preserves other work and current truth. |
| No blind rerun; classify deterministic/infra/provider/flaky/stale failure | `04` | `MIGRATED` | Prevents fake green loops. |
| Self-review is not independent review; prove independence only when required | `04` | `MIGRATED` | Retains provenance principle without mandatory matrix bureaucracy. |
| Approval/authority for irreversible operations | `01` | `MERGED` | Retains safety without mandatory approval-matrix artifact. |
| Engineering execution efficiency: MEASURE → TRACE → ROOT → SIMPLIFY/DELETE → MEASURE AGAIN | `03`, `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Explicit control-path root treatment. |
| Unique-value test for Guards/Scripts/CI/Registries/Policies/Skills/Hooks/Routers | `focus/governance-product-design.md`, `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Engineering governance is subject to root-cause/YAGNI treatment. |
| New control-artifact creation requires unique need/value/consumer/trigger/owner and no simpler owner | `focus/governance-product-design.md` | `MIGRATED` | Prevents control-plane growth as a substitute for ownership resolution. |
| Before→after proof + no cost shift + assurance preserved | `03`, `04`, `focus/data-contracts-runtime-security-quality.md` | `MIGRATED` | Required for tooling/performance roots. |
| One concept → one canonical owner; avoid internal law duplication | `00`, `01` | `MIGRATED` | Package structure itself follows the rule. |
| Mandatory PREPARE_ONLY / task package / package generator / package schema lifecycle | none | `REJECTED_AS_DEFAULT_PLAN_MACHINERY` | Current architecture is direct live execution; planning artifacts are opt-in only. |
| Orchestrator self-validator / self-guard / workflow/CLI/machine status registry | none | `REJECTED_AS_SELF_REFERENTIAL_AUTOMATION` | Plain-text package must not depend on self-certification. |
| Fixed numeric topology such as “exactly one guard registry/router” | none | `REJECTED_AS_RIGID_NUMERIC_RULE` | Retained invariant is unique responsibility/value, not arbitrary count. |
| Heavy mandatory Evidence/Approval matrices for every task | `01`, `04` | `SUPERSEDED` | Claim/risk-proportional evidence and authority gates preserve value without default bureaucracy. |

## 6. Atomic audit — `tools/commandn`

| Source atom | Current disposition |
|---|---|
| Header/Quick Prompt/Governing law: semantic-first, highest-root-first, actual-system treatment, zero parallel/legacy/documentation-only closure | `00`, `02`, `03`, `04` — `MERGED` |
| §1 highest material meaning before files/CI/APIs/DB/tests | `00`, `01`, `02` — `MIGRATED` |
| §2 UX as complete operational experience and cross-surface semantic consistency | `02`, `focus/code-architecture-organization.md` — `MIGRATED` |
| §3 bottom-up evidence; technical findings remain `EVIDENCE/HOLD`; diagnostic-blocker exception | `00`, `02` — `MIGRATED` |
| §4 target-wide semantic discovery before blind exhaustive technical scan | `00`, `02` — `MIGRATED` |
| §5 systemic-leverage ranking rather than discovery/ease/CI order | `02` — `MIGRATED` |
| §6 execute once highest root is proven/deepened/executable and no higher root can change treatment | `02` — `MIGRATED` |
| §7 actual source/data/runtime/contracts are treatment location; docs are evidence/record only | `00`, `03`, `04` — `MIGRATED` |
| §8 Source-of-Fix gate | `02` §15 — `MIGRATED` |
| §9 coherent End-to-End cutover across semantic/consumer/contract/data/runtime cone | `03` §§2,9 — `MIGRATED` |
| §10 no patch/workaround/fallback/parallel truth/reachable legacy | `00`, `02` §11/17, `03`, `04` — `MERGED` |
| §11 real repository restructuring when boundaries/ownership are wrong | `03` §§4-7 — `MIGRATED` |
| §12 cleanup/finishing at structural levels, with proof before deletion | `03` §§16-17, `04` §17 — `MIGRATED` |
| §13 forward migration/backfill/cutover/readback; no cosmetic rewrite of applied history | `03` §13, data focus §§2-3 — `MIGRATED` |
| §14 tests prove semantics; do not weaken tests to manufacture green | `03` §18, `04` — `MIGRATED` |
| §§15-16 documentation-only closure is failure; docs follow proven implementation | `00`, `03`, `04` — `MERGED` |
| §17 `diagnose_all-end-to-end`/plans are untrusted historical input requiring revalidation | `01` §§11-12 — `GENERALIZED` to all derived/historical records |
| §18 derive facts; ask only true decision; continue independent cone; re-diagnose after answer | `00` §11, `02` §14 — `MIGRATED` |
| §19 re-rank after each root; suspend descendant work when higher root appears | `03` §23 — `MIGRATED` |
| §20 direct execution on historical branch `b` with non-force/concurrent reconciliation | generic safety retained in `01` §16 and `03` §§20-22 — `GENERALIZED`; literal branch `b` mandate = `TASK_SPECIFIC_NOT_CANONICAL` |
| §21 reviewable logical mutation units / inspect intended vs generated/deleted/config/test files | `03` §§20-22 — `MIGRATED` |
| §22 verification must prove Product/Runtime, not compilation alone | `04` §§1-9 — `MIGRATED` |
| §23 Definition of Real Fix | `03` §3 — `MIGRATED` |
| §24 DONE is evidence-derived zero-known-material-open state, not numeric confidence | `04` §22 — `MIGRATED` |
| §25 use applicable tools/capabilities, not tools blindly | `01` §14 — `MIGRATED` |
| §26 final Diagnose→Root→Implement→Delete→Verify→Re-diagnose loop | `00` §6, `03` §23, `04` §§16-20 — `MERGED` |

## 7. Atomic audit — `01-diagnose-plan-package.md`

| Source atom/group | Current disposition |
|---|---|
| Header/inputs requiring diagnosis then mandatory package creation without product mutation | diagnosis semantics retained; mandatory package lifecycle = `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §1 authority/source classes; plans are derived/historical, not live truth | `01` §§1-2,12 — `MIGRATED` |
| §2 exact ref pin/re-resolve; capability preflight and no false tool claims | `00` §5, `01` §§14-16, `04` — `MIGRATED` |
| §3 CODE_BASED_LEAN / smallest complete root scope / proven risk expansion | `00` §§4,9, `01` §§4,6 — `GENERALIZED` |
| §4 seeded coverage is relevance assessment, not blind deep scan | `01` §§6,10, `02` §§4-5 — `GENERALIZED`; generator-specific mechanics superseded |
| §§5-7 comprehensive diagnosis, fail-closed claims, full-stack multi-surface trace | `02` §§2-10 — `MIGRATED` |
| §§8-9 structural cleanup, Source-of-Truth and reference-network reasoning | `02` §11, `03` §§5-17, code focus — `MIGRATED` |
| §10 adversarial diagnosis | `02` §7, `04` §20 — `MIGRATED` |
| §11 derivable fact vs true decision vs external evidence gap; batch high-value questions | `02` §14, `00` §11 — `MIGRATED` |
| §12 PostgreSQL/compatibility/security/WLT/mobile/control-panel/design risk lenses | data/code focus modules + `03`/`04` — `MIGRATED` |
| §13 concurrent-agent collision/reconciliation planning | `01` §15, `03` §§20-22 — `GENERALIZED` to live reconciliation rather than package fields |
| §§14-16 package create/resume/rebaseline/schema/generator/COVERAGE/unit machinery | `REJECTED_AS_DEFAULT_PLAN_MACHINERY`; useful current-truth rebaseline and JIT ordering retained in `01`/`02` |
| §17 verification plan + capability binding + proof limits | `01` §14, `04` §§1-8 — `MIGRATED` and hardened in Revision 4 |
| §18 package handoff mapping | package schema = rejected; underlying Finding→Root→Consumer→Evidence traceability = `02`/`04` `MIGRATED` |
| §19 readiness gate | generalized into Source-of-Fix/Canonical Target/closure requirements in `02` §§15-18 and `04` §22 |
| §20 delivery/latest-head/staging semantics | `00` §5, `01` §15-16, `03` §§20-22, `04` §18 — `MIGRATED` |
| §21 retention/Git history | `03` §8 and derived-support rules in `01` — `MIGRATED` |
| §22 evidence-based report/decision vocabulary | `04` §23 — `GENERALIZED` |

## 8. Atomic audit — `02-execute-verify-close.md`

| Source atom/group | Current disposition |
|---|---|
| §0 fail-closed default/open/no ignore-defer-patch-fake-green | `00`, `03`, `04` — `MERGED` |
| §1 EXECUTE_PACKAGE/EXECUTE_DIRECT/REVIEW_CANDIDATE modes | package mode = rejected; direct execution = `EXECUTE_END_TO_END`; immutable review = `DIAGNOSE` on exact commit/ref — `GENERALIZED` |
| §2 authority/source classes/package revalidation | `01` §§1-2,12 — `MIGRATED`; package-specific mechanics rejected |
| §3 exact target/task identity; package resume/collision | exact target pin = `00`/`01`; package identity mechanics = `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §4 capability preflight and pre-execution authority for protected/irreversible actions | `01` §§14,16 — `MIGRATED` |
| §5 claimed outcome→owner→consumers→contracts/data/runtime scope | `00` §§4,9, `01` §§4,6, `02` — `MIGRATED` |
| §§6-8 candidate lifecycle/AUTO/reachability/relation | candidate/reachability principles = `04` §§4-6; package-specific AUTO vocabulary = `SUPERSEDED` |
| §9 workspace/staging hygiene including broad-command prohibitions and hunk ownership | `03` §20 — `MIGRATED` in Revision 4 |
| §§10-12 concurrent isolation, atomic GitHub writes, push serialization | `01` §15, `03` §22, `04` §18 — `MIGRATED` |
| §13 findings ledger | `02` §9 — `MIGRATED` |
| §14 root-cause execution loop/no patch loop | `02` §§10-18, `03` §§2-3 — `MIGRATED`; explicit patch-loop breaker restored in Revision 4 |
| §15 CI/runtime failure classification/no blind rerun | `04` §10 — `MIGRATED` |
| §§16-18 full-stack/domain/runtime freshness gates | `02` §8, `03` §§13-19, focus modules, `04` §§7-9 — `MIGRATED` |
| §§19-20 affected-first verification and evidence invalidation | `04` §§1-13 — `MIGRATED` |
| §§21-22 package schema projection/bookkeeping | `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §23 cleanup/refactor/structural finishing | `03` §§16-17, `04` §17 — `MIGRATED` |
| §§24-30 latest-head integration, delivery, freeze, red-team, read-only final verify, evidence provenance, branch race | `03` §§20-23, `04` §§4-7,18-20 — `MIGRATED` |
| §31 independence provenance | `04` §14 — `MIGRATED` |
| §32 claim/diff/test-effectiveness review | `03` §18, `04` §§1-9,20 — `MIGRATED` |
| §33 mandatory Evidence Matrix | provenance/value retained as minimal material evidence record in `04` §6 — `SUPERSEDED` |
| §34 mandatory Approval Matrix | protected-action authority retained in `01` §16 — `SUPERSEDED` |
| §35 GitHub/CI/Repository-Platform truth | `04` §11 — `MIGRATED` in Revision 4 |
| §36 package-validator semantics | package machinery rejected; general rule “validator proves only what it checks” retained in `04` proof limits — `GENERALIZED` |
| §37 package retention | package-specific lifecycle rejected; Git-history/current-tree retention principle in `03` §8 — `GENERALIZED` |
| §§38-40 final closure/report/golden laws | `00` §§8,12-13 and `04` §§22-23 — `MERGED` |

## 9. Atomic audit — `03-end-to-end-fail-closed.md`

| Source atom/group | Current disposition |
|---|---|
| §0 OPEN/default positive proof/source truth/decisions/applicable tools | `00`, `01`, `02`, `04` — `MERGED` |
| §1 root cause before symptom; refactor/redesign/rebuild wrong architecture/data/ownership/state/boundary | `02`, `03` §§2-6 — `MIGRATED` |
| §2 zero tolerance for known in-scope defect/legacy/noise/debt/workaround | `03` §§16-17, `04` §§17,22 — `MIGRATED` |
| §3 scope by root/blast/consumers/dependencies/contracts/data/runtime | `00` §9, `01` §6 — `MIGRATED` |
| §§4-6 true E2E, no partial success, execute rather than report | `00` §6, `02` §8, `03`, `04` — `MIGRATED` |
| §§7-10 cleanup/finishing/all structural levels/delete obsolete/Git as history | `03` §§5-8,16-17 — `MIGRATED` |
| §§11-16 organization/naming/canonical source/reference network/discoverability/no new debt | `03` §§6-10,16-17, code focus — `MIGRATED` |
| §§17-19 real failure testing/adversarial diagnosis/repeat until exhausted | `02` §7, `04` §§9,19-20 — `MIGRATED` |
| §20 authority to modify/delete/move/merge/split/rename/restructure/redesign/rebuild with blast-radius proof | `03` §§4-6,16-17 — `MIGRATED` |
| §§21-23 final finishing/technical/latest-head gates | `04` §§17-20,22 — `MIGRATED` |
| §§24-26 evidence-derived DONE and final decision questions | `04` §§21-23 — `MERGED` |

## 10. Atomic audit — `04-journey-multisurface-operational-diagnosis.md`

| Source atom/group | Current disposition |
|---|---|
| §§0-3 operational/journey-first goal, diagnostic waves, proven scope, broad discovery before questions | `00` §§4,6, `01` §§4,6, `02` §§2-6 — `MIGRATED` |
| §4 Journey-by-Journey × Multi-Surface × Cross-Layer matrix | `02` §6 — `MIGRATED` |
| §5 Logical/Causal/Forward/Reverse/Temporal/Actor/Cross-layer/Cross-surface/Invariant/Counterfactual/Negative-space/Experimental/Adversarial angles | `02` §7 — `MIGRATED` |
| §6 UX states/discoverability/action/feedback/handoff/recovery clarity | `02` §§3,6-7 and code focus §9 — `MIGRATED` |
| §7 Findings Ledger and confidence discipline | Finding ledger = `02` §9; exact historical confidence enum consolidated into evidence/confidence/missing-proof semantics — `MERGED` |
| §8 actual vs intended behavior/source conflict/plans as derived support | `01` §§1-2,12 — `MIGRATED` |
| §§9-11 ask only at true Decision Boundary; batch questions; continue derivable diagnosis | `00` §11, `02` §14 — `MIGRATED` |
| §12 mandatory re-diagnosis after decisions | `00` §11, `02` §14, `04` §16 — `MIGRATED` |
| §13 journey ordering by operational dependency, not folders | `02` §§12-13,18 — `GENERALIZED` as dependency/root-driven ordering |
| §14 journey-understanding completeness questions | `02` §6/7 — `MERGED` into Journey Matrix + angles |
| §§15-16 mandatory package readiness/creation after knowledge closure | semantic readiness retained in `02` §§15-18 and `04`; mandatory package creation = `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §17 golden laws | `00`, `01`, `02` — `MERGED` |

## 11. Atomic audit — `05-universal-deep-diagnose-prepare-execute-reconstruct.md`

| Source atom/group | Current disposition |
|---|---|
| Header requiring V5 package/orchestrator.mjs as governing machinery | textual orchestrator retained; mandatory package/machine state = `REJECTED_AS_DEFAULT_PLAN_MACHINERY` / self-referential machinery rejected as applicable |
| §0 PREPARE_ONLY/EXECUTE_END_TO_END invocation and semantic TARGET | semantic target/objective generalized to `00`/`01`; PREPARE_ONLY default lifecycle = `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §1 unified semantic-first/root-first/live-treatment command | `00`-`04` + focus modules — `MERGED` |
| §2 authority/source hierarchy and derived historical records | `01` §§1-2,12 — `MIGRATED` |
| §3 capabilities/Git/safety/isolation/staging | capability/safety/staging = `01`/`03`; mandatory task-branch topology = `GENERALIZED` into explicit `EXECUTION_LOCATION` without weakening safety |
| §4 broad discovery from highest meaning | `02` §§2,5 — `MIGRATED` |
| §5 journey/multi-surface/failure paths | `02` §§6-8, `04` §9 — `MIGRATED` |
| §6 product/UI/shared/contracts/backend/data/integration/security/runtime/repository lenses | focus modules + `02`/`03`/`04` — `MIGRATED` |
| §7 findings→root graph→competitive deepening→frontier | `02` §§9-13,18 — `MIGRATED` |
| §8 decision closure | `02` §14 — `MIGRATED` |
| §9 Canonical Target / Reconstruction Blueprint | `02` §16 — `MIGRATED` in Revision 4 |
| §10 mandatory V5 package creation and machine-checkable package state | `REJECTED_AS_DEFAULT_PLAN_MACHINERY` |
| §11 root-by-root execution sequence | `03` §2 — `MIGRATED` |
| §12 preserve value; classify KEEP/HARDEN/.../DELETE; no clean-room rebuild | `03` §§4-5 — `MIGRATED` |
| §13 forbidden final patch/fallback/parallel/shadow/UI-only/financial/debug states; bounded compatibility | `00` §8, `03` §§9-14 — `MIGRATED` |
| §14 risk/layer verification | `04` §§1-13 and focus modules — `MIGRATED` |
| §15 cleanup/zero residue with replacement and reachability proof | `03` §§16-17, `04` §15 — `MIGRATED` |
| §16 exact candidate/foreign delta/final read-only closure | `01` §15, `03` §§20-23, `04` §§4-7,18-20 — `MIGRATED` |
| §17 closure equation | `04` §22 — `MERGED` |
| §18 PREPARED/BLOCKED/CLOSED stop states | decision/blocker/closed retained in `00` §12; PREPARED_NOT_CLOSED removed with mandatory plan lifecycle — `SUPERSEDED` |
| §19 evidence-based final report | `04` §23 — `MIGRATED` |
| §20 final compact loop | `00` §6 — `MERGED` |

## 12. Current 2026-08-17 hardening requirements

These are current human-directed requirements discovered during the final extraction audit rather than legacy source atoms. They are now canonicalized as follows:

| Current requirement | Canonical destination |
|---|---|
| `OBJECTIVE` as first-class invocation input | `00` §§3-4; `01` §4 |
| `PRIMARY_FOCUS=AUTO` / goal-driven relevant-lens routing | `00` §4; `01` §§4-5 |
| `RESEARCH=AUTO/INTERNAL_ONLY/EXTERNAL_ALLOWED` with primary-source preference | `00` §§3-4; `01` §13 |
| External research can resolve technical facts but cannot invent BThwani Product Truth | `01` §§1-2,13; governance focus §12 |
| Capability→Evidence→Acquisition→Proof Limit | `01` §14; `04` §6 |
| Canonical Target Model before major reconstruction | `02` §16 |
| Explicit patch-loop breaker | `02` §17 |
| Parallel truth as high-leverage root class | `02` §11 |
| Strict hunk-safe staging / broad-command protection | `03` §20 |
| Live Repository-Platform Truth verification when claim depends on it | `04` §11 |
| Minimal evidence provenance record, not mandatory heavy matrix | `04` §6 |
| New control-artifact creation gate | governance focus §10 |
| Engineering-governance/control-path value and before→after efficiency proof | governance/data focus + `03`/`04` |

## 13. Explicitly rejected historical machinery

The following were reviewed and are intentionally not missing:

- mandatory PREPARE/package generator/schema/frontier/ledger lifecycle as a prerequisite to ordinary execution;
- mandatory package files or planning artifacts for every task;
- orchestrator self-validator, self-guard, self-workflow, self-CLI, machine status or generated orchestration representation;
- rigid numeric topology such as “exactly one registry/router” when multiple distinct authority boundaries can be legitimate;
- heavy mandatory Evidence/Approval matrices for every task;
- permanent historical task-branch names, current HEADs, fixed tool versions or closed journey universes in the method;
- literal historical branch `b`/branch `A` mandates as universal laws.

Their material safety/traceability intent is retained where applicable through current authority, candidate, evidence, concurrency, scope and closure laws.

## 14. Extraction accounting

The reviewed source corpus is accounted for at material semantic-atom granularity in §§6-11. Every materially distinct atom identified in the six source files is either assigned to a canonical current owner or has an explicit generalized/superseded/rejected/task-specific disposition.

```text
UNACCOUNTED_MATERIAL_CONCEPTS = 0
UNACCOUNTED_MATERIAL_SOURCE_ATOMS = 0
KNOWN_REQUIRED_EXTERNAL_ORCHESTRATION_DEPENDENCIES = 0
KNOWN_ORCHESTRATOR_SELF_VALIDATION_AUTOMATION_REQUIRED = 0
```

This statement proves consolidation accounting for the textual command package only. It does not claim the target product/repository has no defects, and it does not by itself authorize deletion of retained legacy files.

Before any later deletion of the six retained legacy sources:

```text
resolve exact current target branch/ref
→ repository-wide reference/reachability scan
→ classify every consumer/reference
→ prove current orchestrator no longer depends on the source
→ require explicit human deletion authorization
→ remove safely
→ reverify affected repository references
```
