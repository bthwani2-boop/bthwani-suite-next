# FILESYSTEM / MIGRATION / CLEANUP / DELETION MATRIX — `g`

## 0. Governing objective

`g` is the dedicated branch for radical cleanup and deep restructuring at **all repository granularities**.

The live repository is not an archive. Git history is the archive.

The desired fixed point is:

`ONE MATERIAL MEANING → ONE CANONICAL OWNER → ONE CANONICAL WRITER → MINIMUM NECESSARY STRUCTURE → DERIVED CONSUMERS ONLY → ZERO MATERIAL RESIDUE`.

Cleanup is not a final cosmetic phase. It is part of every root's causal closure.

## 1. Universal artifact inventory

Every material affected cone must inventory, where applicable:

- lines/statements and local branches;
- functions/methods/symbols;
- types/enums/state machines;
- components/hooks/screens;
- files/file families;
- directories/subtrees;
- packages/workspaces/modules;
- service/core/shared boundaries;
- routes/handlers/jobs/workers;
- schema/tables/columns/indexes/constraints;
- migrations/seeds/bootstrap/fixtures;
- persisted data and derived projections;
- contracts/OpenAPI/schema definitions;
- generated clients/types/bindings;
- mappings/adapters/wrappers;
- runtime composition/registries;
- config/env/defaults/feature flags;
- scripts/tooling/workflows;
- tests/mocks/fixtures/snapshots;
- dependencies/devDependencies;
- assets whose presence affects runtime/product truth;
- documentation/manifests only when they act as live execution/product authority.

Nothing material inside the affected cone may remain unclassified.

## 2. Mandatory dispositions

Every material artifact receives exactly one proven disposition:

- `KEEP_PROVEN` — unique, canonical, required responsibility;
- `HARDEN` — correct owner/semantics, implementation requires strengthening;
- `REFACTOR` — semantics correct, structure/typing/readability defective;
- `REHOME` — correct responsibility, wrong owner/location;
- `RENAME` — ambiguous/wrong naming affects ownership or maintenance;
- `MERGE` — responsibility duplicated across artifacts;
- `SPLIT` — one artifact mixes independent canonical responsibilities;
- `REWRITE` — current abstraction encodes wrong semantics or defective structural model;
- `REGENERATE` — derived artifact must come from canonical source;
- `MIGRATE` — required data/consumer/config movement before cutover;
- `DELETE` — no unique required responsibility remains;
- `BOUNDED_RETIREMENT` — temporary compatibility only with explicit deletion trigger.

No `UNKNOWN_KEEP`, `JUST_IN_CASE`, or permanent `TEMP` disposition exists.

## 3. P0 structural-noise classes

Treat as P0 when material/reachable:

- duplicate authority;
- parallel/shadow truth;
- duplicate mutable writer;
- duplicate decision/validation/policy/default;
- duplicate state machine;
- duplicate enum/vocabulary;
- duplicate mapping/DTO/contract semantics;
- duplicate runtime/config path;
- duplicate component/abstraction with no unique responsibility;
- manual mirror/keep-in-sync layer;
- generated contract repair layer;
- pass-through wrapper without material responsibility;
- dead code/file/folder/package;
- unreachable route/runtime;
- stale/obsolete/superseded implementation;
- legacy compatibility with no bounded removal;
- historical/backup/copy/temp/prototype/experimental residue;
- orphan or misplaced artifact;
- ambiguous ownership;
- unused dependency/export/route/config;
- tests/fixtures/mocks tied only to superseded truth.

These are not automatically deleted from a keyword hit. They are **mandatory investigation targets** and must receive a proven disposition.

## 4. Semantic duplication law

Duplication is not textual equality.

Search for multiple implementations of the same material meaning, including:

- eligibility decisions;
- permissions/authorization decisions;
- serviceability rules;
- financial decisions;
- status interpretation;
- allowed-actions logic;
- retries/idempotency semantics;
- state transitions;
- defaults/fallbacks;
- validation;
- normalization;
- locale/currency meaning;
- role/capability vocabulary;
- address/location interpretation;
- pricing/fee logic;
- contract request/response meaning;
- error-to-state mapping.

When duplication is proven:

`SELECT CANONICAL OWNER → MIGRATE WRITERS/READERS → CUT OVER → DELETE LOSING AUTHORITY`.

Do not solve two authorities by creating a third shared mapper unless it is demonstrably derived and cannot redefine truth.

## 5. Collapse-before-add rule

Before adding a new:

`package`, `shared layer`, `adapter`, `mapper`, `wrapper`, `service`, `registry`, `abstraction`, `compatibility path`, or `config source`, prove that an existing canonical owner cannot correctly absorb the responsibility.

If it can:

`ABSORB / CONSOLIDATE`.

Before adding a shared solution for duplicated semantics, ask whether the duplication itself can be removed. Prefer elimination over centralized duplication management.

## 6. Directory/package restructuring authority

If a directory/package has no unique material responsibility:

`INVENTORY CONSUMERS → MOVE REQUIRED CONTENT TO TRUE OWNERS → MIGRATE IMPORTS/CONFIG → DELETE DIRECTORY/PACKAGE`.

If it mixes unrelated responsibilities:

`SPLIT BY CANONICAL OWNER`.

If two directories/packages own the same responsibility:

`SELECT WINNING CANONICAL OWNER → MIGRATE COMPLETE CONE → MERGE REQUIRED VALUE → DELETE LOSING TREE`.

If an existing name/layout falsely implies authority, rename/rehome it after complete reference migration.

Do not preserve topology merely to minimize diff size.

## 7. Rewrite vs refactor

Use `REFACTOR` when canonical semantics are already correct and the defect is mainly organization, typing, readability, or implementation quality.

Use `REWRITE` when:

- current abstraction encodes wrong product/system semantics;
- parallel truths are structurally embedded;
- compatibility layers dominate the implementation;
- repeated local fixes would retain the defective model;
- the existing structure prevents a single canonical writer/contract/storage truth;
- verification of the existing shape is materially harder than replacement with a smaller canonical model.

Do not rewrite healthy canonical code for style alone. Do not preserve structurally wrong code merely because rewriting changes many files.

## 8. Data/schema migration law

Any schema/data restructuring must prove:

1. canonical target schema/constraints;
2. clean-install/bootstrap truth;
3. migration order;
4. backfill/reconciliation for existing data;
5. old and new writer behavior during cutover;
6. persisted readback after migration;
7. idempotency/atomicity where material;
8. rollback/recovery semantics if migration can partially fail;
9. removal of obsolete columns/tables/indexes/triggers/seeds only after zero required consumers;
10. generated/contracts/runtime consumers updated to target semantics.

Never leave parallel mutable columns/tables as permanent compatibility truth.

## 9. Contract/generated migration law

When contract/generated truth changes:

`AUTHORITATIVE PRODUCT/RUNTIME SEMANTICS → CANONICAL CONTRACT → REGENERATE → MIGRATE ALL CONSUMERS → DELETE MANUAL REPAIR → VERIFY ZERO UNEXPECTED GENERATED DIFF`.

Explicitly search for:

- `Omit<Generated...>`;
- type intersections used to repair generated shapes;
- handwritten copies of generated enums/DTOs;
- manual request/response overlays;
- keep-in-sync comments;
- direct edits to generated output;
- runtime coercions that conceal contract drift.

The final state must not require humans to manually synchronize two contract vocabularies.

## 10. Runtime/config canonicalization

Inventory every material runtime/config source:

- environment variables;
- config files;
- default values;
- service manifests;
- compose/workflow configuration;
- runtime registries;
- route registrations;
- feature flags;
- ports/endpoints;
- health/readiness/bootstrap declarations.

For each material meaning, prove one canonical source and derived consumers.

Delete obsolete config paths and defaults after cutover. `UNKNOWN` configuration must not silently become a plausible business default.

## 11. Tests/fixtures/mocks

Tests are evidence consumers, not alternate product authorities.

For every structural change:

- migrate tests to canonical behavior;
- delete tests that validate superseded behavior;
- delete fixtures/mocks used only by deleted paths;
- do not weaken assertions to make a root appear green;
- do not retain obsolete production compatibility solely because old tests depend on it;
- add negative tests where necessary to prove old authority is unreachable.

## 12. Dependency cleanup

After each affected-cone migration:

- identify packages no longer imported/referenced;
- remove obsolete dependencies/devDependencies;
- remove corresponding configuration/plugins/scripts;
- prove build/test/runtime do not rely on transitive accidental availability;
- avoid replacing one unused dependency with a new abstraction dependency unless causally required.

## 13. Negative-space keyword sweep

Periodically search, scoped first to the affected cone and finally repository-wide, for terms/patterns such as:

`old`, `legacy`, `obsolete`, `deprecated`, `superseded`, `history`, `archive`, `backup`, `copy`, `tmp`, `temp`, `v2`, `v3`, `compat`, `fallback`, `mirror`, `shadow`, `duplicate`, `prototype`, `experimental`, `keep in sync`, `source of truth`, `canonical`, `TODO`, `FIXME`, `HACK`.

A hit is not automatic deletion. Every material hit must be classified:

`CANONICAL`, `DERIVED_REQUIRED`, `GENERATED_REQUIRED`, `BOUNDED_MIGRATION`, `FALSE_POSITIVE_WITH_REASON`, or `DELETE`.

No material hit may remain unreviewed at final fixed point.

## 14. Deletion proof

Before deleting a material artifact prove, as applicable:

`ZERO REQUIRED IMPORTS`
`ZERO REQUIRED EXPORTS/RE-EXPORTS`
`ZERO REQUIRED CALLERS`
`ZERO RUNTIME ROUTES`
`ZERO MUTABLE WRITERS`
`ZERO REQUIRED READERS`
`ZERO CONFIG REFERENCES`
`ZERO CONTRACT/GENERATED REFERENCES`
`ZERO REQUIRED TEST/FIXTURE/MOCK DEPENDENCY`
`ZERO REQUIRED DATA MIGRATION DEPENDENCY`
`ZERO SUPPORTED UPGRADE DEPENDENCY`.

After deletion, rerun negative-space/reference search to prove absence rather than assuming it.

## 15. Move/rename/merge/split proof

After any move/rename/merge/split/replace, trace and update:

`imports → exports → re-exports → callers → routes → contracts → schemas → config → env → dependencies → tests → mocks → fixtures → generated artifacts → runtime registries → product journeys`.

Search both old path/name and old semantic vocabulary.

A move is not closed while the old path survives as a forwarding compatibility shell without a bounded retirement requirement.

## 16. No cosmetic reorganization

Forbidden final outcomes:

- `legacy → archive` while still live;
- `old → history` inside executable/source trees;
- duplicate implementations hidden behind `common`;
- multiple mappings hidden behind a shared mapper while both authorities remain;
- mixed ownership moved into `utils`/`helpers`/`misc`;
- parallel truths wrapped by a new abstraction that keeps both live;
- new canonical implementation added while the old writer remains reachable.

Cleaning means removing the structural cause, not moving the clutter.

## 17. Mandatory cleanup proof per root

Before root closure answer with evidence:

```text
What old authority disappeared?
What duplicate writer disappeared?
What duplicate reader/mapping disappeared?
What obsolete lines/functions/files disappeared?
What obsolete directories/packages disappeared?
What stale config/routes/contracts disappeared?
What dependencies/tests/fixtures/mocks disappeared?
What compatibility remains, why, and what deletes it?
What proves zero old consumers?
What proves no third authority was created?
What proves no required data/behavior was lost?
```

If a root claims to replace/consolidate authority and none of the old structure disappeared, classify it as `CLOSURE_SUSPICION` and re-audit before closing.

## 18. Repository-wide final sweep

Before `G_LEVEL4_CANDIDATE_READY`, execute a broad cleanup/restructure sweep covering:

`semantic duplicate scan → mutable-writer uniqueness → contract authority → schema/data authority → state-machine/policy/default/mapping duplication → filesystem responsibility → dead/unreachable → legacy/history/temp/backup/copy → compatibility residue → unused dependency/export/config/route → generated/manual repair → test/fixture/mock residue → canonical ownership → reachable old authority`.

Final requirement:

`REPOSITORY_NOISE_BUDGET = ZERO KNOWN MATERIAL NOISE`.
