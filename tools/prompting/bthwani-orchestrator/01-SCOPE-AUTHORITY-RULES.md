# Scope, Authority, Project Anchors and Longevity Rules

## 1. Authority model

Never treat any single representation as automatic truth:

```text
GOVERNANCE ≠ AUTOMATIC TRUTH
CODE ≠ AUTOMATIC TRUTH
RUNTIME ≠ AUTOMATIC TRUTH
PLANS ≠ AUTOMATIC TRUTH
TESTS ≠ AUTOMATIC TRUTH
```

Reconcile the target truth from the strongest current combination of:

`explicit current human decisions + product/semantic intent + operational outcomes + live repository evidence + contracts + data + runtime + canonical ownership + affected consumers`.

When these conflict, classify the conflict and prove the correct target state. Do not select whichever source is easiest to edit.

## 2. Precedence

Use this precedence only as a decision framework, not as permission to ignore evidence:

1. explicit current human instruction;
2. safety / irreversible-operation constraints;
3. this orchestrator's stable execution invariants;
4. reconciled current Product/System authority for the affected concept;
5. focus-specific rules;
6. live implementation/runtime evidence;
7. historical/derived records.

A lower source may disprove that a higher semantic claim is stale or incorrectly represented, but must not silently redefine product intent.

## 3. Modes

### `DIAGNOSE`
Read/diagnose only. Build material coverage, prove roots, decisions and evidence. No project mutation.

### `EXECUTE_END_TO_END`
Diagnose the requested target/focus and immediately treat proven roots end-to-end, including all material dependencies/consumers needed for correct closure.

### `EXECUTE_PROJECT_CLOSURE`
Full repository live diagnosis and root-cause execution. Defaults to `PRIMARY_FOCUS=ALL`, `SCOPE=REPOSITORY`. No material area is assumed clean; no required area may be silently skipped.

There is no implicit `PREPARE` mode and no default plan/package creation.

## 4. Primary focus

Canonical focus vocabulary:

`ALL | PRODUCT | GOVERNANCE | CODE | STRUCTURE | DESIGN | DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS`

Multiple focuses may be combined.

Focus selects where attention starts. It does not forbid following a proven root into another focus.

## 5. Requested scope

Supported scope shapes:

`REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH`

`REQUESTED_SCOPE ≠ MAXIMUM_ALLOWED_SCOPE`.

Expand only by proven causal/ownership/dependency/consumer/blast-radius relation. Do not use root-cause expansion as an excuse for unrelated repository churn.

## 6. Project discovery anchors

This package is project-specific. The following are expected discovery anchors, not a permanently closed universe.

Known domain/capability anchors include:

- `DSH` — domain/service family.
- `WLT` — domain/service family.
- `Identity` — core capability.
- `Workforce` — core capability.
- `Catalog` — domain capability.
- `Media` — shared/domain capability.

Expected primary surfaces include:

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`

Known governance roots include:

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

Do not assume a listed anchor remains authoritative because it is listed here. Do not ignore a new material node because it is not listed here.

## 7. Journey discovery

Known journey families may seed discovery: onboarding/activation, discovery/catalog, cart/serviceability, checkout/payment, order lifecycle, preparation/handoff, dispatch/delivery, cancellation/refund/reconciliation, support/recovery and administration/operations.

These are seeds, not a complete registry. Discover the current journey universe from live product semantics, routes, services, contracts, states, data, tests and surface behavior.

## 8. Minimum Diagnostic Altitude

Start at the highest material meaning needed to avoid fixing a lower representation before its parent meaning is settled.

Typical order:

`Product Outcome → Actor/Authority/Responsibility → Capability/Journey → State/Transition/Invariant/Handoff → Canonical Ownership → Contract/Data → Service/Surface → Runtime/Implementation/Test`.

Bottom-up inspection is always allowed for evidence. Bottom-up execution is not automatically allowed.

## 9. Explicit exclusion rule

Every material candidate area is either:

`IN_SCOPE | READ_ONLY | NOT_AFFECTED_WITH_REASON | N/A_PROVEN | FORBIDDEN_BY_HUMAN/SAFETY`

Silent exclusion is forbidden.

`N/A` requires a reason and current evidence sufficient to show non-impact. `UNKNOWN` is not `N/A`.

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
```

Unproven material claims remain open.

## 11. Documentation and plans

`plans/**`, `docs/**`, reports, blueprints, prior packages and historical command files can provide evidence/history/context only.

They never constitute the implementation fix and never make a runtime/product claim true by declaration.

Default execution writes nothing to `plans/**`.

## 12. Orchestrator protection

The package is read-only during normal execution.

Explicit permission to modify it must:

- identify `tools/prompting/bthwani-orchestrator/**` or the exact file(s);
- be given by the human in the current invocation;
- describe the intended package change sufficiently to distinguish it from ordinary repository work.

Authorization expires with the invocation. It does not carry to later tasks.

Protection covers direct and indirect changes, including rename/move/delete, formatting, bulk cleanup, global replace, generated rewrite and conflict resolution.

## 13. Longevity invariants

Keep the method stable and discover project state live.

Do not permanently encode:

- current branch/head;
- current endpoint/table/migration numbers;
- current tool/framework versions unless intentionally invariant;
- a closed universe of current journeys/domains/files;
- temporary task state;
- historical package lifecycle machinery.

Prefer:

`discover current canonical contract`, `discover current data owner`, `discover current verification commands`, `verify all material consumers`.

## 14. Anti-bloat rules

- one material concept has one canonical owner in this package;
- reference another section instead of restating the same law;
- no task-specific rule accumulation;
- no new file merely because a topic has a new heading;
- no machine registry unless it prevents a demonstrated failure mode better than a clear rule;
- repeated exceptions require re-diagnosing the parent rule rather than stacking more exceptions.

The package must remain simpler than the system it governs.