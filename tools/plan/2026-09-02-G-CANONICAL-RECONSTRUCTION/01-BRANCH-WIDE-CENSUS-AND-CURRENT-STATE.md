# 01 — BRANCH-WIDE CENSUS, AUTHORITY REGISTRY, DISPOSITION LEDGER, AND CAPABILITY COVERAGE

## Purpose

Build the complete evidence-backed inventory of branch `g` before any structural root selection or semantic mutation. The census classifies ownership, semantic authority, boundary responsibility, reachability, survival disposition, and end-to-end capability coverage across the actual tracked tree.

## Exact live pin

`FETCH g → RESOLVE EXACT REMOTE G SHA → PIN SHA → LOAD LIVE PLAN + APPLICABLE ORCHESTRATOR INVARIANTS → INVALIDATE STALE SHA-SPECIFIC EVIDENCE`.

## 1. Full tracked-tree census

Traverse the actual tracked tree. No hardcoded directory list may act as a scope boundary.

Cover all material source/runtime code, apps/surfaces, screens/routes/components, frontend data/query/mutation/store/view-model layers, domains/services/backend handlers/use-cases, `core/**`, `shared/**`, packages/modules, database/schema/migrations, APIs/events/contracts/generated bindings, runtime/config/env, `infra/**`, `tools/**`, scripts/CLI, `.github/**`, tests/fixtures/mocks/snapshots, dependencies/plugins, assets/manifests, and live authoritative documents.

Any uncensused tracked area blocks the baseline unless explicitly proven non-material and recorded as such.

## 2. Fast garbage elimination during census — explicit exception

The census is read-only for structural/semantic work, but it may delete proven low-risk garbage immediately.

An artifact is eligible for `DELETE_NOW` when all are proven:

```text
NOT_REQUIRED_BY_CURRENT_PRODUCT_SYSTEM
NO_CANONICAL_AUTHORITY
NO_MUTABLE_STATE
NO_REQUIRED_RUNTIME_ROUTE
NO_REQUIRED_EXTERNAL_CONTRACT
NO_REQUIRED_IMPORT_CALLER_READER_CONSUMER
NO_REQUIRED_MIGRATION_OR_UPGRADE_ROLE
NO_SECURITY_OR_COMPLIANCE_ROLE
NO_GENERATED_LINEAGE_REQUIREMENT
```

This applies to a line/symbol/file/directory/package/script/workflow/dependency/test/fixture/mock/snapshot/wrapper/screen/route/binding/API artifact.

Before deleting backend/API/data artifacts, search all possible required consumers: every app/surface, control panel, mobile client, runtime route/call, integration, event/webhook, script/tool, supported operation, and external consumer.

Execute:

`QUICK ALL-CONSUMER / REFERENCE / REACHABILITY CHECK → DELETE_NOW → SEARCH AGAIN → AFFECTED VERIFY`.

Do not wait for Root Graph synthesis and do not create a separate cleanup root for proven low-risk garbage.

When several nearby garbage artifacts are proven together, batch them into one coherent fast-cleanup checkpoint. After that batch:

`COMMIT/PUSH g → VERIFY REMOTE SHA → RE-PIN → REFRESH AFFECTED CENSUS`.

If candidate deletion exposes or changes semantic authority, end-to-end parity, ownership, contract, data, runtime, or required consumer behavior, it is **not** low-risk garbage; stop and defer it to canonical root execution.

## 3. Artifact Disposition Ledger — mandatory

Every in-scope material artifact receives exactly one current disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | DELETE_NOW | BOUNDED_RETIREMENT`.

Coverage includes as applicable:

`directory | package | module | file | material symbol | screen | route | component | frontend consumer | API | event | contract | schema object | generated binding/boundary | runtime/config entry | script | workflow | dependency | test | fixture | mock | snapshot | authoritative document`.

Required ledger fields:

```text
ARTIFACT=
TYPE=
CURRENT_PATH=
CURRENT_RESPONSIBILITY=
CURRENT_OWNER=
CURRENT_WRITER_OR_DERIVED_STATUS=
CURRENT_CONSUMERS=
RUNTIME_OR_BUILD_REACHABILITY=
PRODUCT_CAPABILITY_JOURNEY=
SEMANTIC_MEANING_OWNED=
DUPLICATE_PARALLEL_SHADOW_RELATIONSHIP=
NAME_PATH_BOUNDARY_VERDICT=
RIGHT_TO_EXIST_PROOF=
TARGET_OWNER=
TARGET_NAME_PATH_BOUNDARY=
DISPOSITION=
MIGRATION_CUTOVER_DEPENDENCIES=
DELETION_RISK_CLASS=LOW|STATEFUL|CONTRACTUAL|RUNTIME|SECURITY|MIGRATION
DELETION_SAFETY_REQUIREMENTS=
```

Before structural root mutation:

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNKNOWN_KEEP=0
```

## 4. Semantic Authority Registry — mandatory

Inventory material meanings independently of filenames and implementations:

`permission | eligibility | serviceability | financial truth | state/status interpretation | transition | allowed action | validation | default | mapping | vocabulary | error-to-state semantics | location | pricing/fees | runtime/config meaning | retry/idempotency | contract semantics`.

For every meaning record:

```text
SEMANTIC_MEANING=
CURRENT_AUTHORITIES=
CURRENT_MUTABLE_WRITERS=
CURRENT_READERS_CONSUMERS=
FRONTEND_LOCAL_INTERPRETATIONS=
BACKEND_LOCAL_INTERPRETATIONS=
CANONICAL_OWNER_CANDIDATE=
CANONICAL_WRITER_CANDIDATE=
DUPLICATE_PARALLEL_SHADOW_STATE=
WINNING_AUTHORITY=
LOSING_AUTHORITIES=
```

Any meaning with multiple mutable writers or authorities remains unresolved until winner/loser treatment is defined.

## 5. Capability / journey coverage census — mandatory

Inventory every material capability/journey represented anywhere in `g`, including backend-only, frontend-only, data-only, contract-only, and partially connected implementations.

For each candidate identify enough evidence to feed `02A`:

```text
CAPABILITY
ACTOR
JOURNEY
STATES_TRANSITIONS
DOMAIN_OWNER
DB_STORAGE_TRUTH
BACKEND_SERVICE_USE_CASE
API_EVENT_COMMAND
CONTRACT
GENERATED_BINDING
FRONTEND_CONSUMER
COMPONENTS
SCREENS_ROUTES
USER_ACTIONS
MUTATION
PERSISTED_READBACK
VISIBLE_FINAL_STATE
```

Explicitly find:

```text
SCREEN_WITHOUT_BACKEND_CAPABILITY
BACKEND_CAPABILITY_WITHOUT_REQUIRED_UI_CONSUMER
API_WITHOUT_REQUIRED_CONSUMER
CONTRACT_WITHOUT_IMPLEMENTATION_OR_CONSUMER
GENERATED_BINDING_WITHOUT_REQUIRED_CONSUMER
DB_TRUTH_WITHOUT_REQUIRED_OWNER_CONSUMER
MOCK_OR_HARDCODED_UI_PRETENDING_TO_BE_BUSINESS_TRUTH
MANUAL_FRONTEND_DTO_ENUM_STATUS_MAP
MANUAL_BACKEND_CONTRACT_MIRROR
```

Do not decide that backend and frontend are consistent merely because each compiles independently.

Before `03`, `02A` must classify every material capability and parity break.

## 6. Directory / Package Responsibility Census — mandatory

Every material directory/package boundary must answer:

```text
ONE_UNIQUE_COHESIVE_RESPONSIBILITY?
OWNER_IMPLIED_BY_PATH_CORRECT?
DUPLICATED_ELSEWHERE?
MIXING_UNRELATED_RESPONSIBILITIES?
PASS_THROUGH_ONLY?
HISTORICAL_COMPATIBILITY_ONLY?
NAME_TRUTHFUL?
```

Verdicts:

```text
UNIQUE_CORRECT_RESPONSIBILITY → KEEP/HARDEN
NO_UNIQUE_RESPONSIBILITY → DELETE_AFTER_MIGRATION OR DELETE_NOW IF UNUSED/DEAD
DUPLICATE_RESPONSIBILITY → SELECT_WINNER → MIGRATE → DELETE_LOSER
MIXED_RESPONSIBILITIES → SPLIT_BY_TRUE_OWNER
WRONG_OWNER → REHOME
PASS_THROUGH_ONLY → DELETE_NOW IF UNCONSUMED; OTHERWISE REMOVE AFTER MIGRATION
HISTORICAL_COMPAT_ONLY → REMOVE AFTER BOUNDED CUTOVER
MISLEADING_NAME_PATH → RENAME/REHOME
```

Before structural root mutation:

`UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0`.

## 7. Heightened `core/**` and `shared/**` review

Every material artifact under `core/**` or `shared/**` must prove why it is genuinely cross-cutting and why a precise domain cannot own it. If not: `REHOME | SPLIT | MERGE | DELETE`.

Unused/unconsumed artifacts in these trees are not protected by the folder name; if low-risk, `DELETE_NOW`.

## 8. First-class support surfaces

`infra/**`, `tools/**`, `.github/**`, scripts, workflows, runtime/config, tests, fixtures, mocks, and dependencies are not exempt. Establish:

`CURRENT PURPOSE | CANONICAL OWNER | WRITER/DERIVED STATUS | INVOCATIONS/CONSUMERS | REACHABILITY | DUPLICATION | TARGET DISPOSITION`.

For `.github/workflows/**`, specifically census:
- Which workflows support on-demand `workflow_dispatch` on `g` (e.g. `ci-check.yml`, `final-closure.yml`).
- Accepted dispatch inputs (`expected_head_sha`, `expected_base_sha`, `verify_from_sha`, `full_scope`, `pr_number`).
- Which workflows are required on-demand for remote-owned analysis (SonarQube Cloud, CodeQL, remote security).

Unused/unconsumed support artifacts with no required role are `DELETE_NOW` candidates. Do not delete workflow dispatch mechanisms needed for on-demand verification.

## 9. Symbol/line-level discovery

Within files that own or duplicate material semantics, descend to symbols/branches/lines sufficiently to expose:

`dead symbol | unused export | duplicate validation/default/mapping | shadow local policy | obsolete branch | stale flag | unnecessary wrapper | misleading symbol | unjustified suppression | stale TODO/FIXME/HACK`.

Any dead/unconsumed symbol with no required semantic role is deleted immediately through the fast lane.

## Baseline output

The census must produce complete inputs for `CURRENT g`, the Artifact Disposition Ledger, Semantic Authority Registry, Directory/Package Verdicts, candidate winning/losing authority map, and complete capability/journey inventory consumed by `02` and `02A`.
