# H Dynamic Refoundation Campaign Playbook

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: two-stage campaign traversal, interrupted-unit reconstruction and selection of the highest correct mutation unit. It does not create AUTO/NEXT queues, session-sized objectives, catastrophe checklists or bug-chasing order.

## 1. Campaign architecture is explicitly two-stage

The campaign has two mutation stages after recovery:

```text
STAGE_A — SYSTEMIC BASELINE DECONTAMINATION
STAGE_B — NORMAL DYNAMIC ROOT CLOSURE
```

Purpose:

```text
STAGE_A:
MAKE h CANONICALLY WORTH BUILDING NORMAL ROOT CLOSURE UPON.
REMOVE PROVEN SHARED STRUCTURAL CATASTROPHES THAT WOULD TAX, DISTORT,
BLOCK OR CONTAMINATE MULTIPLE LATER ROOTS.

STAGE_B:
CLOSE THE REMAINING CAUSAL PRODUCT/SYSTEM/DOMAIN/JOURNEY/STRUCTURAL ROOTS
ON TOP OF THE CLEANER VERIFIED FOUNDATION.
```

```text
STAGE_A != FIX_EVERY_LOCAL_DEFECT
STAGE_A != STATIC_CLEANUP_LIST
STAGE_A != WARNING_PURGE
STAGE_B != ALLOWED_WHILE_STAGE_A_GATE_IS_OPEN
```

The campaign is never forced to execute one file, one bug, one service or one root at a time.

## 2. Recovery always precedes stage traversal

Every new or resumed session runs the recovery gate in `00`/`01` before selecting new work.

Reconstruct:

```text
PINNED_H_SHA
ACTIVE_CAMPAIGN_STAGE
LAST_PROVEN_CLOSED_UNIT
ACTIVE_OPEN_UNIT
ACTIVE_UNIT_STAGE
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
STAGE_A_EXIT_STATE
VALID_EVIDENCE
STALE_EVIDENCE
RECOVERY_FRONTIER
```

```text
EPHEMERAL_RECOVERY_MODEL != DURABLE_CAMPAIGN_LEDGER
EPHEMERAL_RECOVERY_MODEL MUST NOT BECOME A SECOND PERSISTED EXECUTION AUTHORITY
```

Git history + live canonical repository + current evidence remain the reconstructable source of execution state.

## 2.1 Interrupted-session causal reconstruction

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

Then attribute the material change to the causal execution unit and campaign stage it serves.

```text
COMMIT != ROOT
COMMIT != CATASTROPHE
COMMIT != EXECUTION_UNIT
MULTIPLE_COMMITS_MAY_BELONG_TO_ONE_EXECUTION_UNIT
ONE_COMMIT_MAY_IMPLEMENT_MULTIPLE_SUBSTEPS_OF_ONE_CAUSAL_UNIT
COMMIT_MESSAGE_IS_NOT_CAUSAL_CLASSIFICATION
```

Do not turn commit history into a replacement bug queue. History reconstructs execution progress; the live causal model determines current canonical obligations.

## 2.2 Recovery frontier

```text
RECOVERY_FRONTIER =
THE FIRST MATERIAL OBLIGATION OF THE ACTIVE EXECUTION UNIT
THAT IS NOT PROVEN COMPLETE ON CURRENT h
```

Examples include, as applicable:

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

## 2.3 Recovery decision and systemic overlay

```text
IF ACTIVE UNIT IS OPEN:
  RUN SYSTEMIC_CATASTROPHE_OVERLAY_CHECK
```

A systemic unit may supersede/preempt the active unit only under the causal authority in `01`:

```text
SYSTEMIC_CAUSE_SUPERSEDES_ACTIVE_MODEL
OR SYSTEMIC_CAUSE_IS_REQUIRED_PREREQUISITE
OR SYSTEMIC_CAUSE_IS_HIGHER_SHARED_CAUSE_OF_ACTIVE_FAILURES
```

If true:

```text
PROMOTE / RE-SYNTHESIZE THE HIGHER SYSTEMIC UNIT
→ PRESERVE CORRECT COMPLETED WORK
→ INVALIDATE WRONG ASSUMPTIONS
→ CONTINUE UNDER STAGE_A
```

Otherwise:

```text
ACTIVE_OPEN_UNIT
→ RESUME FROM RECOVERY_FRONTIER
```

A partial cutover is not abandoned merely because unrelated inherited debt exists.

If no open unit survives recovery:

```text
IF STAGE_A_EXIT_STATE != CURRENT_PASS:
  ENTER / RESUME STAGE_A
ELSE:
  ENTER / RESUME STAGE_B
```

## 3. Stage A — branch-wide systemic baseline decontamination

Stage A begins from the repository-wide census, hostile survival challenge and systemic synthesis owned by `01`/`02`.

Normal Stage-A cycle:

```text
1. PIN EXACT h
2. RUN / REFRESH BRANCH-WIDE MATERIAL CENSUS
3. EXTRACT REQUIRED TRUTH
4. CHALLENGE INHERITED MATERIAL STRUCTURE FOR SURVIVAL
5. REFRESH CURRENT + CANONICAL FOUNDATION + DELTA
6. BUILD / REFRESH SYSTEMIC_CATASTROPHE_GRAPH
7. SYNTHESIZE CANDIDATE SYSTEMIC EXECUTION UNITS
8. RANK BY CROSS-ROOT LEVERAGE / ROOT_TAX REMOVAL / SAFE COMPLETE CUTOVER
9. SELECT HIGHEST CORRECT EXECUTABLE SYSTEMIC UNIT
10. DECLARE COMPLETE SHARED CAUSAL CONE
11. SALVAGE REQUIRED VALUE
12. REFOUND / MIGRATE / CUT OVER
13. DELETE LOSERS AT HIGHEST SAFE GRANULARITY
14. PRUNE UPWARD AND REMOVE COMPENSATION/COMPATIBILITY RESIDUE
15. REFOUND ADMISSION/PREVENTION
16. VERIFY SYSTEMIC NEGATIVE SPACE + FALSIFY
17. RE-PIN
18. RE-CENSUS / RE-SYNTHESIZE / RE-RANK
19. REPEAT UNTIL SYSTEMIC FRONTIER APPEARS EMPTY
20. RUN FRESH ADVERSARIAL STAGE-A RECENSUS
21. APPLY THE FAIL-CLOSED STAGE-A EXIT GATE IN `04`
```

No static catastrophe queue survives architecture change without revalidation.

## 3.1 Stage-A candidate unit shapes

A systemic unit may be very large:

```text
WHOLE REPOSITORY STRUCTURAL PASS
REPOSITORY / WORKSPACE / PACKAGE TOPOLOGY
TOP-LEVEL SURFACE
CROSS-DOMAIN SHARED AUTHORITY
DATABASE OWNERSHIP MODEL
MIGRATION EPOCH
CONTRACT / GENERATED LINEAGE
RUNTIME / CONFIG / INFRA AUTHORITY SURFACE
ASSURANCE / CI CONTROL PLANE
GOVERNANCE / TOOLS / DOCS / AGENT AUTHORITY SURFACE
LARGE HIGH-FAN-IN OBSOLETE SUBTREE
MULTI-SURFACE LEGACY / COMPATIBILITY / COMPENSATION ARCHITECTURE
```

```text
SYSTEMIC_EXECUTION_UNIT != SESSION_SIZE
SYSTEMIC_EXECUTION_UNIT != SMALLEST_DIFF
SYSTEMIC_EXECUTION_UNIT != FIRST_ERROR
```

## 3.2 Stage-A selection criterion

Prefer the proven candidate that maximizes:

```text
TRUTH / DATA / SECURITY RISK REDUCTION
CROSS_ROOT_BLOCKING_POWER REMOVAL
CANONICAL_SHARED_OWNERSHIP_CORRECTION
PARALLEL_TRUTH_COLLAPSE
LOSING_CONTAINER_DELETION
COMPENSATION_LAYER_REMOVAL
DIAGNOSIS_CONTAMINATION_REMOVAL
VERIFICATION_CONTAMINATION_REMOVAL
ROOT_TAX_REMOVAL
FUTURE_COMPLEXITY_REDUCTION
```

while retaining a safe, complete migration/cutover path.

The governing question is:

```text
WHICH PROVEN REFOUNDATION, IF DONE NOW,
MAKES THE LARGEST SET OF FUTURE ROOTS
SMALLER, CLEANER, MORE INDEPENDENT AND EASIER TO CLOSE?
```

Do not choose a smaller candidate merely because it is easier to explain or faster to patch.

## 3.3 Stage-A execution-ready declaration

Before systemic mutation state compactly:

```text
UNIT_ID
UNIT_STAGE=STAGE_A
CATASTROPHE_ID
CAUSAL_PROOF
AFFECTED_ROOT_FAMILIES
SHARED_SUBSTRATE
ROOT_TAX
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

## 3.4 Stage-A exit is a gate, not a judgment call

Stage A ends only when `04` proves the current exact `h` passes its dedicated exit gate.

```text
SYSTEMIC_GRAPH_APPEARS_EMPTY != STAGE_A_PASS
```

Required transition:

```text
SYSTEMIC_FRONTIER_APPEARS_EMPTY
→ FRESH ADVERSARIAL BRANCH-WIDE RECENSUS
→ STAGE_A_EXIT_GATE
→ PASS
→ ONLY THEN STAGE_B
```

If the recensus exposes another executable systemic catastrophe, return to Stage-A execution. Do not waive it because many systemic units were already closed.

## 4. Stage B — normal dynamic root closure

Only after current Stage-A PASS, rebuild the normal causal Root Graph on the cleaner baseline.

Normal Stage-B cycle:

```text
1. PIN EXACT h
2. REFRESH CURRENT/CANONICAL/DELTA
3. REBUILD NORMAL CAUSAL ROOT GRAPH
4. SYNTHESIZE CANDIDATE STAGE-B EXECUTION UNITS
5. SELECT HIGHEST CORRECT SAFE UNIT
6. DECLARE COMPLETE CAUSAL CONE
7. SALVAGE REQUIRED VALUE
8. REFOUND / MIGRATE / CUT OVER
9. DELETE LOSERS AT HIGHEST SAFE GRANULARITY
10. PRUNE UPWARD
11. REFOUND ADMISSION/PREVENTION
12. VERIFY + FALSIFY ON EXACT h
13. RE-PIN
14. RE-DIAGNOSE + RE-RANK
```

Allowed Stage-B unit shapes include:

```text
TOP-LEVEL SURFACE
DOMAIN
SERVICE
CAPABILITY/JOURNEY
PACKAGE FAMILY
DIRECTORY SUBTREE
FILE/SYMBOL CLUSTER
DATABASE OWNERSHIP UNIT
CONTRACT/GENERATED UNIT
RUNTIME/CONFIG UNIT
ASSURANCE UNIT
SINGLE CAUSAL ROOT
```

Do not force a service-by-service, file-by-file or bug-by-bug sequence when a broader causal cutover is cleaner and faster.

## 4.1 Stage-B selection criterion

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

while retaining a safe complete migration/cutover path.

## 4.2 Stage-B systemic regression law

If Stage-B discovery proves a new executable systemic catastrophe:

```text
STAGE_A_EXIT_STATE = INVALIDATED_OR_STALE
```

If no unit is open, return immediately to Stage A.

If a Stage-B unit is open, apply the systemic preemption law in `01`:

```text
IF SYSTEMIC CAUSE SUPERSEDES / PREREQUISITES / PARENTS ACTIVE UNIT:
  PROMOTE TO STAGE_A SYSTEMIC UNIT
ELSE:
  FINISH OPEN_CRITICAL CUTOVER FIRST
  → THEN RETURN TO STAGE_A BEFORE SELECTING A NEW STAGE-B ROOT
```

Normal independent Stage-B root selection is forbidden until Stage-A qualification is restored.

## 5. Broad surface refoundation is first-class

If `.agents`, `.github`, `.opencodereview`, `docs`, `tools`, `governance` or another surface is proven broadly noncanonical, duplicated or confusing, it may become one systemic or normal execution unit depending on blast radius.

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

## 6. Large units are not shrunk for convenience

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

Use coherent checkpoints while preserving one unit identity, stage and final canonical cutover.

A checkpoint is never a closed unit while old authority/containers remain reachable.

## 7. Partial-cutover preemption law

A partially cut-over execution unit has priority over independent work except for the proven higher systemic supersession conditions owned by `01`.

```text
IF WINNER_EXISTS AND LOSER_REMAINS_REACHABLE:
  EXECUTION_UNIT_STATE=OPEN_CRITICAL

IF SOME_REQUIRED_CONSUMERS_USE_WINNER AND OTHERS_USE_LOSER:
  EXECUTION_UNIT_STATE=OPEN_CRITICAL
```

While `OPEN_CRITICAL`:

```text
NEW_INDEPENDENT_UNIT_SELECTION=FORBIDDEN
```

Resume through remaining migration, cutover, loser deletion, pruning and proof before moving to an independent unit.

```text
NEW_AUTHORITY + REACHABLE_OLD_AUTHORITY != PROGRESS_CLOSURE
NEW_AUTHORITY + REACHABLE_OLD_AUTHORITY = PARALLEL_AUTHORITY_RISK
```

## 8. Independent inherited debt

Wide discovery may expose unrelated Stage-A or Stage-B debt while another unit is mutating.

Record it in the appropriate dynamic graph; do not opportunistically patch it if it overlaps or destabilizes the active cutover.

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

If the finding reveals a higher systemic structural cause, stop the local lane and promote the cause instead.

Fast garbage deletion does not satisfy Stage-A systemic decontamination by itself.

## 11. Closure output

For every closed unit record only compact evidence:

```text
UNIT_STAGE
UNIT_ID
CATASTROPHE_ID_OR_ROOT_ID
OLD_AUTHORITIES/CONTAINERS_REMOVED
NEW_CANONICAL_AUTHORITY/CONTAINER_SET
MIGRATION/CUTOVER_RESULT
DELETED/PRUNED_STRUCTURE
ADMISSION_HOLE_RESULT
EXACT_H_SHA
VERIFICATION/FALSIFICATION_RESULT
SYSTEMIC_GRAPH_OR_ROOT_GRAPH_STATE
```

Do not create another durable campaign plan mirroring this state. Git history + live canonical repository + evidence are preferred.

## 12. Fixed point

Stage A first reaches a candidate empty systemic frontier, then must pass the fresh Stage-A gate in `04` before Stage B can begin.

When the Stage-B dynamic Root Graph first reaches zero, hand control to `04-VERIFY-REDIAGNOSE-CLOSE.md` for a fresh full-repository adversarial recensus from zero.

```text
FIRST_EMPTY_SYSTEMIC_GRAPH != STAGE_A_PASS
FIRST_EMPTY_STAGE_B_ROOT_GRAPH != LEVEL_4_COMPLETE
```

Only `04` qualifies either transition.