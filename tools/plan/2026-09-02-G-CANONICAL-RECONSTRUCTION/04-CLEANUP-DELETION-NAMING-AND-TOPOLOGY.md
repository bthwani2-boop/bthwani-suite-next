# 04 — CLEANUP, DELETION, NAMING AND TOPOLOGY

## Purpose

Ensure reconstruction removes the inherited structural debt instead of wrapping it.

This file applies during execution of each selected Closure Unit and again during final branch-wide qualification.

## Every artifact must justify survival

Every material artifact in the affected cone must end with one proven disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | BOUNDED_RETIREMENT`.

There is no final `IGNORE`, `KEEP_JUST_IN_CASE`, `HISTORICAL_KEEP`, permanent `TEMP`, or `MAYBE_USED`.

Git history is the archive. Live `g` is not an archive.

## Old/stale artifact law

For every old/legacy/stale/obsolete/superseded file, folder, package, script, workflow, config, route, test, fixture, mock, snapshot, dependency, generated repair, copy/backup/temp/prototype, or compatibility shell, prove at least one:

- unique current canonical responsibility;
- current required runtime consumer;
- current required build/test/tooling/operations consumer;
- required generated/derived status from canonical source;
- supported bounded migration with explicit removal trigger;
- required evidence under live governance.

If none is proven after consumer/data safety proof: `DELETE`.

Do not relocate garbage into `archive`, `history`, `legacy`, `backup`, `old`, or similar live folders.

## Names and paths are architecture

For every materially affected file/directory/package/module/script/workflow/config/test/generated/data boundary prove:

```text
NAME_MATCHES_ACTUAL_RESPONSIBILITY
PATH_MATCHES_CANONICAL_OWNER
DIRECTORY_LEVEL_JUSTIFIED
PACKAGE_MODULE_BOUNDARY_HAS_UNIQUE_RESPONSIBILITY
APPLICABLE_LANGUAGE_FRAMEWORK_CONVENTION=PASS_OR_JUSTIFIED_EXCEPTION
DOMAIN_VOCABULARY_CONSISTENT
NO_MISLEADING_GENERIC_BUCKET_WHEN_REAL_OWNER_EXISTS
NO_TRANSITIONAL_NAME_AS_PERMANENT_STRUCTURE
NO_DUPLICATE_TREE_FOR_SAME_RESPONSIBILITY
NO_FALSE_OWNER_IMPLIED_BY_PATH
NO_OBSOLETE_NAME_AFTER_CUTOVER
```

Permanent architecture must not preserve patch chronology (`old`, `new`, `legacy`, `v2`, `v3`, `tmp`, `copy`, `backup`, `fixed`, `final`) unless that term has real product/domain/version semantics.

Generic buckets (`common`, `utils`, `helpers`, `misc`, `shared`, `core`) require precise canonical purpose; otherwise rehome/split/delete.

## Semantic duplication

Duplication is semantic, not textual.

Search for duplicate meaning in:

`eligibility | permission | serviceability | financial truth | state/status interpretation | allowed actions | retry/idempotency | state transitions | defaults/fallbacks | validation | normalization | locale/currency | role/capability vocabulary | address/location | pricing/fees | contract semantics | error-to-state mapping | runtime/config decisions | operational scripts/tooling`.

When proven:

`SELECT CANONICAL OWNER → MIGRATE WRITERS/READERS/CONSUMERS → CUT OVER → DELETE LOSING AUTHORITY`.

Never solve two authorities by creating a third mapper/wrapper/registry.

## Collapse before add

Before adding a package, directory, shared layer, adapter, mapper, wrapper, service, registry, abstraction, compatibility path, config source, script, workflow, test utility, or dependency, prove an existing canonical owner cannot absorb the responsibility.

Prefer elimination/consolidation over another layer.

## Directory/package treatment

If a directory/package has no unique responsibility:

`INVENTORY CONSUMERS → MOVE REQUIRED CONTENT → MIGRATE REFERENCES → DELETE TREE`.

If mixed responsibilities: `SPLIT BY CANONICAL OWNER`.

If duplicate responsibility trees:

`SELECT CANONICAL TARGET → MIGRATE COMPLETE CONE → MERGE REQUIRED VALUE → DELETE LOSER`.

If the winning implementation has a misleading name/path, rename/rehome it rather than preserving historical topology.

## Script/tool/workflow treatment

Every script/tool/workflow must prove:

`CURRENT PURPOSE | CANONICAL OWNER | CANONICAL NAME/PATH | SUPPORTED INVOCATION | CURRENT CONSUMERS | WHY CANONICAL TOOLING CANNOT ABSORB IT`.

Duplicate responsibility must consolidate to one. Product/runtime/config truth must not live independently in scripts. Unsupported/dead scripts/workflows are deleted.

## Data/schema cleanup

Schema/data restructuring must prove target constraints, clean install/bootstrap, migration order, existing-data backfill/reconciliation, writer cutover, readback, idempotency/atomicity where material, recovery semantics, and safe removal of obsolete mutable storage after zero consumers.

No permanent parallel mutable columns/tables representing the same truth.

## Contract/generated cleanup

`AUTHORITATIVE SEMANTICS → CANONICAL CONTRACT → REGENERATE → MIGRATE ALL CONSUMERS → DELETE MANUAL REPAIR → ZERO UNEXPECTED GENERATED DIFF`.

Investigate handwritten DTO/enum copies, repair intersections, generated overlays, direct generated edits, keep-in-sync comments, runtime coercions hiding drift, and non-canonical generated paths.

## Tests/dependencies cleanup

Tests are evidence consumers, not alternate product authorities. Delete tests/fixtures/mocks/snapshots tied only to superseded behavior. Never weaken assertions to manufacture green.

After each migration, remove obsolete dependencies/devDependencies/plugins/config/scripts/workflows and prove no accidental transitive reliance remains.

## Deletion proof

Before deleting a material artifact prove as applicable:

```text
ZERO_REQUIRED_IMPORTS
ZERO_REQUIRED_EXPORTS_REEXPORTS
ZERO_REQUIRED_CALLERS
ZERO_RUNTIME_ROUTES
ZERO_MUTABLE_WRITERS
ZERO_REQUIRED_READERS
ZERO_CONFIG_REFERENCES
ZERO_SCRIPT_WORKFLOW_INVOCATIONS
ZERO_CONTRACT_GENERATED_REFERENCES
ZERO_REQUIRED_TEST_FIXTURE_MOCK_DEPENDENCY
ZERO_REQUIRED_DATA_MIGRATION_DEPENDENCY
ZERO_SUPPORTED_UPGRADE_OPERATIONS_DEPENDENCY
```

After deletion rerun reference and negative-space searches.

## Move/rename proof

`TRUE RESPONSIBILITY → TRUE OWNER → CANONICAL NAME → CANONICAL PATH → CORRECT BOUNDARY → NO DUPLICATE AUTHORITY → MOVE/RENAME → MIGRATE ALL REFERENCES → DELETE OLD PATH → SEARCH OLD PATH/NAME/VOCABULARY → ZERO REQUIRED REFERENCES`.

No unbounded forwarding shell remains merely to reduce migration effort.

## No cosmetic cleanup

Forbidden final outcomes:

- moving `legacy` to `archive` while keeping it live;
- renaming clutter without correcting ownership;
- duplicate truths hidden behind `shared/common`;
- old scripts collected instead of deleted;
- new canonical implementation while old writer remains reachable;
- wrapper/adapter layers whose only purpose is preserving wrong topology;
- leaving names/paths wrong because changing imports is inconvenient.

## Per-root cleanup proof

Before root closure answer with evidence:

```text
WHAT_OLD_AUTHORITY_DISAPPEARED?
WHAT_DUPLICATE_WRITER_READER_MAPPING_DISAPPEARED?
WHAT_OBSOLETE_FILES_DIRECTORIES_PACKAGES_DISAPPEARED?
WHAT_OBSOLETE_SCRIPTS_WORKFLOWS_CONFIG_TOOLING_DISAPPEARED?
WHAT_TEST_FIXTURE_MOCK_DEPENDENCY_RESIDUE_DISAPPEARED?
WHICH_NAMES_PATHS_BOUNDARIES_ARE_NOW_CANONICAL?
WHAT_PROVES_OLD_NAMES_PATHS_HAVE_ZERO_REQUIRED_REFS?
WHAT_COMPATIBILITY_REMAINS_AND_WHAT_REMOVES_IT?
WHAT_PROVES_NO_THIRD_AUTHORITY?
WHAT_PROVES_NO_REQUIRED_DATA_BEHAVIOR_OPERATIONS_LOSS?
```

Replacement with no old-structure removal is `CLOSURE_SUSPICION` unless bounded retention is explicitly proven.
