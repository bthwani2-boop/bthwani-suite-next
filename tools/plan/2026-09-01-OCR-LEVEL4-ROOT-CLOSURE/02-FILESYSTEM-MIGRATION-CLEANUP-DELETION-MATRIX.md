# FILESYSTEM / MIGRATION / CLEANUP / DELETION MATRIX — `g` ONLY

## 0. Governing scope

This matrix applies to **every material artifact that exists on branch `g` only**.

There is no predefined file/folder/subsystem scope. No artifact is excluded merely because it was absent from the original plan or Root Graph.

Other branches are out of scope.

Desired fixed point on `g`:

`ONE MATERIAL MEANING → ONE CANONICAL OWNER → ONE CANONICAL WRITER → ONE TRUTHFUL CANONICAL NAME/PATH → MINIMUM NECESSARY STRUCTURE → DERIVED CONSUMERS ONLY → ZERO MATERIAL RESIDUE`.

Git history is the archive. The live content of `g` is not an archive.

## 1. Universal inventory on `g`

Audit/disposition all material classes when encountered:

`line/statement`, `function/symbol`, `type/enum/state machine`, `component/hook/screen`, `file/file-family`, `directory/subtree`, `package/workspace/module`, `service/core/shared/app boundary`, `route/handler/job/worker`, `schema/table/column/index/constraint`, `migration/seed/bootstrap`, `persisted data/projection`, `contract/OpenAPI/schema`, `generated client/type/binding`, `mapping/adapter/wrapper`, `runtime composition/registry`, `config/env/default/feature flag`, `script/CLI/helper/tooling/one-off utility`, `workflow/action/hook`, `test/mock/fixture/snapshot`, `dependency/devDependency/plugin`, `manifest/asset`, `documentation/plan with live authority`, and any other material artifact discovered on `g`.

Nothing material may remain unclassified.

## 2. Mandatory dispositions

Every material artifact gets exactly one proven disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | BOUNDED_RETIREMENT`.

There is no `IGNORE`, `UNKNOWN_KEEP`, `JUST_IN_CASE`, `HISTORICAL_KEEP`, permanent `TEMP`, or `OUT_OF_SCOPE_BY_DEFAULT`.

## 3. Canonical naming / path / topology gate

Names and paths are part of architecture. They must express current truth rather than historical accidents or patch history.

For every material file/directory/package/module/script/workflow/config/test/fixture/generated boundary, verify:

```text
NAME MATCHES ACTUAL RESPONSIBILITY
PATH MATCHES CANONICAL OWNER
DIRECTORY LEVEL IS JUSTIFIED
PACKAGE/MODULE BOUNDARY HAS UNIQUE RESPONSIBILITY
NAMING CONVENTION MATCHES LANGUAGE/FRAMEWORK/REPOSITORY STANDARD
SINGULAR/PLURAL AND DOMAIN VOCABULARY ARE CONSISTENT
NO MISLEADING GENERIC BUCKET WHEN A REAL OWNER EXISTS
NO TRANSITIONAL NAME USED AS PERMANENT STRUCTURE
NO DUPLICATE TREE FOR SAME RESPONSIBILITY
NO FALSE OWNER IMPLIED BY PATH
NO OBSOLETE NAME SURVIVES AFTER CUTOVER
```

Permanent architectural names must not encode migration history such as `old`, `new`, `legacy`, `v2`, `v3`, `tmp`, `temp`, `copy`, `backup`, `final`, `fixed`, `newer`, or similar suffixes/prefixes unless the term is itself a real product/domain concept with proven meaning.

Avoid dumping unrelated responsibilities into ambiguous containers such as `misc`, `common`, `utils`, `helpers`, `shared`, or `core` unless that scope is genuinely canonical and has a precise, unique responsibility.

Follow established ecosystem/framework conventions when they materially improve discoverability, tooling compatibility, import stability, maintainability, and team comprehension. Examples include language-appropriate casing, conventional source/test/config locations, framework route/component/module conventions, package boundary conventions, and predictable generated-code placement. Repository consistency does not justify preserving an incorrect convention; migrate the convention if it is materially defective.

When a name/path is defective:

`PROVE TRUE RESPONSIBILITY → PROVE CANONICAL OWNER → SELECT CANONICAL NAME/PATH → MOVE/RENAME → MIGRATE IMPORTS/EXPORTS/ROUTES/CONFIG/SCRIPTS/WORKFLOWS/TESTS/GENERATED/RUNTIME REFERENCES → DELETE OLD PATH → SEARCH OLD NAME/PATH/VOCABULARY → PROVE ZERO REQUIRED REFERENCES`.

Do not leave alias files, forwarding directories, duplicated barrel exports, symlink-like wrappers, compatibility import paths, or duplicate package names solely to soften a migration unless a bounded supported migration is proven.

A root is not structurally closed while affected filenames/paths/topology still misrepresent ownership or responsibility.

## 4. Old artifact deletion law

Age/history creates no preservation right.

For every old/legacy/stale file, directory, package, script, workflow, config, test, fixture, mock, snapshot, dependency, route, generated artifact, backup/copy/temp item, prototype, or compatibility shell on `g`, prove at least one:

- unique canonical responsibility;
- current required runtime consumer;
- current required build/test/tooling/operations consumer;
- required generated/derived status from canonical source;
- supported bounded migration with explicit removal trigger;
- required evidence under live governance.

If none is proven:

`DELETE`.

Do not relocate obsolete artifacts into `archive`, `history`, `legacy`, `backup`, `old`, or similar live folders to avoid deletion.

## 5. P0 structural-noise classes

Treat as P0 when material/reachable:

`duplicate authority`, `parallel/shadow truth`, `duplicate mutable writer`, `duplicate decision/validation/policy/default`, `duplicate state machine`, `duplicate enum/vocabulary`, `duplicate mapping/DTO/contract semantics`, `duplicate runtime/config path`, `duplicate script/tool/workflow responsibility`, `misleading filename/path`, `non-canonical directory/package topology`, `duplicate directory tree`, `manual mirror/keep-in-sync`, `generated repair`, `pass-through wrapper`, `dead code/file/folder/package`, `unreachable route/runtime`, `stale/obsolete/superseded implementation`, `legacy compatibility`, `historical/backup/copy/temp/prototype/experimental residue`, `orphan/misplaced artifact`, `ambiguous ownership`, `unused dependency/export/route/config/script/workflow`, `tests/fixtures/mocks tied only to superseded truth`.

Keyword hits are investigation targets, not blind-delete instructions. Every material hit needs proof and disposition.

## 6. Semantic duplication

Duplication is semantic, not textual.

Search for multiple implementations of the same material meaning: eligibility, permission, serviceability, financial truth, status interpretation, allowed actions, retries/idempotency, state transitions, defaults/fallbacks, validation, normalization, locale/currency, role/capability vocabulary, address/location, pricing/fees, contract semantics, error-to-state mapping, and operational scripts/tools that perform the same responsibility.

When proven:

`SELECT CANONICAL OWNER → MIGRATE WRITERS/READERS/TOOLING CONSUMERS → CUT OVER → DELETE LOSING AUTHORITY`.

Do not solve two authorities with a third authority.

## 7. Collapse before add

Before adding a package, directory, shared layer, adapter, mapper, wrapper, service, registry, abstraction, compatibility path, config source, script, or workflow, prove an existing canonical owner cannot absorb the responsibility.

If it can:

`ABSORB / CONSOLIDATE`.

Prefer eliminating duplication to managing it.

## 8. Directory/package authority

If a directory/package has no unique responsibility:

`INVENTORY CONSUMERS → MOVE REQUIRED CONTENT → MIGRATE REFERENCES → DELETE TREE`.

If it mixes unrelated responsibilities: `SPLIT BY CANONICAL OWNER`.

If two trees own the same responsibility:

`SELECT WINNER → MIGRATE COMPLETE CONE → MERGE REQUIRED VALUE → DELETE LOSER`.

If the winning tree has a misleading name/path, rename/rehome it to the canonical target rather than preserving the old winner name.

Do not preserve topology for diff-size convenience.

## 9. Script/tool/workflow authority

Every script/tool/workflow on `g` must prove:

`CURRENT PURPOSE`
`CANONICAL OWNER`
`CANONICAL NAME/PATH`
`SUPPORTED INVOCATION PATH`
`CURRENT CONSUMERS`
`WHY EXISTING CANONICAL TOOLING CANNOT ABSORB IT`.

If two perform the same responsibility, consolidate to one and delete the loser.

If a script duplicates product/runtime/config truth, move truth to the real owner and make the script derived/thin or delete it.

If a script/workflow has no supported invocation or required operational purpose, delete it.

No script is preserved because it might be useful later.

## 10. Rewrite vs refactor

Use `REFACTOR` when semantics/ownership are already canonical.

Use `REWRITE` when the abstraction encodes wrong semantics, parallel truth is embedded, compatibility dominates, repeated local fixes preserve the defective model, or replacement creates a smaller/verifiable canonical structure.

Do not rewrite healthy canonical code for style alone. Do not preserve structurally wrong code because the rewrite is large.

## 11. Data/schema migration

Schema/data restructuring must prove target schema/constraints, clean install/bootstrap, migration order, existing-data backfill/reconciliation, writer cutover, persisted readback, idempotency/atomicity where material, recovery semantics, and safe removal of obsolete mutable storage after zero consumers.

Database identifiers and migration names must also truthfully describe their canonical semantics. Do not preserve misleading table/column/index/constraint names when they materially encode obsolete domain meaning and can be safely migrated.

No permanent parallel mutable columns/tables.

## 12. Contract/generated migration

`AUTHORITATIVE SEMANTICS → CANONICAL CONTRACT → REGENERATE → MIGRATE ALL CONSUMERS → DELETE MANUAL REPAIR → ZERO UNEXPECTED GENERATED DIFF`.

Search for generated-type `Omit`, repair intersections, handwritten enum/DTO copies, request/response overlays, keep-in-sync comments, direct generated edits, runtime coercions hiding drift, and generated output stored under misleading/non-standard paths.

## 13. Runtime/config canonicalization

Inventory env, config, defaults, manifests, compose/workflow config, runtime registries, routes, feature flags, ports/endpoints, health/readiness/bootstrap declarations, and scripts that mutate/generate them.

For each material meaning prove one canonical source and derived consumers. Delete obsolete paths/defaults/scripts after cutover.

Config/env names and locations must be unambiguous, owner-aligned, and consistent with supported runtime boundaries.

## 14. Tests/fixtures/mocks

Tests are evidence consumers, not alternate product authorities.

Migrate tests to canonical behavior and canonical paths/naming; delete tests for superseded behavior; delete fixtures/mocks/snapshots used only by deleted paths; never weaken assertions to manufacture green; add negative tests when needed to prove old authority is unreachable.

## 15. Dependency cleanup

After every affected-cone migration:

- identify no-longer-referenced packages/plugins/tools;
- remove obsolete dependencies/devDependencies;
- remove corresponding config/scripts/workflows;
- prove build/test/runtime does not rely on accidental transitive availability;
- avoid replacement dependencies without causal need.

## 16. Negative-space sweep on `g`

Search affected cone and finally **all material content on `g`** for:

`old`, `legacy`, `obsolete`, `deprecated`, `superseded`, `history`, `archive`, `backup`, `copy`, `tmp`, `temp`, `v2`, `v3`, `compat`, `fallback`, `mirror`, `shadow`, `duplicate`, `prototype`, `experimental`, `keep in sync`, `source of truth`, `canonical`, `TODO`, `FIXME`, `HACK`, `one-off`, `manual`, plus misleading path/name patterns discovered during the campaign.

Every material hit becomes:

`CANONICAL | DERIVED_REQUIRED | GENERATED_REQUIRED | BOUNDED_MIGRATION | FALSE_POSITIVE_WITH_REASON | RENAME_REHOME | DELETE`.

## 17. Deletion proof

Before deleting a material artifact prove as applicable:

```text
ZERO REQUIRED IMPORTS
ZERO REQUIRED EXPORTS/REEXPORTS
ZERO REQUIRED CALLERS
ZERO RUNTIME ROUTES
ZERO MUTABLE WRITERS
ZERO REQUIRED READERS
ZERO CONFIG REFERENCES
ZERO SCRIPT/WORKFLOW INVOCATIONS
ZERO CONTRACT/GENERATED REFERENCES
ZERO REQUIRED TEST/FIXTURE/MOCK DEPENDENCY
ZERO REQUIRED DATA MIGRATION DEPENDENCY
ZERO SUPPORTED UPGRADE/OPERATIONS DEPENDENCY
```

After deletion rerun reference and negative-space searches.

## 18. Move/rename/merge/split proof

Before move/rename prove the **target** is canonical, not merely different.

Target proof must cover:

`TRUE RESPONSIBILITY → TRUE OWNER → BEST-PRACTICE NAME → BEST-PRACTICE PATH → CORRECT BOUNDARY LEVEL → NO COLLISION/DUPLICATE AUTHORITY`.

Then trace/update:

`imports → exports → reexports → callers → routes → contracts → schemas → config → env → scripts → workflows → dependencies → tests → mocks → fixtures → generated → runtime registries → product journeys`.

Search both old path/name and old semantic vocabulary.

A move/rename is not closed while the old path survives as an unbounded forwarding shell or while the new path remains misleading/non-canonical.

## 19. No cosmetic cleanup

Forbidden final outcomes:

- `legacy → archive` while retained live;
- `old → history` inside live trees;
- `foo → foo-v2` as permanent architecture when no real versioned domain exists;
- renaming clutter without correcting owner/boundary;
- duplicates hidden behind `common`;
- duplicate mappings hidden behind shared mapping while authorities survive;
- mixed responsibility dumped into `utils/helpers/misc`;
- old scripts collected into archive folders instead of deleted;
- parallel truths wrapped by a new abstraction;
- new canonical implementation while old writer remains reachable.

Cleaning means removing the structural cause, not relocating or relabeling clutter.

## 20. Mandatory cleanup proof per root

Before closure answer with evidence:

```text
What old authority disappeared?
What duplicate writer/reader/mapping disappeared?
What obsolete lines/functions/files disappeared?
What obsolete directories/packages disappeared?
What obsolete scripts/workflows/tooling disappeared?
What stale config/routes/contracts disappeared?
What dependencies/tests/fixtures/mocks disappeared?
Which affected filenames/paths were proven canonical?
Which misleading names/paths were renamed or deleted?
What proves old names/paths have zero required references?
What compatibility remains, why, and what deletes it?
What proves zero old consumers/invocations?
What proves no third authority was created?
What proves no required data/behavior/operations capability was lost?
```

If a replacement/consolidation closes while no old structure disappeared, or affected naming/path defects remain, classify `CLOSURE_SUSPICION` and re-audit.

## 21. Final branch-wide sweep

Before `G_RADICAL_CLEANUP_COMPLETE`, run a fresh sweep across **all material content of `g`**, not selected files:

`semantic duplicates → mutable-writer uniqueness → owner uniqueness → canonical naming/path/topology → contract authority → schema/data authority → state-machine/policy/default/mapping duplication → filesystem responsibility → script/tool/workflow responsibility → dead/unreachable → legacy/history/temp/backup/copy → compatibility residue → unused dependency/export/config/route/script/workflow → generated/manual repair → test/fixture/mock residue → reachable old authority → undispositioned artifacts`.

Any material finding reopens the Root Graph.

Final requirements:

```text
G_NOISE_BUDGET=ZERO_KNOWN_MATERIAL_NOISE
MISLEADING_MATERIAL_FILENAMES=0
MISLEADING_MATERIAL_DIRECTORY_NAMES=0
MISPLACED_MATERIAL_ARTIFACTS=0
DUPLICATE_MATERIAL_DIRECTORY_TREES=0
UNBOUNDED_OLD_PATH_ALIASES=0
KNOWN_NONCANONICAL_MATERIAL_TOPOLOGY=0
```
