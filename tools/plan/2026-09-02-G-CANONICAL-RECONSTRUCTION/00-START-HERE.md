# 00 — START HERE: `g` CANONICAL RECONSTRUCTION

## Mission

Reconstruct isolated branch `g` into the smallest correct canonical structure that preserves required Product/System/Data truth and eliminates unjustified inherited structure.

```text
TARGET_BRANCH=g
SCOPE=ALL_MATERIAL_TRACKED_CONTENT_ON_G_ONLY
OTHER_BRANCHES=OUT_OF_SCOPE
PR=FORBIDDEN
MERGE=FORBIDDEN
AUTO_SYNC=FORBIDDEN
PERIODIC_REBASE=FORBIDDEN
FORCE_PUSH=FORBIDDEN
MATERIAL_MUTATION_AUTHORITY=ONE
```

## Authority model

```text
PRODUCT_SYSTEM_DATA_TRUTH=CANONICAL_CORRECTNESS_AUTHORITY
G_RECONSTRUCTION_PLAN=CAMPAIGN_SEQUENCE_DRIVER
ORCHESTRATOR=CROSS_CUTTING_INVARIANTS_ONLY
TRUSTED_CI_TESTS_SCANNERS=EXACT_SHA_EVIDENCE_ONLY
HISTORICAL_PLANS_FINDINGS=EVIDENCE_AND_FALSIFICATION_ONLY
```

The orchestrator does not own pre-census objective discovery, AUTO/NEXT selection, historical-root scheduling, or pre-census root ranking in this campaign.

## Supreme doctrine

```text
PRESERVE REQUIRED TRUTH.
RECONSTRUCT REQUIRED STRUCTURE.
ELIMINATE EVERYTHING ELSE.
```

`CURRENT EXISTENCE DOES NOT CREATE A PRESUMPTION TO KEEP.`

Every tracked artifact starts as `DEFAULT_DISPOSITION=UNJUSTIFIED_UNTIL_PROVEN`.

Allowed final dispositions:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | DELETE_NOW | BOUNDED_RETIREMENT`.

There is no final `UNKNOWN`, `NOT_REVIEWED`, `MAYBE`, `LATER`, `KEEP_JUST_IN_CASE`, `HISTORICAL_KEEP`, or permanent temporary state.

## P0 — destructive canonicalization / elimination mandate

```text
ONE MATERIAL MEANING
→ ONE CANONICAL OWNER
→ ONE CANONICAL WRITER
→ ONE CANONICAL CONTRACT/STORAGE TRUTH WHERE APPLICABLE
→ DERIVED CONSUMERS ONLY
→ ZERO LOSING AUTHORITY
→ ZERO MATERIAL RESIDUE
```

Any proven duplicate/parallel/shadow authority requires winner/loser treatment. `LOSING_AUTHORITY_SURVIVES_AFTER_CUTOVER=ROOT_OPEN`.

## Fast garbage deletion law

Deletion ceremony is proportional to risk.

If a line/symbol/file/directory/package/script/workflow/dependency/test artifact is proven unused, unconsumed, unreachable, non-authoritative, not required by the current product/system, and has no state/contract/runtime/security/migration responsibility, delete it immediately.

```text
PROVEN_UNUSED_AND_NOT_REQUIRED=DELETE_NOW
PROVEN_LOW_RISK_GARBAGE=DELETE_NOW
NO_KEEP_JUST_IN_CASE
NO_DEFERRED_GARBAGE_BACKLOG
```

Fast path:

```text
PROVE NO REQUIRED PURPOSE
→ QUICK IMPORT/CALLER/CONSUMER/REACHABILITY CHECK
→ DELETE_NOW
→ SEARCH REFERENCES AGAIN
→ RUN AFFECTED VERIFICATION
```

No migration plan, compatibility layer, archive folder, or separate structural Root is required for proven low-risk garbage.

Escalate only when the artifact can carry persisted data, mutable authority, external contract, runtime routing, security semantics, generated lineage, supported migration/upgrade behavior, or a required consumer.

## Pre-mutation baseline and the single exception

Structural, semantic, ownership, schema, contract, runtime, migration, rename/rehome, and root-correct mutations remain forbidden until the complete baseline passes.

The **only** pre-baseline mutation exception is `FAST_GARBAGE_ELIMINATION` for artifacts that meet the low-risk `DELETE_NOW` proof above.

```text
PRE_BASELINE_STRUCTURAL_MUTATION=FORBIDDEN
PRE_BASELINE_FAST_GARBAGE_DELETE_NOW=ALLOWED
```

When multiple nearby garbage findings are proven together, remove them in one coherent fast-cleanup checkpoint rather than one commit per line. After the batch:

`SEARCH AGAIN → AFFECTED VERIFY → COMMIT/PUSH g → VERIFY REMOTE SHA → RE-PIN → REFRESH AFFECTED CENSUS`.

Because this lane deletes only proven non-authoritative/non-required artifacts, it does not require Root Graph selection. If deletion reveals semantic or structural change, immediately stop the fast lane and return to the complete baseline.

## Mandatory branch-wide reconstruction baseline

Before the first non-garbage structural mutation, all stages must pass on one exact pinned `g` SHA:

```text
STEP 0  PIN EXACT LIVE g
STEP 1  FULL TRACKED-TREE CENSUS
STEP 2  SEMANTIC AUTHORITY CENSUS
STEP 3  ARTIFACT RIGHT-TO-EXIST + DISPOSITION LEDGER
STEP 4  DIRECTORY/PACKAGE RESPONSIBILITY VERDICTS
STEP 5  BUILD COMPLETE CURRENT g
STEP 6  DEFINE COMPLETE CANONICAL g
STEP 7  IDENTIFY WINNING/LOSING AUTHORITIES
STEP 8  COMPUTE COMPLETE CURRENT→CANONICAL STRUCTURAL DELTA
STEP 9  SYNTHESIZE/RANK TRUE CAUSAL ROOTS
STEP 10 SELECT HIGHEST PROVEN EXECUTABLE STRUCTURAL ROOT
ONLY THEN FIRST STRUCTURAL/SEMANTIC ROOT MUTATION
```

The baseline fails if any in-scope material artifact or boundary remains `UNREVIEWED`, `UNDISPOSITIONED`, or unknown in a way that can change owner, writer, target topology, migration direction, deletion safety, or root ranking.

## No preservation bias

Never retain wrong structure because of smaller diff, familiar path, existing internal API, compatibility just-in-case, possible future use, cost of renaming imports, or fear of deleting many files.

## Structural rewrite escalation

If three or more signals cluster around one responsibility—duplicate owners/writers/mappings, wrappers, parallel directories, conflicting defaults, multiple config sources, duplicated state logic, generated/manual repairs, repeated patches, unbounded compatibility—escalate from local repair to structural-root investigation.

`STOP PATCHING DESCENDANTS → RECONSTRUCT ROOT` when a common structural root is proven.

## High-risk topology zones

`core/**` and `shared/**` require heightened justification; non-cross-cutting domain truth must be rehomed.

`infra/**`, `tools/**`, `.github/**`, scripts, workflows, runtime/config, tests, fixtures, mocks, and dependencies are first-class structural surfaces and receive the same owner/writer/purpose/reachability/disposition treatment as product code.

## Exact-HEAD and CI law

Before every material push require `EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`. Never force-push unseen work.

After each material push obtain trusted Exact-HEAD CI evidence. CI is evidence only.

`CI_FAILURE != EXECUTION_ROOT` and `GREEN_CI != CLOSED`.

## Closure suspicion

A structural replacement/duplication/ownership root that removes no losing writer/path/file/directory/wrapper triggers `CLOSURE_SUSPICION` unless evidence proves no losing structure existed.

## Final success meaning

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
LOSING_AUTHORITIES_REMAINING=0
PARALLEL_TRUTHS=0
SHADOW_AUTHORITIES=0
DUPLICATE_MUTABLE_WRITERS=0
PROVEN_LOW_RISK_GARBAGE_REMAINING=0
REACHABLE_SUPERSEDED_STRUCTURE=0
MISLEADING_NAMES_PATHS=0
KNOWN_NONCANONICAL_TOPOLOGY=0
MATERIAL_DEAD_STALE_OBSOLETE_RESIDUE=0
UNBOUNDED_COMPATIBILITY=0
FINAL_CURRENT_CANONICAL_STRUCTURAL_DELTA=0_UNRESOLVED_MATERIAL_ITEMS
```

Only then may `G_RADICAL_CLEANUP_COMPLETE` be emitted.
