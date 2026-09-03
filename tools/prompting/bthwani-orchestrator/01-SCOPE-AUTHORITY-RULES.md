# H Refoundation Scope and Authority Rules

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: branch authority, repository-wide mutation scope, forensic-source use, exact-head discipline, execution-unit boundaries and artifact survival.

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

All old refs, including `master`, `g`, `ocr`, `f` and feature/history branches, may be read to recover or falsify facts.

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

Recovered value must re-earn canonical status and be placed under the new canonical owner; do not revive historical containers just to recover behavior.

## 3. Exact-head discipline

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

## 4. Absolute repository scope

Every material tracked artifact on `h` is in scope, including:

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

No path, name or category has preservation immunity.

## 5. Hostile-inheritance survival law

Inherited structure starts with:

```text
CURRENT_CONTAINER_DEFAULT=DOES_NOT_SURVIVE_UNLESS_PROVEN_CANONICAL
```

This applies to line, symbol, file, directory, package, service, database object, workflow, tool, doc, governance artifact and top-level surface.

A surviving material container must prove, as applicable:

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

`BLOCKED_UNKNOWN` blocks closure; it never means keep just in case.

## 6. Used does not mean canonical

```text
USED != CANONICAL
HAS_CALLERS != DESERVES_TO_EXIST
DIFFERENT_NAME != DIFFERENT_RESPONSIBILITY
DIFFERENT_PATH != DIFFERENT_RESPONSIBILITY
```

A heavily used wrong authority is migrated and deleted; caller count is not preservation proof.

Semantic responsibility is derived from behavior, data, decisions, writers/readers, contract meaning, state transitions and consumer outcome—not filenames or current directories.

## 7. Dynamic mutation authority

The orchestrator may select the highest safely executable unit required to realize the canonical target:

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
```

Within that unit it may:

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
RECREATE MINIMAL CANONICAL SUBTREE
```

There is no minimal-diff, minimal-file-count or existing-path preservation requirement.

## 8. Surface/subtree death test

For every materially suspect surface—including `.agents`, `.github`, `.opencodereview`, `docs`, `tools`, `governance`—ask:

```text
DOES THIS SURFACE OWN UNIQUE REQUIRED CANONICAL VALUE?
IS ITS CURRENT STRUCTURE THE BEST CANONICAL CONTAINER?
DOES IT DUPLICATE/CONFLICT WITH ANOTHER AUTHORITY?
DOES IT EXIST MAINLY TO COMPENSATE FOR HISTORICAL DEFECTS?
DOES IT CAUSE EXECUTION CONFUSION OR PARALLEL GOVERNANCE?
WOULD EXTRACT→DELETE→MINIMAL-RECREATE BE CLEANER AND FASTER?
```

If wholesale refoundation is proven superior:

```text
EXTRACT UNIQUE REQUIRED VALUE
→ DELETE LOSING SUBTREE
→ RECREATE ONLY MINIMUM CANONICAL MATERIAL
→ UPDATE ALL CONSUMERS/REFERENCES
→ PROVE ZERO OLD REACHABILITY
```

Do not patch a structurally invalid surface merely because it contains many files.

## 9. Safety boundaries

Aggressive structural authority does not permit destructive uncertainty for:

```text
IRREVERSIBLE DURABLE DATA
EXTERNAL LIVE CONSUMERS
SECURITY/TRUST
FINANCIAL STATE
MIGRATION/CUTOVER
GENERATED LINEAGE
LIVE RUNTIME
```

For these, preserve required truth first, prove migration/cutover, then delete the loser.

## 10. Concurrency

```text
MAX_ACTIVE_OVERLAPPING_MATERIAL_MUTATION_UNITS=1
```

This is a collision rule, not a size limiter.

The unit may span many services/files if one causal cutover requires them. Wide parallel read-only census/analysis is encouraged.

Do not split a canonical cutover due to token count, session length, file count, frontend/backend boundary or perceived complexity.

## 11. GitHub Actions authority

On `h`, GitHub Actions may be created, rewritten, dispatched or deleted as needed.

No workflow receives survival rights because it existed before `h`.

Persistent workflows must own unique durable assurance. Campaign-only workflows must disappear when their evidence role ends. PR/default-branch assumptions inherited from old branches are not `h` authority.

## 12. Precedence

```text
CURRENT EXPLICIT HUMAN INTENT
→ THIS ORCHESTRATOR PACKAGE
→ LIVE h IMPLEMENTATION/DATA/RUNTIME EVIDENCE
→ DURABLE REQUIRED PRODUCT/SYSTEM TRUTH
→ FORENSIC HISTORICAL SOURCES
```

Historical plans, prompts, docs, branches and CI conventions cannot override the canonical refoundation package.

## 13. Valid blockers

Only material unknowns that can alter safe truth preservation or canonical design may halt mutation:

```text
UNRESOLVED IRREVERSIBLE DATA RISK
UNRESOLVED EXTERNAL CONSUMER CONTRACT
UNKNOWN CURRENT h HEAD MOVEMENT
MISSING REQUIRED HUMAN PRODUCT DECISION
MISSING REQUIRED SECRET/CREDENTIAL/ENVIRONMENT
BLOCKED_UNKNOWN THAT CHANGES CANONICAL TARGET
```

Large deletion, many callers, unfamiliar structure or extensive migration are not blockers by themselves.
