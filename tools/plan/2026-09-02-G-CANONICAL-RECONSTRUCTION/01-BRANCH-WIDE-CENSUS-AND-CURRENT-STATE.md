# 01 — BRANCH-WIDE CENSUS, AUTHORITY REGISTRY, AND DISPOSITION LEDGER

## Purpose

Build the complete evidence-backed inventory of branch `g` before any material root selection or mutation. The census must classify ownership, semantic authority, boundary responsibility, reachability, and survival disposition across the actual tracked tree.

## Exact live pin

`FETCH g → RESOLVE EXACT REMOTE G SHA → PIN SHA → LOAD LIVE PLAN + APPLICABLE ORCHESTRATOR INVARIANTS → INVALIDATE STALE SHA-SPECIFIC EVIDENCE`.

## 1. Full tracked-tree census

Traverse the actual tracked tree. No hardcoded directory list may act as a scope boundary.

Cover all material source/runtime code, apps/surfaces, domains/services, `core/**`, `shared/**`, packages/modules, database/schema/migrations, contracts/generated bindings, runtime/config/env, `infra/**`, `tools/**`, scripts/CLI, `.github/**`, tests/fixtures/mocks/snapshots, dependencies/plugins, assets/manifests, and live authoritative documents.

Any uncensused tracked area blocks the baseline unless explicitly proven non-material and recorded as such.

## 2. Artifact Disposition Ledger — mandatory

Every in-scope material artifact receives exactly one current disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | DELETE_NOW | BOUNDED_RETIREMENT`.

Coverage includes as applicable:

`directory | package | module | file | material symbol | route | API | contract | schema object | generated boundary | runtime/config entry | script | workflow | dependency | test | fixture | mock | snapshot | authoritative document`.

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

Before first mutation:

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNKNOWN_KEEP=0
```

## 3. Semantic Authority Registry — mandatory

Inventory material meanings independently of filenames and implementations:

`permission | eligibility | serviceability | financial truth | state/status interpretation | transition | allowed action | validation | default | mapping | vocabulary | error-to-state semantics | location | pricing/fees | runtime/config meaning | retry/idempotency | contract semantics`.

For every meaning record:

```text
SEMANTIC_MEANING=
CURRENT_AUTHORITIES=
CURRENT_MUTABLE_WRITERS=
CURRENT_READERS_CONSUMERS=
CANONICAL_OWNER_CANDIDATE=
CANONICAL_WRITER_CANDIDATE=
DUPLICATE_PARALLEL_SHADOW_STATE=
WINNING_AUTHORITY=
LOSING_AUTHORITIES=
```

Any meaning with multiple mutable writers or authorities remains unresolved until winner/loser treatment is defined.

## 4. Directory / Package Responsibility Census — mandatory

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
NO_UNIQUE_RESPONSIBILITY → DELETE_AFTER_MIGRATION OR DELETE_NOW IF EMPTY/DEAD
DUPLICATE_RESPONSIBILITY → SELECT_WINNER → MIGRATE → DELETE_LOSER
MIXED_RESPONSIBILITIES → SPLIT_BY_TRUE_OWNER
WRONG_OWNER → REHOME
PASS_THROUGH_ONLY → REMOVE
HISTORICAL_COMPAT_ONLY → REMOVE AFTER BOUNDED CUTOVER
MISLEADING_NAME_PATH → RENAME/REHOME
```

Before first mutation:

`UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0`.

## 5. Fast garbage classification

Do not burden obvious low-risk garbage with stateful migration ceremony.

An artifact qualifies `DELETE_NOW` when all are proven:

```text
NO_CANONICAL_AUTHORITY
NO_MUTABLE_STATE
NO_REQUIRED_RUNTIME_ROUTE
NO_REQUIRED_EXTERNAL_CONTRACT
NO_REQUIRED_IMPORT/CALLER/CONSUMER
NO_REQUIRED_MIGRATION_OR_UPGRADE_ROLE
NO_SECURITY_OR_COMPLIANCE_ROLE
```

Then:

`QUICK REFERENCE/REACHABILITY CHECK → DELETE_NOW → SEARCH AGAIN → AFFECTED VERIFY`.

Examples: dead line/symbol, unused helper/export, obsolete file, empty/useless folder, stale script, unused workflow, unused dependency, redundant fixture/mock/snapshot, dead pass-through wrapper.

## 6. Heightened `core/**` and `shared/**` review

Every material artifact under `core/**` or `shared/**` must additionally prove:

```text
WHY_IS_THIS_CROSS_CUTTING?
WHY_CANNOT_A_PRECISE_DOMAIN_OWN_IT?
WHO_ARE_ALL_CURRENT_CONSUMERS?
DOES_IT_CONTAIN_BUSINESS_OR_DOMAIN_POLICY?
DOES_IT_DUPLICATE_SERVICE_LOGIC_OR_CONTRACTS?
DOES_IT_HIDE_A_MORE_PRECISE_OWNER?
```

If not genuinely cross-cutting: `REHOME | SPLIT | MERGE | DELETE`.

## 7. First-class support surfaces

`infra/**`, `tools/**`, `.github/**`, scripts, workflows, runtime/config, tests, fixtures, mocks, and dependencies are not exempt. Establish:

`CURRENT PURPOSE | CANONICAL OWNER | WRITER/DERIVED STATUS | INVOCATIONS/CONSUMERS | REACHABILITY | DUPLICATION | TARGET DISPOSITION`.

## 8. Symbol/line-level discovery

Within files that own or duplicate material semantics, descend to symbols/branches/lines sufficiently to expose:

`dead symbol | unused export | duplicate validation/default/mapping | shadow local policy | obsolete branch | stale flag | unnecessary wrapper | misleading symbol | unjustified suppression | stale TODO/FIXME/HACK`.

## Baseline output

The census must produce complete inputs for `CURRENT g`, the Artifact Disposition Ledger, Semantic Authority Registry, Directory/Package Verdicts, and the candidate winning/losing authority map used by `02`.
