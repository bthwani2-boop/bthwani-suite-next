# FILESYSTEM / MIGRATION / CLEANUP / DELETION MATRIX — `g` ONLY

## 0. Governing scope

This matrix applies to **every material artifact that exists on branch `g` only**.

There is no predefined file/folder/subsystem scope. No artifact is excluded merely because it was absent from the original plan or Root Graph.

Other branches are out of scope.

Desired fixed point on `g`:

`ONE MATERIAL MEANING → ONE CANONICAL OWNER → ONE CANONICAL WRITER → MINIMUM NECESSARY STRUCTURE → DERIVED CONSUMERS ONLY → ZERO MATERIAL RESIDUE`.

Git history is the archive. The live content of `g` is not an archive.

## 1. Universal inventory on `g`

Audit/disposition all material classes when encountered:

`line/statement`, `function/symbol`, `type/enum/state machine`, `component/hook/screen`, `file/file-family`, `directory/subtree`, `package/workspace/module`, `service/core/shared/app boundary`, `route/handler/job/worker`, `schema/table/column/index/constraint`, `migration/seed/bootstrap`, `persisted data/projection`, `contract/OpenAPI/schema`, `generated client/type/binding`, `mapping/adapter/wrapper`, `runtime composition/registry`, `config/env/default/feature flag`, `script/CLI/helper/tooling/one-off utility`, `workflow/action/hook`, `test/mock/fixture/snapshot`, `dependency/devDependency/plugin`, `manifest/asset`, `documentation/plan with live authority`, and any other material artifact discovered on `g`.

Nothing material may remain unclassified.

## 2. Mandatory dispositions

Every material artifact gets exactly one proven disposition:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | BOUNDED_RETIREMENT`.

There is no `IGNORE`, `UNKNOWN_KEEP`, `JUST_IN_CASE`, `HISTORICAL_KEEP`, permanent `TEMP`, or `OUT_OF_SCOPE_BY_DEFAULT`.

## 3. Old artifact deletion law

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

## 4. P0 structural-noise classes

Treat as P0 when material/reachable:

`duplicate authority`, `parallel/shadow truth`, `duplicate mutable writer`, `duplicate decision/validation/policy/default`, `duplicate state machine`, `duplicate enum/vocabulary`, `duplicate mapping/DTO/contract semantics`, `duplicate runtime/config path`, `duplicate script/tool/workflow responsibility`, `manual mirror/keep-in-sync`, `generated repair`, `pass-through wrapper`, `dead code/file/folder/package`, `unreachable route/runtime`, `stale/obsolete/superseded implementation`, `legacy compatibility`, `historical/backup/copy/temp/prototype/experimental residue`, `orphan/misplaced artifact`, `ambiguous ownership`, `unused dependency/export/route/config/script/workflow`, `tests/fixtures/mocks tied only to superseded truth`.

Keyword hits are investigation targets, not blind-delete instructions. Every material hit needs proof and disposition.

## 5. Semantic duplication

Duplication is semantic, not textual.

Search for multiple implementations of the same material meaning: eligibility, permission, serviceability, financial truth, status interpretation, allowed actions, retries/idempotency, state transitions, defaults/fallbacks, validation, normalization, locale/currency, role/capability vocabulary, address/location, pricing/fees, contract semantics, error-to-state mapping, and operational scripts/tools that perform the same responsibility.

When proven:

`SELECT CANONICAL OWNER → MIGRATE WRITERS/READERS/TOOLING CONSUMERS → CUT OVER → DELETE LOSING AUTHORITY`.

Do not solve two authorities with a third authority.

## 6. Collapse before add

Before adding a package, directory, shared layer, adapter, mapper, wrapper, service, registry, abstraction, compatibility path, config source, script, or workflow, prove an existing canonical owner cannot absorb the responsibility.

If it can:

`ABSORB / CONSOLIDATE`.

Prefer eliminating duplication to managing it.

## 7. Directory/package authority

If a directory/package has no unique responsibility:

`INVENTORY CONSUMERS → MOVE REQUIRED CONTENT → MIGRATE REFERENCES → DELETE TREE`.

If it mixes unrelated responsibilities: `SPLIT BY CANONICAL OWNER`.

If two trees own the same responsibility:

`SELECT WINNER → MIGRATE COMPLETE CONE → MERGE REQUIRED VALUE → DELETE LOSER`.

Do not preserve topology for diff-size convenience.

## 8. Script/tool/workflow authority

Every script/tool/workflow on `g` must prove:

`CURRENT PURPOSE`
`CANONICAL OWNER`
`SUPPORTED INVOCATION PATH`
`CURRENT CONSUMERS`
`WHY EXISTING CANONICAL TOOLING CANNOT ABSORB IT`.

If two perform the same responsibility, consolidate to one and delete the loser.

If a script duplicates product/runtime/config truth, move truth to the real owner and make the script derived/thin or delete it.

If a script/workflow has no supported invocation or required operational purpose, delete it.

No script is preserved because it might be useful later.

## 9. Rewrite vs refactor

Use `REFACTOR` when semantics/ownership are already canonical.

Use `REWRITE` when the abstraction encodes wrong semantics, parallel truth is embedded, compatibility dominates, repeated local fixes preserve the defective model, or replacement creates a smaller/verifiable canonical structure.

Do not rewrite healthy canonical code for style alone. Do not preserve structurally wrong code because the rewrite is large.

## 10. Data/schema migration

Schema/data restructuring must prove target schema/constraints, clean install/bootstrap, migration order, existing-data backfill/reconciliation, writer cutover, persisted readback, idempotency/atomicity where material, recovery semantics, and safe removal of obsolete mutable storage after zero consumers.

No permanent parallel mutable columns/tables.

## 11. Contract/generated migration

`AUTHORITATIVE SEMANTICS → CANONICAL CONTRACT → REGENERATE → MIGRATE ALL CONSUMERS → DELETE MANUAL REPAIR → ZERO UNEXPECTED GENERATED DIFF`.

Search for generated-type `Omit`, repair intersections, handwritten enum/DTO copies, request/response overlays, keep-in-sync comments, direct generated edits, and runtime coercions hiding drift.

## 12. Runtime/config canonicalization

Inventory env, config, defaults, manifests, compose/workflow config, runtime registries, routes, feature flags, ports/endpoints, health/readiness/bootstrap declarations, and scripts that mutate/generate them.

For each material meaning prove one canonical source and derived consumers. Delete obsolete paths/defaults/scripts after cutover.

## 13. Tests/fixtures/mocks

Tests are evidence consumers, not alternate product authorities.

Migrate tests to canonical behavior; delete tests for superseded behavior; delete fixtures/mocks/snapshots used only by deleted paths; never weaken assertions to manufacture green; add negative tests when needed to prove old authority is unreachable.

## 14. Dependency cleanup

After every affected-cone migration:

- identify no-longer-referenced packages/plugins/tools;
- remove obsolete dependencies/devDependencies;
- remove corresponding config/scripts/workflows;
- prove build/test/runtime does not rely on accidental transitive availability;
- avoid replacement dependencies without causal need.

## 15. Negative-space sweep on `g`

Search affected cone and finally **all material content on `g`** for:

`old`, `legacy`, `obsolete`, `deprecated`, `superseded`, `history`, `archive`, `backup`, `copy`, `tmp`, `temp`, `v2`, `v3`, `compat`, `fallback`, `mirror`, `shadow`, `duplicate`, `prototype`, `experimental`, `keep in sync`, `source of truth`, `canonical`, `TODO`, `FIXME`, `HACK`, `one-off`, `manual`.

Every material hit becomes:

`CANONICAL | DERIVED_REQUIRED | GENERATED_REQUIRED | BOUNDED_MIGRATION | FALSE_POSITIVE_WITH_REASON | DELETE`.

## 16. Deletion proof

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

## 17. Move/rename/merge/split proof

Trace/update:

`imports → exports → reexports → callers → routes → contracts → schemas → config → env → scripts → workflows → dependencies → tests → mocks → fixtures → generated → runtime registries → product journeys`.

Search both old path/name and old semantic vocabulary.

A move is not closed while the old path survives as an unbounded forwarding shell.

## 18. No cosmetic cleanup

Forbidden final outcomes:

- `legacy → archive` while retained live;
- `old → history` inside live trees;
- duplicates hidden behind `common`;
- duplicate mappings hidden behind shared mapping while authorities survive;
- mixed responsibility dumped into `utils/helpers/misc`;
- old scripts collected into archive folders instead of deleted;
- parallel truths wrapped by a new abstraction;
- new canonical implementation while old writer remains reachable.

Cleaning means removing the structural cause, not relocating clutter.

## 19. Mandatory cleanup proof per root

Before closure answer with evidence:

```text
What old authority disappeared?
What duplicate writer/reader/mapping disappeared?
What obsolete lines/functions/files disappeared?
What obsolete directories/packages disappeared?
What obsolete scripts/workflows/tooling disappeared?
What stale config/routes/contracts disappeared?
What dependencies/tests/fixtures/mocks disappeared?
What compatibility remains, why, and what deletes it?
What proves zero old consumers/invocations?
What proves no third authority was created?
What proves no required data/behavior/operations capability was lost?
```

If a replacement/consolidation closes while no old structure disappeared, classify `CLOSURE_SUSPICION` and re-audit.

## 20. Final branch-wide sweep

Before `G_RADICAL_CLEANUP_COMPLETE`, run a fresh sweep across **all material content of `g`**, not selected files:

`semantic duplicates → mutable-writer uniqueness → owner uniqueness → contract authority → schema/data authority → state-machine/policy/default/mapping duplication → filesystem responsibility → script/tool/workflow responsibility → dead/unreachable → legacy/history/temp/backup/copy → compatibility residue → unused dependency/export/config/route/script/workflow → generated/manual repair → test/fixture/mock residue → canonical ownership → reachable old authority → undispositioned artifacts`.

Any material finding reopens the Root Graph.

Final requirement:

`G_NOISE_BUDGET = ZERO KNOWN MATERIAL NOISE`.
