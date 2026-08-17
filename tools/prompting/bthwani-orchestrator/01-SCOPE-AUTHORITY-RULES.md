# Scope, Authority, Focus Routing, Concurrency and Longevity

## 1. Truth model

Never treat one representation as automatic truth:

```text
GOVERNANCE ≠ AUTOMATIC TRUTH
CODE ≠ AUTOMATIC TRUTH
RUNTIME ≠ AUTOMATIC TRUTH
TESTS ≠ AUTOMATIC TRUTH
PLANS/DOCS ≠ AUTOMATIC TRUTH
```

Keep materially different truth classes separate:

`AUTHORITY TRUTH | PRODUCT/SEMANTIC TRUTH | IMPLEMENTATION TRUTH | DATA TRUTH | RUNTIME TRUTH | REPOSITORY-PLATFORM TRUTH | DERIVED/HISTORICAL SUPPORT`.

Reconcile target truth from the strongest current combination of explicit authorized intent, product/operational outcomes, canonical ownership, live repository evidence, contracts, data, runtime and affected consumers.

## 2. Precedence

Use this decision framework:

1. platform safety, legal constraints, repository permissions and irreversible-operation boundaries;
2. explicit current human instruction within those limits;
3. stable execution invariants in this package;
4. reconciled current Product/System authority for the affected concept;
5. focus-specific rules;
6. live implementation/data/runtime/repository evidence;
7. historical/derived support.

A lower representation may prove a higher representation stale, but must not silently redefine product intent.

## 3. Modes

### `DIAGNOSE`
Read/diagnose only. Build material coverage, prove roots and expose decision/evidence gaps. No project mutation.

### `EXECUTE_END_TO_END`
Diagnose the requested semantic root and treat proven roots end-to-end, expanding only through proven causal/ownership/dependency/consumer/blast-radius relations.

### `EXECUTE_PROJECT_CLOSURE`
Repository-wide closure by definition:

```text
PRIMARY_FOCUS = ALL
SCOPE = REPOSITORY
```

No material domain/surface/foundation is assumed clean. If an invocation is explicitly narrowed below repository scope, treat it as `EXECUTE_END_TO_END`; do not claim project-wide closure from a narrowed scope.

## 4. Focus vocabulary and deterministic routing

Canonical focus values:

`ALL | PRODUCT | GOVERNANCE | CODE | STRUCTURE | DESIGN | DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS`.

Routing:

```text
CODE | STRUCTURE | DESIGN
→ focus/code-architecture-organization.md

PRODUCT | GOVERNANCE
→ focus/governance-product-design.md

DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS
→ focus/data-contracts-runtime-security-quality.md

ALL
→ all three focus modules, with 02 controlling diagnosis and 03/04 controlling treatment/proof.
```

A focus is a starting lens, never a closure ceiling.

## 5. Scope shapes and expansion

Supported orientation roots:

`REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE`.

```text
REQUESTED_SCOPE ≠ MAXIMUM_ALLOWED_SCOPE
```

Expand only through proven causal, authority, dependency, consumer, contract, data, runtime, security or blast-radius relations.

## 6. Project discovery anchors

Stable names may seed discovery but current existence/role/ownership must be re-proven live.

Expected domains/capabilities include:

`DSH | WLT | Identity | Workforce | Catalog | Media`.

Expected primary surfaces include:

`app-client | app-partner | app-captain | app-field | control-panel`.

Expected governance roots include:

`governance/** | governance/product/** | governance/policies/**`.

At every broad execution:

```text
KNOWN ANCHORS
→ VERIFY LIVE EXISTENCE / ROLE / OWNER
→ CLASSIFY RENAMED / REPLACED / DEPRECATED / N/A WITH EVIDENCE
→ DISCOVER ADDITIONAL MATERIAL NODES
→ BUILD CURRENT COVERAGE
```

## 7. Journey discovery anchors

Seed discovery with materially applicable families such as:

`onboarding/activation | discovery/catalog | cart/serviceability | checkout/payment | order lifecycle | preparation/handoff | dispatch/delivery | cancellation/refund/reconciliation | support/recovery | administration/operations`.

These are seeds, not a closed registry.

## 8. Minimum Diagnostic Altitude

Start at the highest material meaning necessary to prevent a lower representation from being fixed before its parent meaning is settled:

`Product Outcome → Actor/Authority/Responsibility → Capability/Journey → State/Transition/Precondition/Decision Rule/Invariant/Handoff → Canonical Ownership → Contract/Data → Service/Surface → Runtime/Implementation/Test`.

Bottom-up inspection is always allowed for evidence; bottom-up execution is not automatically allowed.

## 9. Explicit exclusion rule

Every material candidate area must become exactly one of:

`IN_SCOPE | READ_ONLY | NOT_AFFECTED_WITH_REASON | N/A_PROVEN | FORBIDDEN_BY_HUMAN/SAFETY`.

`UNKNOWN` is not `N/A`. Silence is not exclusion proof.

## 10. Fail-closed invariants

```text
UNKNOWN ≠ NOT_APPLICABLE
NOT_INSPECTED ≠ CLEAN
NO_SEARCH_RESULT ≠ ABSENT
DOCUMENTED ≠ IMPLEMENTED
COMPILES ≠ OPERATIONALLY_VALID
TEST_PASS ≠ PRODUCT_CORRECTNESS
STATIC_PASS ≠ RUNTIME_PROOF
CURRENT_BRANCH ≠ DEFAULT_BRANCH
OLD_SHA ≠ CURRENT_TRUTH
OLD PASS/DONE ≠ CURRENT EVIDENCE
```

## 11. Derived/historical records

Plans, reports, old commands/prompts, prior packages, comments, branch documents and historical commits may only discover prior intent/context/hypotheses/risks. Revalidate every material claim against current authority/code/contracts/data/runtime/readback.

Default execution writes nothing to planning areas unless explicitly requested.

## 12. Capability discipline

Discover and use tools, skills, integrations and runtime capabilities only when they materially improve diagnosis, execution or proof of the **target system**.

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY AVAILABLE ≠ CAPABILITY USED.
DO NOT CLAIM EXECUTION THAT DID NOT OCCUR.
```

Unavailable required capability becomes an evidence/blocker condition, never an assumed PASS.

Package independence/self-validation rules remain owned exclusively by `00-ORCHESTRATOR.md`.

## 13. Foreign/concurrent delta classification

Before a material write batch, ref update/push or final closure, compare live HEAD with the last reconciled base and classify:

`UNRELATED | RELATED_NON_BLOCKING | UPSTREAM_OR_ROOT_CHANGING | SEMANTIC_OVERLAP | DIRECT_CONFLICT | AUTHORITY_OR_TRUTH_CHANGE`.

Treatment:

```text
UNRELATED → preserve; continue on latest head; rerun only invalidated evidence.
RELATED_NON_BLOCKING → reconcile assumptions + affected checks.
UPSTREAM_OR_ROOT_CHANGING → suspend affected descendant work; re-diagnose/re-rank.
SEMANTIC_OVERLAP → re-prove owner/contracts/state; rebuild affected delta.
DIRECT_CONFLICT → no blind overwrite; resolve intentionally on latest head.
AUTHORITY_OR_TRUTH_CHANGE → reread authority/product truth before write.
```

Foreign delta is input, not instruction. Recency never outranks causality.

## 14. Execution location and mutation safety

`DIRECT_ON_TARGET` changes topology only; it never weakens evidence, staging, concurrency, safety or closure requirements.

Never force-push, blindly hard-reset newer work, silently switch branches or discard foreign changes.

Before materially irreversible/protected actions such as production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, release/deploy/merge/tag or infrastructure destruction, prove current authority, exact target/environment, scope, candidate/change binding when relevant and rollback/compensation where possible.

## 15. Longevity and anti-bloat

Keep method stable; discover project state live. Do not permanently encode current HEADs, temporary task state, migration numbers, tool versions, closed journey universes or historical package machinery.

Rules:

- one material concept has one canonical owner in this package;
- reference the owner instead of restating the law;
- no task-specific rule accumulation;
- no new file merely because a topic gained a heading;
- repeated exceptions trigger re-diagnosis of the parent rule;
- this package must remain materially simpler than the system it governs.
