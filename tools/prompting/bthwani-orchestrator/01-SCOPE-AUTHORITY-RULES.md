# H Refoundation Scope and Authority Rules

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: branch authority, repository-wide mutation scope, hostile survival law, structural-garbage survival prohibition, truth reconciliation, forensic-source use, exact-head discipline, execution recovery, A0/A1/A2/B stage authority, deferral authority, preemption authority, execution-unit boundaries and artifact survival.

## 1. Branch law

```text
MUTABLE_REFOUNDATION_AUTHORITY=h
```

`h` is the only mutable refoundation branch. It is not a feature/integration/PR branch.

```text
PR_FROM_h=FORBIDDEN
PR_TO_h=FORBIDDEN
MERGE_INTO_h=FORBIDDEN
MERGE_FROM_h=FORBIDDEN
REBASE_h_ON_OTHER_BRANCH=FORBIDDEN
AUTO_SYNC_h=FORBIDDEN
FORCE_PUSH_h=FORBIDDEN
BLIND_CHERRY_PICK_OF_OLD_STRUCTURE=FORBIDDEN
```

Normal fast-forward commits directly to `h` are authorized. No branch protection/ruleset is required for this campaign.

## 2. Historical branches are forensic only

All old refs, including `master`, `g`, `ocr`, `f` and feature/history branches, may be read only to recover or falsify facts.

Allowed:

```text
COMPARE
TRACE HISTORY
RECOVER PROVEN REQUIRED VALUE
UNDERSTAND DATA/CONTRACT HISTORY
FALSIFY CURRENT ASSUMPTIONS
EXAMINE REMOVED CAPABILITIES
```

Forbidden:

```text
OLD_BRANCH == BASELINE
OLD_BRANCH == CANONICAL_TRUTH
OLD_BRANCH == INTEGRATION_SOURCE
OLD_BRANCH_TOPOLOGY == PRESERVATION_REQUIREMENT
```

Recovered value must re-earn canonical status and be placed under the new canonical owner. Do not revive historical containers merely to recover behavior.

## 3. Truth reconciliation law

No inherited representation becomes automatic truth merely because it exists, compiles, executes, is documented or is tested.

```text
GOVERNANCE != AUTOMATIC_TRUTH
CODE != AUTOMATIC_TRUTH
RUNTIME != AUTOMATIC_TRUTH
DATABASE_SHAPE != AUTOMATIC_PRODUCT_TRUTH
TESTS != AUTOMATIC_TRUTH
CI_GREEN != AUTOMATIC_TRUTH
TOOL_FINDING != AUTOMATIC_ROOT_CAUSE
OLD_BRANCH != AUTOMATIC_TRUTH
CURRENT_SCREEN/API/PATH != AUTOMATIC_CANONICAL_TARGET
```

Keep evidence classes distinct:

```text
EXPLICIT_CURRENT_HUMAN_INTENT
REQUIRED_PRODUCT/SEMANTIC_TRUTH
CANONICAL_OWNERSHIP/WRITE_AUTHORITY
DATA_TRUTH
CONTRACT_TRUTH
IMPLEMENTATION_TRUTH
RUNTIME_TRUTH
REPOSITORY_PLATFORM_TRUTH
SECURITY/FINANCIAL_INVARIANTS
EXTERNAL_TECHNICAL_EVIDENCE
FORENSIC/HISTORICAL_SUPPORT
```

Canonical truth is reconstructed from the strongest consistent current evidence and first-principles ownership model. Contradictions trigger diagnosis; they are never resolved by blindly preferring current shape.

## 4. Exact-head discipline

Before every coherent mutation batch:

```text
RESOLVE REMOTE h
→ RECORD EXPECTED_REMOTE_H_SHA
→ DIAGNOSE AGAINST THAT SHA
```

Immediately before write:

```text
RESOLVE ACTUAL_REMOTE_H_SHA
```

If it differs:

```text
STOP WRITE
→ INSPECT DELTA
→ INVALIDATE AFFECTED EVIDENCE
→ RE-PIN
→ RE-DIAGNOSE
```

Never overwrite unseen work. Never force. After every push verify remote `h` and re-pin.

## 4.1 Execution-recovery authority

```text
EXECUTION_RECOVERY_AUTHORITY =
LIVE_REMOTE_h
+ COMMIT_GRAPH
+ MATERIAL_COMMIT_DIFFS
+ CURRENT_LIVE_TREE
+ CURRENT_REFERENCES/REACHABILITY
+ NONSTALE_EVIDENCE
```

Non-authoritative aids only:

```text
CHAT_CONTEXT
AGENT_MEMORY
LAST_ERROR_MESSAGE
COMMIT_MESSAGE
OLD_BRANCH
```

A commit title may guide discovery but never proves causal ownership or closure. Inspect actual diffs and current reachability.

Recovery reconstructs:

```text
ACTIVE_CAMPAIGN_STAGE = STAGE_A0_HOSTILE_TRIAGE | STAGE_A1_DESTRUCTIVE_REFOUNDATION | STAGE_A2_ADVERSARIAL_QUALIFICATION | STAGE_B_NORMAL_ROOT_CLOSURE
STAGE_A0_ADMISSION_STATE
STAGE_A2_EXIT_STATE
ACTIVE_OPEN_UNIT
ACTIVE_UNIT_STAGE
EXECUTION_UNIT_STATE
RECOVERY_FRONTIER
```

```text
HEAD_MOVED != START_OVER
HEAD_MOVED != IGNORE_DELTA
```

## 4.2 Open-unit states and preemption

An open unit is classified as exactly one of:

```text
OPEN_CRITICAL
OPEN_SAFE_CHECKPOINT
```

`OPEN_CRITICAL` applies when abandoning the current unit would leave material transitional risk, including as applicable:

```text
WINNER_AND_LOSER_BOTH_REACHABLE
PARTIAL_DATA_MIGRATION
MIXED_OLD_NEW_WRITERS
MIXED_OLD_NEW_CONSUMERS
PARTIAL_RUNTIME_CUTOVER
PARTIAL_CONTRACT_OR_GENERATED_CUTOVER
SECURITY/FINANCIAL/EXTERNAL_CONSUMER_TRANSITION
```

While `OPEN_CRITICAL`, preemption is allowed only when the higher pre-root catastrophe:

```text
SUPERSEDES_ACTIVE_UNIT_CANONICAL_MODEL
OR IS_REQUIRED_PREREQUISITE_OF_ACTIVE_UNIT
OR IS_HIGHER_CAUSE_OF_ACTIVE_UNIT_MATERIAL_FAILURES
```

`OPEN_SAFE_CHECKPOINT` means current `h` is coherent, no dangerous dual authority/partial cutover survives, and the unit can safely pause. A proven dominant higher-leverage pre-root catastrophe may preempt an `OPEN_SAFE_CHECKPOINT` after re-ranking under `02`/`05`.

```text
STARTED_FIRST != PERMANENT_PRIORITY
SAFE_CHECKPOINT + DOMINANT_HIGHER_BASELINE_CATASTROPHE => PREEMPT_ALLOWED
```

This law prevents both unsafe context switching and conservative attachment to a lower-value unit.

## 5. Absolute repository scope and accounting burden

Every tracked artifact on `h` is accounted by default.

```text
TRACKED_ARTIFACT_DEFAULT=ACCOUNT_REQUIRED
NONMATERIAL=POSITIVE_PROOF_REQUIRED
```

Scope includes every tracked line/symbol/file/directory/package/workspace/service/domain/database object/migration/contract/generated output/runtime/config/infra artifact/frontend artifact/test/fixture/mock/workflow/tool/doc/governance/agent/dependency/lockfile/topology element.

At minimum explicitly cover:

```text
PRODUCT / ACTORS / JOURNEYS / STATES / TRANSITIONS
DATABASE / SCHEMA / TABLE / COLUMN / INDEX / CONSTRAINT / POLICY
MIGRATION / SEED / BACKFILL / BOOTSTRAP
DOMAIN / SERVICE / USE CASE / HANDLER / REPOSITORY / JOB
API / ROUTE / EVENT / WEBHOOK / COMMAND
CONTRACT / DTO / ENUM / GENERATED TYPE / CLIENT / BINDING
FRONTEND DATA / STORE / CACHE / HOOK / VIEW MODEL
COMPONENT / SCREEN / NAVIGATION / FORM / UX STATE
core/** / shared/** / services/** / packages/** / apps/**
runtime/** / config/** / infra/**
.agents/** / .github/** / .opencodereview/**
docs/** / tools/** / governance/**
tests/** / fixtures/** / mocks/** / snapshots/**
DEPENDENCIES / WORKSPACES / LOCKFILE / REPOSITORY TOPOLOGY
```

No path/name/category has preservation immunity. Sampling cannot satisfy branch-wide coverage.

## 6. Hostile-inheritance survival law

```text
CURRENT_CONTAINER_DEFAULT=DOES_NOT_SURVIVE_UNLESS_PROVEN_CANONICAL
```

A surviving tracked container must prove, as applicable:

```text
REQUIRED=TRUE
SEMANTICS_CORRECT=TRUE
UNIQUE_COHESIVE_RESPONSIBILITY=TRUE
CANONICAL_OWNER=TRUE
CANONICAL_WRITER_OR_DERIVED_ROLE=TRUE
CANONICAL_LOCATION=TRUE
CANONICAL_BOUNDARY=TRUE
NON_DUPLICATIVE=TRUE
NON_SHADOW=TRUE
NO_BETTER_CONSOLIDATION=TRUE
NO_OBSOLETE_COMPATIBILITY=TRUE
REQUIRED_BY_CANONICAL_BASELINE=TRUE
```

High-level dispositions are exactly:

```text
KEEP_PROVEN
PRESERVE_AND_REWIRE
REFOUND
MIGRATE_VALUE_THEN_DELETE
DELETE
BLOCKED_UNKNOWN
```

`BLOCKED_UNKNOWN` blocks dependent selection/closure; it never means keep just in case.

## 6.1 Known-garbage survival prohibition

This is a supreme structural law:

```text
KNOWN_GARBAGE_SURVIVAL=FORBIDDEN
KNOWN_LOSING_CONTAINER_SURVIVAL=FORBIDDEN
KNOWN_STRUCTURAL_DEFECT_SURVIVAL=FORBIDDEN_EXCEPT_ACTIVE_SAFE_MIGRATION_DEPENDENCY
```

The following are transitional discovery states only and never treatment/closure:

```text
FOUND
CLASSIFIED
MAPPED
CLUSTERED
ASSIGNED_TO_ROOT
DOCUMENTED
RECORDED
DEFERRED
```

```text
MAPPED != TREATED
CLASSIFIED != TREATED
CLUSTERED != TREATED
ASSIGNED_TO_ROOT != TREATED
```

A proven loser may remain temporarily only while required truth is being extracted or while it is a proven necessary dependency of an active safe migration/cutover. The moment its last required dependency ends:

```text
DELETE_NOW_AT_HIGHEST_SAFE_CANONICAL_GRANULARITY
```

Forbidden stable outcomes:

```text
COLLECT_GARBAGE_IN_NEW_CONTAINER
MOVE_GARBAGE_WITHOUT_ELIMINATING_RESPONSIBILITY
RENAME_GARBAGE_AS_CLEANUP
MERGE_LOSERS_INTO_NEW_SHARED_DUMP
BEAUTIFY_NONCANONICAL_CONTAINER
ARCHIVE_LOSER
LEGACY_JUST_IN_CASE
CLEANUP_BACKLOG_FOR_PROVEN_LOSER
```

## 6.2 Stage-B deferral requires isolation proof

A known defect or artifact may be deferred from pre-root structural refoundation to Stage B only if all applicable isolation claims are positively proven:

```text
SURVIVING_CONTAINER_IS_CANONICAL
NO_BAD_PARENT_CONTAINER
NO_WRONG_PACKAGE/SERVICE/DOMAIN_BOUNDARY
NO_CROSS_ROOT_AUTHORITY
NO_SHARED_MUTABLE_WRITER
NO_SHARED_RUNTIME_OR_CONFIG_EFFECT
NO_REPOSITORY_TOPOLOGY_EFFECT
NO_DATABASE_OWNERSHIP_OR_MIGRATION_EPOCH_EFFECT
NO_CONTRACT_OR_GENERATED_LINEAGE_EFFECT
NO_VERIFICATION_OR_DIAGNOSIS_CONTAMINATION
NO_HIGH_FAN_IN_COMPENSATION
NO_PARALLEL_OR_SHADOW_TRUTH
NO_COMPATIBILITY_OR_LEGACY_STRUCTURAL_DEBT
NO_PARENT_PRE_ROOT_BASELINE_CATASTROPHE
NO_MATERIAL_ROOT_TAX
NO_STRUCTURAL_DEMOLITION_TARGET_ABOVE_IT
```

If any applicable claim is false or unknown, Stage-B deferral is forbidden.

```text
STAGE_B_IS_NOT_A_GARBAGE_DUMP
```

## 6.3 Ranking-relevant unknown law

If an unresolved unknown can materially change which pre-root catastrophe dominates, lower candidate mutation is forbidden until the unknown is resolved or proven non-ranking-changing.

```text
RANKING_RELEVANT_UNKNOWN
→ RESOLVE_OR_PROVE_NONDOMINANT
→ THEN_SELECT
```

Do not attack the easiest understood catastrophe while a potentially higher foundational catastrophe remains materially unknown.

## 7. Used does not mean canonical

```text
USED != CANONICAL
HAS_CALLERS != DESERVES_TO_EXIST
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
```

A heavily used wrong authority is migrated and deleted; caller count is not preservation proof.

## 8. Dynamic mutation authority

The orchestrator may execute the highest correct safe unit from line/symbol through repository topology and may:

```text
DELETE
REWRITE
RESTRUCTURE
REMODEL
REHOME
MOVE
RENAME
MERGE
SPLIT
COLLAPSE
CONSOLIDATE
REGENERATE
MIGRATE
BACKFILL
RECONCILE
CUT OVER
DECOMMISSION
REBUILD
DELETE WHOLE SUBTREE
DELETE WHOLE LOSING SURFACE
RECREATE MINIMAL CANONICAL SUBTREE
RECREATE MINIMAL CANONICAL SURFACE
```

There is no minimal-diff, minimal-file-count, current-path or inherited-container preservation requirement.

## 9. Surface/subtree death test

For every suspect surface/container ask:

```text
DOES IT OWN UNIQUE REQUIRED CANONICAL VALUE?
IS ITS CURRENT BOUNDARY ITSELF CANONICAL?
DOES IT DUPLICATE/CONFLICT WITH ANOTHER AUTHORITY?
DOES IT EXIST MAINLY TO COMPENSATE FOR HISTORICAL DEFECTS?
DOES IT CAUSE EXECUTION CONFUSION OR PARALLEL TRUTH?
CAN REQUIRED VALUE BE SALVAGED INTO A STRONGER OWNER?
WOULD DELETE→MINIMAL-RECREATE REMOVE MORE PROVEN DEBT THAN IN-PLACE REPAIR?
```

If the container itself is structurally invalid, in-place preservation requires rebuttal proof under `03`; otherwise refoundation is mandatory.

## 10. Safety boundaries

Aggressive structural authority never permits blind destruction of:

```text
IRREVERSIBLE DURABLE DATA
EXTERNAL LIVE CONSUMER CONTRACTS
SECURITY/TRUST
FINANCIAL STATE
MIGRATION/CUTOVER
GENERATED LINEAGE
LIVE RUNTIME
```

For these, preserve required truth first, prove migration/cutover, then delete the loser.

```text
SAFETY = EXECUTABILITY GATE
SAFETY != SMALLER_UNIT_PREFERENCE
```

If a higher candidate is safe and executable, a lower candidate cannot win merely because it is easier.

## 11. Single execution-session law

```text
ACTIVE_EXECUTION_SESSIONS=1
PARALLEL_MUTATING_SESSIONS=FORBIDDEN
PARALLEL_EXECUTION_AGENTS=FORBIDDEN
MAX_ACTIVE_OVERLAPPING_MATERIAL_MUTATION_UNITS=1
```

Read-only discovery should use maximum-safe parallelism when it materially improves census speed without creating competing authority.

```text
SINGLE_SESSION != SMALL_CHANGE
SINGLE_SESSION != SERIAL_BUG_CHASING
SINGLE_SESSION = ONE_DECISION_AND_MUTATION_AUTHORITY
```

Do not shrink a canonical cutover for token count, session length, file count or cross-layer breadth.

## 12. GitHub Actions authority

On `h`, GitHub Actions may be created, rewritten, dispatched or deleted as needed. Persistent workflows survive only with unique durable assurance. Campaign-only workflows disappear when their evidence role ends. PR/default/old-branch assumptions are not `h` authority.

## 13. Precedence

```text
CURRENT EXPLICIT HUMAN INTENT
→ THIS ORCHESTRATOR PACKAGE
→ REQUIRED PRODUCT/SYSTEM/DATA/SECURITY TRUTH RECONCILED FROM LIVE EVIDENCE
→ LIVE h IMPLEMENTATION/DATA/RUNTIME/REPOSITORY EVIDENCE
→ AUTHORITATIVE EXTERNAL TECHNICAL EVIDENCE WHEN NEEDED
→ FORENSIC HISTORICAL SOURCES
```

## 14. Valid blockers

Only unknowns that can alter safe truth preservation, canonical target, dominant candidate or safe cutover may halt dependent mutation:

```text
UNRESOLVED IRREVERSIBLE DATA RISK
UNRESOLVED EXTERNAL CONSUMER CONTRACT
UNKNOWN CURRENT h HEAD MOVEMENT
MISSING REQUIRED HUMAN PRODUCT DECISION
MISSING REQUIRED SECRET/CREDENTIAL/ENVIRONMENT
BLOCKED_UNKNOWN THAT CHANGES CANONICAL TARGET
RANKING_RELEVANT_UNKNOWN
```

Large deletion, many callers, unfamiliar structure, large migration, large blast radius or whole-subtree replacement are not blockers by themselves.