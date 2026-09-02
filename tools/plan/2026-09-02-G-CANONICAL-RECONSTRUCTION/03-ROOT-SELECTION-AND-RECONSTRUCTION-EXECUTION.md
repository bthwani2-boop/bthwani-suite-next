# 03 — ROOT SELECTION AND RECONSTRUCTION EXECUTION

## Purpose

Turn the complete structural delta into true causal roots, choose the highest proven executable Closure Unit, and execute it end-to-end.

## Campaign authority boundary

This file may be entered **only after** `00`, `01`, and `02` have completed the initial `g` reconstruction baseline:

`CENSUS → CURRENT g → CANONICAL g → STRUCTURAL DELTA`.

The `g` reconstruction plan owns this campaign sequencing. The live orchestrator is applied here only for applicable cross-cutting invariants such as root proof, Source-of-Defect/Source-of-Fix, canonical owner/writer, affected-cone completeness, migration/cutover safety, exact-HEAD safety, evidence validity, verification, and closure.

Do not use orchestrator `AUTO/NEXT`, generic objective discovery, historical-root order, or pre-census root ranking to enter this file early or select a Closure Unit before the reconstruction baseline exists.

## Step 5 — synthesize true roots

Do not create one root per file, tool finding, screen, test failure, or historical label.

Process the complete delta:

1. cluster symptoms under causal parents;
2. merge descendants under the highest common structural root;
3. identify shared canonical-owner defects;
4. identify structural multiplier roots (duplicate authorities, wrong boundaries, repeated patch layers, duplicated runtime/config truth, generated/manual repair patterns, etc.);
5. prove actual Source-of-Defect and Source-of-Fix frontier;
6. prove enough affected writers/readers/consumers/data/contracts/runtime/tooling to execute safely;
7. rank causal roots.

Rank by:

`CAUSAL DEPTH × BLOCKING POWER × CANONICAL IMPORTANCE × PRODUCT/DATA/SECURITY/FINANCIAL RISK × FANOUT × STRUCTURAL LEVERAGE × EXECUTABLE PROOF × EVIDENCE INVALIDATION RISK`.

Never rank by numeric ID, age, easiest diff, first red check, file count, or finding count.

## Historical findings are probes only

Prior serviceability/geo, WLT, dispatch, checkout/address/maps, cart, profile, support/notifications, shared/core, infra/config, CI/evidence, or any other historical finding must be re-evaluated against `CURRENT g`, `CANONICAL g`, and the full Structural Delta.

For each:

```text
LIVE INDEPENDENT ROOT? → PROMOTE
DESCENDANT OF HIGHER ROOT? → ATTACH/MERGE UNDER HIGHER ROOT
ALREADY FIXED/REMOVED? → SUPERSEDED
CLAIM INCORRECT? → FALSE_POSITIVE
INSUFFICIENT PROOF? → EVIDENCE_ONLY / DIAGNOSIS DEBT
```

Historical order has zero scheduling authority.

## Step 6 — declare one Closure Unit

Select the smallest **causally complete** root or tightly coupled root cluster that can reach honest closure without exporting dual authority, half migration, deferred cutover, required cleanup debt, unmigrated consumers, or unresolved ownership decisions.

Before mutation declare:

```text
ROOT_ID=<ephemeral>
PINNED_REMOTE_G_SHA=
PRIMARY_CAUSAL_ROOT=
WHY_HIGHEST=
ACTUAL_SOURCE_OF_DEFECT=
ACTUAL_SOURCE_OF_FIX=
CANONICAL_RESPONSIBILITY=
CANONICAL_OWNER=
CANONICAL_WRITER=
TARGET_CANONICAL_NAME_PATH_BOUNDARY=
COMPLETE_AFFECTED_CONE=
WRITERS_READERS_CONSUMERS=
DATA_SCHEMA_IMPACT=
CONTRACT_GENERATED_IMPACT=
RUNTIME_CONFIG_TOOLING_IMPACT=
TEST_FIXTURE_MOCK_DEPENDENCY_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
LOSING_AUTHORITIES_TO_DELETE=
OLD_NAMES_PATHS_TO_DELETE=
NEGATIVE_SPACE_SEARCH=
TARGETED_VERIFICATION=
REOPEN_CONDITIONS=
```

This is a coordination checkpoint, not an approval gate.

## Step 7 — execute canonical reconstruction

Treatment order:

`CANONICAL SEMANTICS → CANONICAL OWNER/WRITER → TARGET NAME/PATH/BOUNDARY → DATA/SCHEMA → CONTRACT → GENERATED → READERS → CONSUMERS → RUNTIME/CONFIG/TOOLING → PRODUCT JOURNEY/STATE → CUTOVER → DISABLE OLD WRITES → ZERO OLD READERS/REFS → DELETE LOSING AUTHORITY → DELETE OLD PATHS/RESIDUE → VERIFY → FALSIFY`.

When proven necessary, authority includes:

- rewrite modules/functions/types/components/internal APIs;
- move/rename file families and directory trees;
- merge/delete directories/packages;
- split mixed-responsibility modules;
- change contracts and regenerate clients;
- change schema and migrate/backfill/reconcile data;
- replace runtime/config composition;
- consolidate/delete scripts, workflows, actions, tooling, configs;
- delete obsolete tests/fixtures/mocks/dependencies/plugins;
- remove superseded implementations completely;
- restructure cross-surface state/journey ownership.

No minimal-diff requirement exists. The target is the smallest causally complete canonical solution.

## Exact-HEAD mutation lock

Immediately before commit/push:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false:

`FETCH → COMPARE → IDENTIFY OVERLAP → INVALIDATE AFFECTED DIAGNOSIS/EVIDENCE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

Never force-push over unseen work.

## Per-root closure condition

A root remains open until all applicable conditions pass:

```text
CANONICAL_OWNER_PROOF=PASS
CANONICAL_WRITER_PROOF=PASS_OR_NA
CANONICAL_NAME_PATH_TOPOLOGY=PASS
COMPLETE_CONSUMER_MIGRATION=PASS
DATA_MIGRATION_READBACK=PASS_OR_NA
CONTRACT_GENERATED_PARITY=PASS_OR_NA
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS_REEXPORTS=0
OLD_ROUTES_CONFIG_SCRIPT_WORKFLOW_REFS=0
OLD_NAME_PATH_REFS=0
OLD_RUNTIME_REACHABILITY=0
SUPERSEDED_STRUCTURE_DELETED=YES
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
TARGETED_VERIFICATION=PASS
NEGATIVE_SPACE=PASS
EVIDENCE_DEBT=0
```

Then commit one coherent root, push directly to `g`, verify remote SHA, and continue with `05`.
