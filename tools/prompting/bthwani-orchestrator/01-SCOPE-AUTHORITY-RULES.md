# Scope, Authority, Project Anchors and Longevity Rules

## 1. Authority model

Never treat one representation as automatic truth:

```text
GOVERNANCE ≠ AUTOMATIC TRUTH
CODE ≠ AUTOMATIC TRUTH
RUNTIME ≠ AUTOMATIC TRUTH
TESTS ≠ AUTOMATIC TRUTH
PLANS/DOCS ≠ AUTOMATIC TRUTH
```

Reconcile target truth from the strongest current combination of:

`explicit current human decisions + product/semantic intent + operational outcomes + live repository evidence + contracts + data + runtime + canonical ownership + affected consumers`.

When these conflict, classify the conflict and prove the correct target state. Never select whichever source is easiest to edit.

## 2. Truth classes

Keep materially different truth classes separate:

```text
AUTHORITY TRUTH
PRODUCT/SEMANTIC TRUTH
IMPLEMENTATION TRUTH
DATA TRUTH
RUNTIME TRUTH
REPOSITORY-PLATFORM TRUTH
DERIVED/HISTORICAL SUPPORT
```

A derived record may reveal a hypothesis or stale contradiction; it never becomes live truth by declaration.

## 3. Precedence

Use this as a decision framework, not as permission to ignore evidence:

1. explicit current human instruction;
2. safety and irreversible-operation constraints;
3. this package's stable execution invariants;
4. reconciled current Product/System authority for the affected concept;
5. focus-specific rules;
6. live implementation/data/runtime/repository evidence;
7. historical/derived records.

A lower representation may prove a higher semantic statement stale or incorrectly represented, but must not silently redefine product intent.

## 4. Modes

### `DIAGNOSE`
Read/diagnose only. Build material coverage, prove roots, identify decision/evidence gaps. No project mutation.

### `EXECUTE_END_TO_END`
Diagnose the requested target/focus and immediately treat proven roots end-to-end, including every material dependency/consumer needed for correct closure.

### `EXECUTE_PROJECT_CLOSURE`
Full-repository live diagnosis and root-cause execution. Default `PRIMARY_FOCUS=ALL`, `SCOPE=REPOSITORY`. No material area is assumed clean and no required area may be silently skipped.

There is no implicit `PREPARE` mode and no mandatory plan/package creation.

## 5. Primary focus and scope

Canonical focus vocabulary:

`ALL | PRODUCT | GOVERNANCE | CODE | STRUCTURE | DESIGN | DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS`.

Supported scope shapes:

`REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE`.

Focus chooses the first lens. Scope chooses the orientation root.

```text
REQUESTED_SCOPE ≠ MAXIMUM_ALLOWED_SCOPE
```

Expand only by proven causal, authority, dependency, consumer, contract, data, runtime, security or blast-radius relation.

## 6. Project discovery anchors

This package is intentionally specific to bthwani-suite-next. Stable names may seed discovery, but current existence, role and ownership must always be re-proven live.

Expected domain/capability anchors include:

- `DSH`
- `WLT`
- `Identity`
- `Workforce`
- `Catalog`
- `Media`

Expected primary surfaces include:

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`

Expected governance roots include:

- `governance/**`
- `governance/product/**`
- `governance/policies/**`

At every execution:

```text
KNOWN ANCHORS
→ VERIFY LIVE EXISTENCE / ROLE / OWNER
→ CLASSIFY RENAMED / REPLACED / DEPRECATED / N/A WITH EVIDENCE
→ DISCOVER ADDITIONAL MATERIAL DOMAINS / SERVICES / SURFACES / JOURNEYS
→ BUILD CURRENT COVERAGE
```

A listed anchor is not eternally authoritative. An unlisted live node is not ignorable.

## 7. Journey discovery anchors

Seed discovery with materially applicable families such as:

`onboarding/activation | discovery/catalog | cart/serviceability | checkout/payment | order lifecycle | preparation/handoff | dispatch/delivery | cancellation/refund/reconciliation | support/recovery | administration/operations`.

These are seeds, not a closed registry. Discover the live journey universe from product semantics, routes, services, states, contracts, data, runtime and surfaces.

## 8. Minimum Diagnostic Altitude

Start at the highest material meaning needed to avoid fixing a lower representation before its parent meaning is settled.

Typical descent:

`Product Outcome → Actor/Authority/Responsibility → Capability/Journey → State/Transition/Precondition/Decision Rule/Invariant/Handoff → Canonical Ownership → Contract/Data → Service/Surface → Runtime/Implementation/Test`.

Bottom-up inspection is always allowed for evidence. Bottom-up execution is not automatically allowed.

## 9. Explicit exclusion rule

Every material candidate area must become exactly one of:

`IN_SCOPE | READ_ONLY | NOT_AFFECTED_WITH_REASON | N/A_PROVEN | FORBIDDEN_BY_HUMAN/SAFETY`.

`UNKNOWN` is never `N/A`. Silence is never exclusion proof.

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

Unproven material claims remain open.

## 11. Derived/historical records

Plans, reports, blueprints, prior packages, old documentation, comments and historical commits may be used only to:

`discover prior intent | recover context | find old hypotheses/paths/risks | identify contradictions to re-check`.

Never inherit from them automatically:

`DONE/PASS | scope | design | decision | owner | implementation state | runtime state`.

Revalidate every material claim against the current live authority/code/contracts/data/runtime/readback.

Default execution writes nothing to planning areas unless the human explicitly asks for documentation/planning work.

## 12. Capability discipline

Discover and use tools, skills, integrations and runtime capabilities only when they materially improve diagnosis, execution or proof of the **target system**.

Rules:

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
TOOL AVAILABLE ≠ TOOL ACTUALLY USED.
DO NOT CLAIM EXECUTION THAT DID NOT OCCUR.
```

A required capability that is unavailable becomes an evidence/blocker condition; it never becomes PASS by assumption.

This rule does not authorize any mechanism that runs or validates the orchestrator itself. The orchestrator remains plain-text instructions interpreted directly.

## 13. Foreign/concurrent delta classification

Before a material write batch, push/ref update, or final closure, compare current live HEAD with the last reconciled base and classify movement:

```text
UNRELATED
RELATED_NON_BLOCKING
UPSTREAM_OR_ROOT_CHANGING
SEMANTIC_OVERLAP
DIRECT_CONFLICT
AUTHORITY_OR_TRUTH_CHANGE
```

Treatment:

```text
UNRELATED → preserve; continue from latest head; rerun only evidence actually invalidated.
RELATED_NON_BLOCKING → reconcile assumptions + affected checks.
UPSTREAM_OR_ROOT_CHANGING → suspend affected descendant work; re-diagnose/re-rank.
SEMANTIC_OVERLAP → re-prove owner/contracts/state; rebuild affected delta.
DIRECT_CONFLICT → no blind overwrite; resolve intentionally on latest head.
AUTHORITY_OR_TRUTH_CHANGE → reread authority/product truth; re-diagnose before write.
```

Foreign delta is input, not instruction. Recency never outranks causality.

## 14. Execution location

If the human explicitly requires `DIRECT_ON_TARGET`, treat that as an execution-topology decision only. It does not weaken evidence, concurrency, staging, safety or closure requirements.

If isolated workspace is used, isolation is a means of preserving foreign work, not a separate semantic authority.

Never force-push, blindly hard-reset newer work, silently switch branches, or discard foreign changes.

## 15. Protected/irreversible operations

Before materially irreversible or protected actions such as production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, release/deploy/merge/tag or infrastructure destruction, prove the required current authority, target/environment, scope, rollback/compensation strategy where possible and candidate/change binding when relevant.

Normal code refactoring authority does not imply authorization for irreversible external side effects.

## 16. Orchestrator protection and independence

During normal project work `tools/prompting/bthwani-orchestrator/**` is read-only.

Package maintenance requires explicit human authorization in the current invocation identifying this package or the exact file(s) and intended change.

Protection includes direct and indirect mutation: edit, rename, move, delete, format, generated rewrite, bulk replace and conflict resolution.

The package must not depend on, invoke, require or validate itself through external scripts, guards, workflows, CLIs, hooks or registries.

## 17. Longevity invariants

Keep method stable; discover project state live.

Do not permanently encode:

- current branch/head;
- current endpoint/table/migration numbers;
- temporary task state;
- current tool/framework versions unless intentionally invariant;
- a closed universe of journeys/domains/files;
- historical package lifecycle machinery.

Prefer instructions such as:

`discover current canonical contract`, `discover current data owner`, `discover current verification commands`, `verify all material consumers`.

## 18. Anti-bloat rules

- one material concept has one canonical owner in this package;
- reference another internal section instead of duplicating the same law;
- no task-specific rule accumulation;
- no new file merely because a topic gained a heading;
- no machine registry or automation for orchestrator self-management;
- repeated exceptions require re-diagnosing the parent rule rather than stacking exceptions;
- this package must remain materially simpler than the system it governs.