# H Dynamic Refoundation Campaign Playbook

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: campaign traversal, interrupted-unit reconstruction and selection of the highest correct mutation unit. It does not create AUTO/NEXT queues, session-sized objectives, or bug-chasing order.

## 1. Campaign unit is dynamic

The campaign is not forced to execute one file, one bug, one service, or one root at a time.

Choose the highest causally complete and safely executable unit that removes the most proven noncanonical structure while preserving required truth.

Allowed unit shapes:

```text
WHOLE REPOSITORY STRUCTURAL PASS
TOP-LEVEL SURFACE
DOMAIN
SERVICE
CAPABILITY/JOURNEY
PACKAGE FAMILY
DIRECTORY SUBTREE
FILE/SYMBOL CLUSTER
DATABASE OWNERSHIP MODEL
MIGRATION EPOCH
CONTRACT/GENERATED LINEAGE
RUNTIME/CONFIG/INFRA SURFACE
ASSURANCE/CI CONTROL PLANE
GOVERNANCE/TOOLS/DOCS AUTHORITY SURFACE
SINGLE CAUSAL ROOT
```

```text
EXECUTION_UNIT != SESSION_SIZE
EXECUTION_UNIT != SMALLEST_DIFF
EXECUTION_UNIT != FIRST_ERROR
```

## 2. Selection criterion

Prefer the candidate that maximizes:

```text
STRUCTURAL_LEVERAGE
CANONICAL_OWNERSHIP_CORRECTION
PARALLEL_TRUTH_COLLAPSE
LOSING_CONTAINER_DELETION
COMPENSATION_LAYER_REMOVAL
END_TO_END_PARITY_RESTORATION
ADMISSION_HOLE_CLOSURE
FUTURE_COMPLEXITY_REDUCTION
```

while retaining a safe, complete migration/cutover path.

Do not choose a smaller candidate merely because it is easier to explain or faster to patch.

## 3. Wide discovery, decisive mutation

At every normal cycle after interrupted-execution state has been recovered or absence of an open unit has been proven:

```text
1. PIN EXACT h
2. RUN WIDE READ-ONLY CENSUS ACROSS MATERIAL SURFACES
3. REFRESH CURRENT/CANONICAL/DELTA
4. REBUILD CAUSAL ROOT GRAPH
5. SYNTHESIZE CANDIDATE EXECUTION UNITS
6. SELECT HIGHEST CORRECT SAFE UNIT
7. DECLARE COMPLETE CAUSAL CONE
8. SALVAGE REQUIRED VALUE
9. REFOUND / MIGRATE / CUT OVER
10. DELETE LOSERS AT HIGHEST SAFE GRANULARITY
11. PRUNE UPWARD
12. REFOUND ADMISSION/PREVENTION
13. VERIFY + FALSIFY ON EXACT h
14. RE-PIN
15. RE-DIAGNOSE + RE-RANK
```

No static queue survives architectural change without revalidation.

## 3.1 Interrupted-session causal reconstruction

The recovery gate in `00` runs before normal candidate selection on every new or resumed execution session.

Reconstruct execution state from the authority defined by `01`; do not infer it from commit titles or chat continuity.

For each material commit required to reconstruct the frontier, inspect as applicable:

```text
PARENTS
ACTUAL PATCH/DIFF
CHANGED PATHS
ADDITIONS/DELETIONS
MOVES/RENAMES
AUTHORITY/WRITER CHANGES
READER/CONSUMER CHANGES
SCHEMA/MIGRATION CHANGES
CONTRACT/GENERATED-LINEAGE CHANGES
RUNTIME/CONFIG/INFRA CHANGES
ADMISSION/VERIFICATION CHANGES
```

Then attribute the material change to the causal execution unit it serves.

```text
COMMIT != ROOT
COMMIT != EXECUTION_UNIT
MULTIPLE_COMMITS_MAY_BELONG_TO_ONE_EXECUTION_UNIT
ONE_COMMIT_MAY_IMPLEMENT_MULTIPLE_SUBSTEPS_OF_ONE_CAUSAL_UNIT
COMMIT_MESSAGE_IS_NOT_CAUSAL_CLASSIFICATION
```

Do not turn commit history into a replacement bug queue. History reconstructs execution progress; the live causal model determines current canonical obligations.

### Ephemeral recovery model

During recovery maintain only an in-session model sufficient to resume safely:

```text
PINNED_H_SHA
OBSERVED_HISTORY_RANGE
LAST_PROVEN_CLOSED_UNIT
ACTIVE_OPEN_UNIT
ACTIVE_UNIT_COMMITS
PROVEN_COMPLETED_OBLIGATIONS
OPEN_OBLIGATIONS
UNKNOWN_OBLIGATIONS
CANONICAL_OWNER_STATE
MIGRATION_STATE
CUTOVER_STATE
LOSER_DELETION_STATE
PRUNING_STATE
ADMISSION_STATE
NEGATIVE_SPACE_STATE
VALID_EVIDENCE
STALE_EVIDENCE
RECOVERY_FRONTIER
```

```text
EPHEMERAL_RECOVERY_MODEL != DURABLE_CAMPAIGN_LEDGER
EPHEMERAL_RECOVERY_MODEL MUST NOT BECOME A SECOND PERSISTED EXECUTION AUTHORITY
```

Git history + live canonical repository + current evidence remain the reconstructable source of execution state.

### Recovery frontier

```text
RECOVERY_FRONTIER =
THE FIRST MATERIAL OBLIGATION OF THE ACTIVE EXECUTION UNIT
THAT IS NOT PROVEN COMPLETE ON CURRENT h
```

Examples of ordered material obligations include, as applicable:

```text
CANONICAL_OWNER_ESTABLISHED
REQUIRED_VALUE_SALVAGED
DATA/CONTRACT_MIGRATION_COMPLETE
CONSUMERS_MIGRATED
CUTOVER_COMPLETE
OLD_WRITES_ZERO
LOSER_DELETED
UPWARD_PRUNING_COMPLETE
ADMISSION_HOLE_CLOSED
NEGATIVE_SPACE_PASS
UNIT_VERIFICATION_PASS
```

Do not repeat earlier subwork that is still proven complete. Do not skip the first unfinished obligation.

### Recovery decision

```text
IF LAST UNIT IS PROVEN CLOSED:
  RETURN TO NORMAL RE-CENSUS / RE-RANK / UNIT SELECTION

IF ACTIVE UNIT IS OPEN:
  RESUME FROM RECOVERY_FRONTIER

IF RECOVERY REVEALS A HIGHER CAUSAL ROOT THAT INVALIDATES THE ACTIVE UNIT MODEL:
  REFRESH THE INVALIDATED MODEL
  → PROMOTE/RE-SYNTHESIZE THE HIGHER UNIT
  → DO NOT PATCH THE LOWER SYMPTOM
```

## 4. Broad surface refoundation is first-class

If `.agents`, `.github`, `.opencodereview`, `docs`, `tools`, `governance` or another surface is proven broadly noncanonical, duplicated or confusing, it may become one execution unit.

Preferred treatment when justified:

```text
EXTRACT UNIQUE REQUIRED VALUE
→ DESIGN MINIMAL CANONICAL SURFACE
→ DELETE NONCANONICAL SUBTREE
→ RECREATE ONLY REQUIRED MATERIAL
→ UPDATE ALL REFERENCES/CONSUMERS
→ FALSIFY OLD-SURFACE ABSENCE
```

Do not create dozens of micro-roots to preserve a bad surface layout.

## 5. Root-ranking signals

Strong signals for a high-priority unit:

```text
MULTIPLE MUTABLE AUTHORITIES
PARALLEL/SHADOW TRUTH
DUPLICATE RESPONSIBILITY TREES
WRONG DOMAIN/SERVICE/PACKAGE OWNER
BAD MIGRATION EPOCH
DUPLICATE CONTRACT/GENERATED LINEAGE
REACHABLE SUPERSEDED RUNTIME
PATCH/BRIDGE/COMPENSATION PATTERN
SYSTEMIC CI/ADMISSION HOLE
CONFLICTING GOVERNANCE/AGENT/TOOL AUTHORITY
HIGH DEFECT-CLUSTER DENSITY
```

A high warning count alone is not ranking proof.

## 6. Execution-ready declaration

Before mutation state compactly:

```text
UNIT_ID
UNIT_SHAPE
CAUSAL_PROOF
CANONICAL_TARGET
VALUE_TO_PRESERVE
LOSING_AUTHORITIES/CONTAINERS
COMPLETE_AFFECTED_CONE
WRITERS/READERS/CONSUMERS
DATA/CONTRACT_MIGRATION
CUTOVER
DELETION/PRUNING
ADMISSION/PREVENTION
VERIFICATION/FALSIFICATION
VALID_BLOCKERS
```

If this cannot be stated, discovery is not execution-ready.

## 7. Large units are not shrunk for convenience

Forbidden shrink reasons:

```text
TOO_MANY_FILES
TOO_MANY_PACKAGES
TOO_MANY_CALLERS
TOO_MUCH_DELETION
TOO_MUCH_MIGRATION
FRONTEND_AND_BACKEND_BOTH_AFFECTED
TOO_LARGE_FOR_ONE_SESSION
```

Use coherent checkpoints while preserving one unit identity and one final canonical cutover.

A checkpoint is never a closed unit while old authority/containers remain reachable.

## 7.1 Partial-cutover preemption law

A partially cut-over execution unit has priority over independent new-root selection.

```text
IF WINNER_EXISTS AND LOSER_REMAINS_REACHABLE:
  EXECUTION_UNIT_STATE=OPEN_CRITICAL

IF SOME_REQUIRED_CONSUMERS_USE_WINNER AND OTHERS_USE_LOSER:
  EXECUTION_UNIT_STATE=OPEN_CRITICAL
```

While `OPEN_CRITICAL`:

```text
NEW_INDEPENDENT_ROOT_SELECTION=FORBIDDEN
```

Resume the current unit through remaining migration, cutover, loser deletion, pruning and proof before moving to an independent root.

The only exception is evidence of a higher causal root that supersedes or invalidates the active unit's design; in that case promote the higher root rather than preserving a bad partial cutover.

```text
NEW_AUTHORITY + REACHABLE_OLD_AUTHORITY != PROGRESS_CLOSURE
NEW_AUTHORITY + REACHABLE_OLD_AUTHORITY = PARALLEL_AUTHORITY_RISK
```

## 8. Independent inherited debt

Wide discovery may expose unrelated roots while another unit is mutating.

Record them in the dynamic graph; do not opportunistically patch them if they overlap or destabilize the active cutover.

This avoids random context switching without reverting to conservative micro-execution.

## 9. Historical sources

Old branches, plans, prompts and defect lists are forensic evidence only.

They may reveal required value or defect clusters, but never dictate current topology, branch integration or execution order.

## 10. Fast garbage lane

Proven low-risk garbage need not wait for a large unit if deletion cannot alter canonical truth or a live contract and does not interrupt an `OPEN_CRITICAL` cutover.

```text
PROVE UNUSED/UNREQUIRED
→ CHECK HIGHEST SAFE GRANULARITY
→ DELETE
→ PRUNE
→ VERIFY
```

If the finding reveals a higher structural root, stop the local lane and promote the higher unit instead.

## 11. Closure output

For every closed unit record only compact evidence:

```text
UNIT_ID
OLD_AUTHORITIES/CONTAINERS_REMOVED
NEW_CANONICAL_AUTHORITY/CONTAINER_SET
MIGRATION/CUTOVER_RESULT
DELETED/PRUNED_STRUCTURE
ADMISSION_HOLE_RESULT
EXACT_H_SHA
VERIFICATION/FALSIFICATION_RESULT
NEW_ROOT_GRAPH_STATE
```

Do not create another durable campaign plan mirroring this state. Git history + live canonical repository + evidence are preferred.

## 12. Fixed point

When the dynamic graph first reaches zero, hand control to `04-VERIFY-REDIAGNOSE-CLOSE.md` for a fresh full-repository recensus from zero.

The first empty graph is only a candidate fixed point.
