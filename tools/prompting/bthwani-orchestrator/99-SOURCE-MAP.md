# Internal Semantic Ownership Map

STATUS: INTERNAL_ACCOUNTING_ONLY
RUNTIME_AUTHORITY: NO
EXTERNAL_SOURCE_DEPENDENCY: NONE
LEGACY_FILENAME_NOTE: this file keeps its repository filename for continuity, but its content is no longer a source-origin map.

## 1. Purpose

This file records **where each material orchestration concept is owned inside this package** so the command set stays self-contained, cohesive and non-duplicative.

It is not required to execute the orchestrator and it does not validate the orchestrator. No external prompt, command, script, guard, workflow, validator, CLI, plan package, registry or historical file is required to interpret any rule listed here.

## 2. Independence statement

The package is intentionally independent:

```text
EXTERNAL PROMPT REQUIRED = NO
EXTERNAL COMMAND FILE REQUIRED = NO
PLAN/PACKAGE REQUIRED = NO
SELF-VALIDATION SCRIPT REQUIRED = NO
SELF-GUARD REQUIRED = NO
SELF-WORKFLOW REQUIRED = NO
SELF-VALIDATOR/CLI REQUIRED = NO
MACHINE STATUS REGISTRY REQUIRED = NO
```

Project tests, CI, runtime commands, scanners and other project tools may still be used as evidence for the target system when materially relevant. They never become this package's execution engine or self-certification mechanism.

## 3. Canonical semantic ownership

| Material concept | Canonical owner inside package |
|---|---|
| Governing law; live lifecycle; self-contained boundary; valid stop states | `00-ORCHESTRATOR.md` |
| Truth classes; authority; scope; project anchors; exclusions; capability discipline; foreign delta; irreversible-operation authority | `01-SCOPE-AUTHORITY-RULES.md` |
| Broad discovery; coverage; Journey Matrix; diagnostic angles; Findings Ledger; decision taxonomy; root proof/ranking; Source-of-Fix readiness | `02-DIAGNOSE-ROOT-CAUSE.md` |
| Root treatment; reconstruction; migration; cutover; naming/placement; Git history; cleanup; test integrity; runtime freshness; mutation/concurrency discipline | `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` |
| Candidate lifecycle; evidence binding/invalidation; failure classification; read-only final verification; zero-reference/reachability; adversarial closure | `04-VERIFY-REDIAGNOSE-CLOSE.md` |
| Architecture/code/shared-frontend/structure/UI/UX/mobile/control-panel implementation | `focus/code-architecture-organization.md` |
| Product meaning; governance reconciliation; product design; semantic drift | `focus/governance-product-design.md` |
| Data/migrations/contracts/events/runtime/security/finance/compatibility/quality | `focus/data-contracts-runtime-security-quality.md` |

## 4. Consolidated invariant inventory

The package itself now owns the following material invariants directly:

### Semantic-first diagnosis

`Product Outcome → Actor/Authority/Responsibility → Journey/State/Handoff → Canonical Owner → Contract/Data → Runtime/Implementation` before lower findings receive execution authority.

### Bottom-up evidence

Any technical layer may be inspected to prove/disprove hypotheses, but technical discovery alone does not determine priority.

### Highest proven systemic root first

Prioritize upstream causal leverage, blocking power, canonical authority, blast radius, risk and unlock value rather than discovery order, file count or first failing check.

### Journey × multi-surface × cross-layer diagnosis

Use forward, reverse, temporal, responsibility, invariant, counterfactual, negative-space, cross-layer, cross-surface, experimental and adversarial reasoning as materially applicable.

### Fail-closed uncertainty

`unknown`, `uninspected`, `unverified`, `contradicted` and `decision-required` material claims remain open.

### Source-of-Fix requirement

A root that requires source/runtime/data/contract mutation cannot close through reports or documentation.

### Preserve proven value

Reconstruction may move, merge, split, refactor, regenerate, rewrite, replace or delete, but must preserve correct product/design/data value when the defect is ownership/context rather than the value itself.

### Canonical cutover

Migrate writers/readers/consumers/data, prove readback, then eliminate unjustified parallel authority and reachable legacy paths.

### No patch final state

No symptom-only patch, hidden fallback, bypass, shadow state machine, dual truth, half migration or indefinite compatibility layer may represent final closure.

### Forward-only migration discipline

Correct persistence through forward migration/backfill/cutover and do not rewrite applied history merely for cosmetic cleanliness.

### Failure/recovery semantics

Where material, prove invalid/denied/stale/duplicate/replay/race/timeout/unknown-result/restart/compensation/reconciliation paths, not only happy path.

### Runtime freshness

Runtime proof must be attributable to the candidate/config/schema/environment actually claimed.

### Exact-candidate evidence

Material writes invalidate affected prior evidence; final closure proof binds to the exact candidate/live state being claimed.

### Foreign delta preservation

Latest HEAD is integration truth, not priority authority. Preserve unrelated work, classify related movement and never force stale truth over newer work.

### Cleanup/finishing

Dead/stale/duplicate/misplaced/unnecessary residue directly tied to the root/cutover remains part of treatment until proven removed or justified.

### Git as historical archive

Do not preserve obsolete active-tree copies merely as backups when no runtime/legal/migration requirement exists.

### Decision discipline

Derive facts from evidence; ask only true non-derivable semantic/product/business/architectural decisions, then re-diagnose the affected cone.

### Closure by evidence, not confidence wording

No percentage phrase creates closure. Closure means all materially required known items in proven scope have a justified disposition and current evidence on the correct candidate/runtime.

## 5. Anti-duplication rule

If the same law appears in multiple files, one file must remain the semantic owner and other files should only apply/reference it briefly.

Do not add new files merely to restate existing concepts. Do not create a machine-readable mirror of the textual rules unless a future human explicitly changes the package architecture.

## 6. Self-validation prohibition

No future package maintenance should add a tool whose purpose is:

- checking whether these Markdown instructions are valid;
- generating their state;
- deciding whether the orchestrator is PASS/READY/CLOSED;
- enforcing them through a workflow/guard/hook/CLI;
- converting them into a parallel machine authority.

The package is maintained through deliberate human/agent review of the text under explicit authorization. Its effectiveness is judged by the correctness of target-system diagnosis/execution/evidence, not by a self-referential green check.

## 7. Accounting statement

All material command semantics intentionally retained by this revision have an internal canonical owner listed above.

`KNOWN_REQUIRED_EXTERNAL_ORCHESTRATION_DEPENDENCIES = 0`

`KNOWN_ORCHESTRATOR_SELF_VALIDATION_AUTOMATION = 0`

This accounting statement is limited to this command package. It is not a claim that the target repository/product itself has no defects.