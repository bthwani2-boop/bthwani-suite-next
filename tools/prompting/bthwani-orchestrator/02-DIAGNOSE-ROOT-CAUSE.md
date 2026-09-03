# H Forensic Diagnosis and Root-Cause Synthesis

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: census, truth extraction, semantic clustering, current/canonical delta evidence and causal Root Graph synthesis.

## 1. Diagnosis is repository-wide before mutation ranking

Do not begin by fixing reported errors. Begin by reconstructing the repository truth model.

Required first-pass census:

```text
TRACKED TREE
WORKSPACES/PACKAGES
SERVICE/DOMAIN TOPOLOGY
DATABASE/SCHEMA/MIGRATION OWNERSHIP
API/CONTRACT/GENERATED LINEAGE
RUNTIME/CONFIG/INFRA AUTHORITIES
FRONTEND SURFACES/SHARED OWNERSHIP
TEST/ASSURANCE/CI AUTHORITIES
DEPENDENCY/LOCKFILE OWNERSHIP
DUPLICATE/SHADOW/PARALLEL TRUTH
LEGACY/COMPATIBILITY/BRIDGE LAYERS
ORPHANED/DEAD/STALE/UNOWNED MATERIAL
```

Machine census is followed by semantic census. File counts alone are not diagnosis.

## 2. Required truth extraction

For each material capability or concern, extract only truth that the canonical baseline must preserve:

```text
PRODUCT INTENT
ACTORS AND AUTHORIZATION
DOMAIN SEMANTICS
PERSISTED DATA MEANING
FINANCIAL/SECURITY INVARIANTS
EXTERNAL CONTRACTS
USER JOURNEYS
REQUIRED INTEGRATIONS
OBSERVABLE RUNTIME BEHAVIOR
COMPLIANCE/SAFETY CONSTRAINTS
```

Do not preserve an implementation shape merely because it currently carries required truth.

## 3. Build the CURRENT model

For every material semantic cluster record:

```text
SEMANTIC_ID
CURRENT_OWNERS
CURRENT_WRITERS
CURRENT_READERS
CURRENT_STORAGE
CURRENT_CONTRACTS
CURRENT_GENERATED_LINEAGE
CURRENT_RUNTIME_AUTHORITY
CURRENT_CONTAINERS
CURRENT_TEST/CI COVERAGE
CURRENT_COMPATIBILITY/BRIDGE LAYERS
CURRENT_DEAD_OR_SHADOW_PATHS
HISTORICAL_DEFECT_SIGNALS
```

The CURRENT model must expose contradictions instead of normalizing them.

## 4. Artifact and container disposition

Every material inherited container must receive one high-level disposition:

```text
KEEP_PROVEN
PRESERVE_AND_REWIRE
REFOUND
MIGRATE_VALUE_THEN_DELETE
DELETE
BLOCKED_UNKNOWN
```

For every directory/package/module/service boundary additionally classify:

```text
COHESIVE_CANONICAL_CONTAINER
MIXED_RESPONSIBILITY
DUPLICATE_RESPONSIBILITY
WRONG_OWNER
PASS_THROUGH_ONLY
COMPATIBILITY_ONLY
DEAD/ORPHANED
UNCLASSIFIED
```

`UNCLASSIFIED` and `BLOCKED_UNKNOWN` are closure blockers.

## 5. Parallel/shadow truth census is mandatory

Search explicitly for duplicated or competing authority across:

```text
STATE
BUSINESS RULES
POLICY
AUTHORIZATION
MONEY/CALCULATION
DTO/ENUM/CONTRACT
SCHEMA/MIGRATION
CONFIGURATION
ROUTES
CLIENTS
MAPPINGS
CACHE/READ MODEL
VALIDATION
NAVIGATION
FEATURE FLAGS
CI/VERIFICATION
DOCS THAT OPERATE AS AUTHORITY
```

For every material parallel truth pair/group, determine:

```text
WINNING_CANONICAL_AUTHORITY
LOSING_AUTHORITIES
ALL LOSING WRITERS
ALL LOSING READERS/CONSUMERS
VALUE TO MIGRATE
CUTOVER ORDER
DELETE TARGETS
NEGATIVE-SPACE PROOF REQUIRED
```

```text
DISCOVERED_PARALLEL_MATERIAL_TRUTH => MANDATORY_STRUCTURAL_DISPOSITION
LOSING_AUTHORITY_SURVIVES_AFTER_CUTOVER => ROOT_OPEN
```

Creating a third wrapper around two authorities is forbidden.

## 6. Historical defects are clustering evidence

Use failures, TODO/FIXME/HACK, regressions, repeated incidents, brittle migrations, repeated contract drift, CI suppressions, generated drift, recurring type/test failures and old branch differences as evidence.

Cluster them by causal mechanism:

```text
SAME WRONG OWNER
SAME DUPLICATE SOURCE OF TRUTH
SAME FRAGMENTED BOUNDARY
SAME MIGRATION EPOCH
SAME CONTRACT LINEAGE FAILURE
SAME RUNTIME/CONFIG AUTHORITY SPLIT
SAME ADMISSION/VERIFICATION HOLE
SAME COMPENSATING LAYER
```

Do not convert each symptom into its own objective.

## 7. Build the canonical target before selecting the root

Canonical modeling must answer:

```text
WHAT REQUIRED TRUTH SURVIVES?
WHO OWNS IT?
WHO MAY WRITE IT?
WHERE IS IT STORED?
WHAT IS GENERATED VS HAND-WRITTEN?
WHAT CONTAINERS SHOULD EXIST?
WHAT BOUNDARIES SHOULD EXIST?
WHAT SHOULD NOT EXIST AT ALL?
WHAT MUST BE MIGRATED?
WHAT MUST BE DELETED?
WHAT MUST PREVENT REGRESSION?
```

If the answer is constrained only by current folders/packages, diagnosis is invalid.

## 8. Complete structural delta

Compute CURRENT → CANONICAL at least across:

```text
OWNERSHIP
WRITER AUTHORITY
PERSISTENCE
CONTRACTS
GENERATED LINEAGE
SERVICE/DOMAIN BOUNDARIES
PACKAGE/DIRECTORY TOPOLOGY
FILE/SYMBOL RESPONSIBILITY
RUNTIME/CONFIG/INFRA
TEST/CI/ASSURANCE
DEPENDENCIES
MIGRATION/CUTOVER
ADMISSION/PREVENTION
```

Delta items are evidence nodes, not an ordered todo list.

## 9. Root Graph

Build a dynamic causal graph where:

```text
ROOT = HIGHEST PROVEN CAUSE WHOSE ELIMINATION COLLAPSES THE LARGEST MATERIAL DEFECT CLUSTER
```

A root must identify:

```text
ROOT_ID
CAUSAL_CLAIM
PROOF
CANONICAL_TARGET
AFFECTED_CONE
VALUE_TO_PRESERVE
LOSING_STRUCTURE
MIGRATION/CUTOVER REQUIREMENTS
DELETION REQUIREMENTS
ADMISSION_HOLE
VERIFICATION/FALSIFICATION CLAIMS
BLOCKERS
```

Rank by structural leverage and correctness, not convenience.

Priority favors roots that eliminate:

```text
PARALLEL/SHADOW TRUTH
MULTIPLE MUTABLE WRITERS
WRONG OWNERSHIP
DUPLICATE RESPONSIBILITY TREES
BAD SERVICE/DOMAIN BOUNDARIES
BAD MIGRATION EPOCHS
BAD CONTRACT/GENERATED AUTHORITY
BAD RUNTIME/CONFIG AUTHORITY
PATCH/COMPATIBILITY LAYERS
SYSTEMIC ADMISSION HOLES
```

## 10. Root selection gate

Select the highest root that is both proven and executable safely.

Forbidden root shrinkage:

```text
FILE_TOO_BIG
DIFF_TOO_BIG
TOO_MANY_CALLERS
TOO_MANY_PACKAGES
WOULD_REQUIRE_DELETION
WOULD_REQUIRE_MIGRATION
TOO_MUCH_FOR_ONE_SESSION
```

Valid blockers are limited to unresolved material facts described in `00`/`01`.

## 11. Diagnosis freshness

After every material root mutation:

```text
UPDATE CURRENT MODEL
UPDATE DELTA
INVALIDATE AFFECTED EVIDENCE
REBUILD/REFRESH ROOT GRAPH
RE-RANK
```

Do not continue executing a stale precomputed queue after architecture has changed.
