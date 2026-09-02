# 03 — ROOT SELECTION AND CANONICAL RECONSTRUCTION EXECUTION

## Purpose

Collapse the complete branch-wide structural delta into the highest proven causal roots, then execute one causally complete reconstruction unit at a time.

## Root synthesis law

Do not create one root per bug/file/test/finding. Cluster deltas under their highest causal parents and prefer the root that removes the most structural causes with the smallest causally complete target.

Rank by:

`CAUSAL DEPTH × BLOCKING POWER × CANONICAL IMPORTANCE × PRODUCT/DATA/SECURITY/FINANCIAL RISK × FANOUT × STRUCTURAL LEVERAGE × EXECUTABLE PROOF`.

Historical findings and CI/scanner failures remain evidence only.

## Structural rewrite escalation

If one responsibility shows three or more of:

`duplicate owners | duplicate writers | duplicate mappings | wrappers/adapters | parallel directories | conflicting defaults | multiple config sources | duplicated state logic | generated/manual repairs | repeated patches | compatibility layers`,

classify it as `POTENTIAL_STRUCTURAL_ROOT` and stop local descendant patching until the structural diagnosis is complete.

## Selected Closure Unit record

Before mutation record:

```text
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
WINNING_AUTHORITIES=
LOSING_AUTHORITIES=
LOSING_WRITERS_READERS_CONSUMERS=
ARTIFACT_DISPOSITIONS_TO_REALIZE=
DIRECTORY_PACKAGE_VERDICTS_TO_REALIZE=
DATA_SCHEMA_IMPACT=
CONTRACT_GENERATED_IMPACT=
RUNTIME_CONFIG_TOOLING_IMPACT=
TEST_FIXTURE_MOCK_DEPENDENCY_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
DELETE_NOW_TARGETS=
POST_CUTOVER_DELETION_TARGETS=
OLD_NAMES_PATHS_TO_DELETE=
NEGATIVE_SPACE_SEARCH=
FILE_LEVEL_FINISHING_SCOPE=
TARGETED_VERIFICATION=
CI_VERIFICATION_MODE=INCREMENTAL|FULL_SCOPE
REOPEN_CONDITIONS=
```

Blank or stale fields block execution.

## Root-correct treatment order

```text
CANONICAL SEMANTICS
→ CANONICAL OWNER/WRITER
→ TARGET NAME/PATH/BOUNDARY
→ DELETE_NOW LOW-RISK GARBAGE IN AFFECTED CONE
→ DATA/SCHEMA
→ CONTRACT/GENERATED
→ READERS/CONSUMERS
→ RUNTIME/CONFIG/TOOLING
→ MIGRATION/BACKFILL/RECONCILIATION
→ CUTOVER
→ DISABLE OLD WRITERS
→ ZERO OLD READERS/REFERENCES
→ DELETE LOSING AUTHORITIES
→ DELETE OLD FILES/DIRECTORIES/PACKAGES/PATHS
→ FILE/SYMBOL/LINE FINISHING
→ DIRECTORY/PACKAGE FINISHING
→ VERIFY
→ FALSIFY
```

No minimal-diff requirement exists.

## Fast-delete lane inside execution

Any affected-cone artifact already classified `DELETE_NOW` is removed without a separate migration project. Required proof is limited to its low-risk classification plus quick reference/reachability check.

Do not postpone proven garbage to a later cleanup batch.

`PROVEN_GARBAGE_DISCOVERED_IN_EXECUTING_CONE → DELETE_IN_SAME_CLOSURE_UNIT`.

## Winner/Loser enforcement

For every duplicated authority in the root:

`WINNER CANONICALIZED → LOSER CONSUMERS MIGRATED → CUTOVER → LOSER WRITES DISABLED → LOSER DELETED → ZERO LOSER REFERENCES`.

`LOSING_AUTHORITY_SURVIVES_AFTER_CUTOVER=ROOT_OPEN`.

Never create a third wrapper/mapper/registry to preserve two competing authorities.

## No preservation bias

Do not retain an old internal API, package, directory, wrapper, adapter, route, script, test, config, or generated repair merely to reduce churn. If the canonical target makes it unnecessary, migrate consumers and remove it.

## Root closure gate

```text
CANONICAL_OWNER_PROOF=PASS
CANONICAL_WRITER_PROOF=PASS_OR_NA
COMPLETE_CONSUMER_MIGRATION=PASS
ARTIFACT_DISPOSITIONS_REALIZED=PASS
DIRECTORY_PACKAGE_VERDICTS_REALIZED=PASS
WINNER_LOSER_CUTOVER=PASS_OR_NA
DATA_MIGRATION_READBACK=PASS_OR_NA
CONTRACT_GENERATED_PARITY=PASS_OR_NA
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS_REEXPORTS=0
OLD_ROUTES_CONFIG_SCRIPT_WORKFLOW_REFS=0
OLD_NAME_PATH_REFS=0
OLD_RUNTIME_REACHABILITY=0
LOSING_AUTHORITIES_REMAINING=0
SUPERSEDED_STRUCTURE_DELETED=YES
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
FILE_LEVEL_FINISHING=PASS
DIRECTORY_PACKAGE_FINISHING=PASS
TARGETED_VERIFICATION=PASS
NEGATIVE_SPACE=PASS
AFFECTED_CONE_EVIDENCE_DEBT=0
```

A structural replacement/duplication root that removes no losing structure triggers mandatory `CLOSURE_SUSPICION` and re-audit before closure.

## Exact-HEAD lock

Immediately before commit/push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false: `FETCH → COMPARE → INVALIDATE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

Never force-push unseen work.
