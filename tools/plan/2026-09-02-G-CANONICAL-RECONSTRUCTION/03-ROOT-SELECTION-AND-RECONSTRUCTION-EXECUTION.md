# 03 — ROOT SELECTION AND RECONSTRUCTION EXECUTION

## Purpose

Select the highest **proven executable** causal root from the complete branch-wide reconstruction baseline and close its complete affected cone end-to-end.

This file may be entered for root selection only after `01` has completed the branch-wide census, `02` has completed `CURRENT g`/`CANONICAL g`/Structural Delta, and the true causal Root Graph has been synthesized and ranked. The `ROOT-CORRECT EXECUTION GATE` cannot bypass that prerequisite.

## Root selection law

Do not create one root per file, tool finding, screen, test failure, or historical label.

For each candidate:

1. cluster symptoms under causal parents;
2. prove the actual Source-of-Defect;
3. prove the canonical Source-of-Fix and owner/writer;
4. identify any higher root already supported by evidence;
5. map the complete affected writers/readers/consumers/data/contracts/runtime/tooling;
6. prove migration/cutover/deletion safety;
7. synthesize and rank the complete true Root Graph before choosing the highest root;
8. execute only when the complete pre-mutation reconstruction gate and root-correct gate both pass.

Among currently proven executable roots, prefer the highest causal/leverage root using:

`CAUSAL DEPTH × BLOCKING POWER × CANONICAL IMPORTANCE × PRODUCT/DATA/SECURITY/FINANCIAL RISK × FANOUT × STRUCTURAL LEVERAGE × EXECUTABLE PROOF`.

Never rank by numeric ID, age, easiest diff, first red check, file count, or finding count.

A complete branch-wide causal ranking is required before selecting the root. A locally complete affected cone cannot waive the global reconstruction baseline or ranking requirement.

## Historical findings are probes only

For every historical finding:

```text
LIVE PROVEN ROOT? → ELIGIBLE WHEN GATE PASSES
DESCENDANT OF HIGHER ROOT? → ATTACH / PREEMPT
ALREADY FIXED? → SUPERSEDED
INCORRECT? → FALSE_POSITIVE
INSUFFICIENT PROOF? → EVIDENCE_ONLY
```

Historical order has zero scheduling authority.

## Declare one Closure Unit

Select the smallest **causally complete** root or tightly coupled root cluster that can reach honest closure without exporting dual authority, half migration, deferred cutover, cleanup debt, unmigrated consumers, or unresolved ownership decisions.

Before mutation record:

```text
PINNED_REMOTE_G_SHA=
PRIMARY_CAUSAL_ROOT=
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

This is a mandatory pre-mutation record and gate. Blank, stale, or locally inferred fields block execution.

## Execute canonical reconstruction

Treatment order:

`CANONICAL SEMANTICS → CANONICAL OWNER/WRITER → TARGET NAME/PATH/BOUNDARY → DATA/SCHEMA → CONTRACT → GENERATED → READERS → CONSUMERS → RUNTIME/CONFIG/TOOLING → PRODUCT JOURNEY/STATE → CUTOVER → DISABLE OLD WRITES → ZERO OLD READERS/REFS → DELETE LOSING AUTHORITY → DELETE OLD PATHS/RESIDUE → VERIFY → FALSIFY`.

When proven necessary, rewrite, move, rename, merge, split, regenerate, migrate, or delete across the full affected cone. No minimal-diff requirement exists. Do not solve duplicate authority by adding another wrapper/mapper/compatibility layer.

`04-CLEANUP-DELETION-NAMING-AND-TOPOLOGY.md` applies to every Closure Unit.

## Exact-HEAD mutation lock

Immediately before commit/push:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false:

`FETCH → COMPARE → IDENTIFY OVERLAP → INVALIDATE AFFECTED EVIDENCE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

Never force-push over unseen work.

## Per-root closure condition

A root remains open until all applicable conditions pass:

```text
CANONICAL_OWNER_PROOF=PASS
CANONICAL_WRITER_PROOF=PASS_OR_NA
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
AFFECTED_CONE_EVIDENCE_DEBT=0
```

Then commit the coherent Closure Unit, push directly to `g`, verify the remote SHA, re-pin, and continue with `05`.

## Preemption

If new census/evidence proves a higher root that invalidates the selected treatment:

`STOP DESCENDANT WORK → PROMOTE HIGHER ROOT → REMAP AFFECTED CONE → REDEFINE TARGET → EXECUTE ONLY AFTER GATE PASSES`.
