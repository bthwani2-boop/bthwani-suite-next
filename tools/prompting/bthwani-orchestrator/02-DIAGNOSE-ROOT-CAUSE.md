# H Forensic Diagnosis and Causal Refoundation Synthesis

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: full census, required-truth extraction, semantic clustering, container/surface diagnosis, canonical target, structural delta and causal execution-unit synthesis.

## 1. Diagnosis starts repository-wide

Do not begin from reported bugs, CI failures or named files.

Begin from exact pinned `h` and reconstruct the whole material system:

```text
TRACKED TREE
TOP-LEVEL SURFACES
WORKSPACES / PACKAGES
DOMAIN / SERVICE TOPOLOGY
FILES / SYMBOLS / PUBLIC EXPORTS
DATABASE / SCHEMA / MIGRATION OWNERSHIP
API / CONTRACT / GENERATED LINEAGE
RUNTIME / CONFIG / INFRA AUTHORITIES
FRONTEND / SCREENS / JOURNEYS
TEST / CI / ASSURANCE AUTHORITIES
TOOLS / DOCS / GOVERNANCE / AGENT AUTHORITIES
DEPENDENCIES / LOCKFILE OWNERSHIP
DUPLICATE / SHADOW / PARALLEL TRUTH
LEGACY / COMPAT / FORWARDER / BRIDGE LAYERS
ORPHAN / DEAD / STALE / UNOWNED MATERIAL
```

Machine census must be followed by semantic census.

## 2. Required-truth extraction

For every material capability/concern, identify only truth that must survive:

```text
PRODUCT INTENT
ACTORS / AUTHORIZATION
DOMAIN SEMANTICS
PERSISTED DATA MEANING
SECURITY / FINANCIAL INVARIANTS
EXTERNAL CONTRACTS
USER JOURNEYS
REQUIRED INTEGRATIONS
OBSERVABLE RUNTIME BEHAVIOR
REQUIRED OPERATIONAL/ASSURANCE CLAIMS
```

Do not preserve a container merely because required truth currently lives inside it.

## 3. Semantic responsibility outranks names and paths

```text
SEMANTIC_RESPONSIBILITY > FILE_NAME
SEMANTIC_RESPONSIBILITY > CURRENT_PATH
SEMANTIC_RESPONSIBILITY > CURRENT_PACKAGE
```

Cluster by actual behavior:

```text
WHAT DECISION IS MADE?
WHAT DATA IS READ/WRITTEN?
WHAT STATE IS INTERPRETED OR TRANSITIONED?
WHAT BUSINESS RULE/POLICY IS APPLIED?
WHAT CONTRACT/ERROR SEMANTICS ARE OWNED?
WHO CALLS IT?
WHO CONSUMES THE RESULT?
WHAT JOURNEY/SCREEN OUTCOME DEPENDS ON IT?
```

Different names, paths, languages or surfaces do not prove different responsibilities.

## 4. Build CURRENT without normalizing contradictions

For every material semantic cluster record:

```text
SEMANTIC_ID
CURRENT_OWNERS
CURRENT_WRITERS
CURRENT_READERS/CONSUMERS
CURRENT_STORAGE
CURRENT_CONTRACTS
CURRENT_GENERATED_LINEAGE
CURRENT_RUNTIME/CONFIG AUTHORITY
CURRENT_CONTAINERS
CURRENT_SCREENS/JOURNEYS
CURRENT_TEST/CI/TOOL/GOVERNANCE AUTHORITIES
CURRENT_COMPAT/BRIDGE/FORWARDER LAYERS
CURRENT_DEAD/SHADOW PATHS
HISTORICAL DEFECT/ADMISSION SIGNALS
```

Contradictions are findings, not something to average away.

## 5. Artifact/container/surface disposition

Every material inherited artifact receives exactly one high-level disposition:

```text
KEEP_PROVEN
PRESERVE_AND_REWIRE
REFOUND
MIGRATE_VALUE_THEN_DELETE
DELETE
BLOCKED_UNKNOWN
```

Every material container from file upward receives a structural verdict:

```text
CANONICAL_COHESIVE_CONTAINER
MIXED_RESPONSIBILITY
DUPLICATE_RESPONSIBILITY
WRONG_OWNER
WRONG_PATH/BOUNDARY
PASS_THROUGH_ONLY
COMPATIBILITY_ONLY
HISTORICAL_COMPENSATION
DEAD/ORPHANED
WHOLE_SUBTREE_REFOUND_CANDIDATE
UNCLASSIFIED
```

`UNCLASSIFIED` and `BLOCKED_UNKNOWN` block closure.

## 6. File and parent death test

For every materially suspect file ask:

```text
DOES IT OWN A UNIQUE CANONICAL RESPONSIBILITY?
IS IT A JUSTIFIED MEMBER OF THE MINIMUM NECESSARY CANONICAL FILE SET?
CAN REQUIRED VALUE BE ABSORBED INTO A BETTER CANONICAL CONTAINER?
IS IT REEXPORT/PASS-THROUGH/FORWARDER/SHIM/ALIAS ONLY?
IS IT ONLY A HISTORICAL COMPENSATION?
```

Then repeat upward for directory → package → service/boundary → surface.

A used loser is still a loser: migrate callers then delete it.

## 7. Parallel/shadow truth census

Search explicitly across:

```text
STATE
BUSINESS RULES / POLICY / AUTHORIZATION
MONEY / CALCULATION
DTO / ENUM / CONTRACT
SCHEMA / MIGRATION
CONFIGURATION
ROUTES / CLIENTS / MAPPINGS
CACHE / READ MODEL
VALIDATION
NAVIGATION
FEATURE FLAGS
CI / VERIFICATION
DOCS / GOVERNANCE / AGENT INSTRUCTIONS THAT OPERATE AS AUTHORITY
```

For every material competing group determine:

```text
WINNING_CANONICAL_AUTHORITY
LOSING_AUTHORITIES
LOSING CONTAINERS
LOSING WRITERS
LOSING READERS/CONSUMERS
VALUE TO SALVAGE
MIGRATION/CUTOVER
DELETE TARGETS
OLD PATH/ALIAS/ROUTE CLEANUP
NEGATIVE-SPACE PROOF
```

```text
DISCOVERED_PARALLEL_TRUTH => MANDATORY_STRUCTURAL_DISPOSITION
LOSING_AUTHORITY_OR_CONTAINER_SURVIVES_AFTER_CUTOVER => OPEN
```

Creating a third wrapper is forbidden.

## 8. End-to-end parity census

For each required product capability trace as applicable:

```text
PRODUCT MEANING
→ ACTOR / JOURNEY / STATE
→ DATA/STORAGE OWNER
→ DOMAIN/BACKEND OWNER
→ API/EVENT
→ CANONICAL CONTRACT
→ GENERATED BINDING
→ FRONTEND DATA CONSUMER
→ COMPONENT/SCREEN
→ USER ACTION/MUTATION
→ PERSISTED READBACK
→ VISIBLE FINAL STATE
```

Any unjustified break, local manual business mirror or orphan required layer is a structural delta item.

## 9. Top-level confusion surfaces

Explicitly audit:

```text
.agents/**
.github/**
.opencodereview/**
docs/**
tools/**
governance/**
```

For each, determine whether the current subtree:

```text
OWNS UNIQUE REQUIRED VALUE
DUPLICATES ANOTHER AUTHORITY
CONTAINS STALE/CONFLICTING INSTRUCTIONS
EMBEDS OBSOLETE CI/PR/BRANCH ASSUMPTIONS
EXISTS TO COMPENSATE FOR OLD DEFECTS
CAN BE SIMPLER AS EXTRACT→DELETE→MINIMAL-RECREATE
```

Do not repair dozens of historical files when one surface refoundation removes the causal confusion.

## 10. Historical defects are clustering evidence

Failures, regressions, TODO/FIXME/HACK, brittle migrations, generated drift, repeated type/test failures, suppressions and old branch differences are evidence only.

Cluster by causal mechanism:

```text
SAME WRONG OWNER
SAME DUPLICATE SOURCE OF TRUTH
SAME FRAGMENTED BOUNDARY
SAME MIGRATION EPOCH
SAME CONTRACT LINEAGE FAILURE
SAME RUNTIME/CONFIG SPLIT
SAME ADMISSION/VERIFICATION HOLE
SAME COMPENSATION STRUCTURE
SAME CONFUSING CONTROL/GOVERNANCE SURFACE
```

Never produce one objective per symptom.

## 11. Design CANONICAL from first principles

Canonical modeling must answer:

```text
WHAT REQUIRED TRUTH SURVIVES?
WHO OWNS/WRITES IT?
WHERE IS IT STORED?
WHAT IS GENERATED VS HAND-WRITTEN?
WHAT DOMAIN/SERVICE/PACKAGE/DIRECTORY/FILE SET SHOULD EXIST?
WHAT SCREENS/JOURNEYS SHOULD EXIST?
WHAT TOOLS/WORKFLOWS/GOVERNANCE SHOULD EXIST?
WHAT SHOULD NOT EXIST AT ALL?
WHAT MUST BE MIGRATED?
WHAT MUST BE DELETED?
WHAT MUST PREVENT REGRESSION?
```

Current topology is evidence, never a design constraint.

## 12. Complete delta

Compute CURRENT → CANONICAL across at least:

```text
PRODUCT/JOURNEY PARITY
OWNERSHIP / WRITER AUTHORITY
PERSISTENCE / MIGRATION EPOCH
CONTRACTS / GENERATED LINEAGE
DOMAIN / SERVICE BOUNDARIES
PACKAGE / DIRECTORY / FILE / SYMBOL RESPONSIBILITY
SCREENS / FRONTEND BUSINESS TRUTH
RUNTIME / CONFIG / INFRA
TOOLS / DOCS / GOVERNANCE / AGENTS
TEST / CI / ASSURANCE
DEPENDENCIES / WORKSPACES
MIGRATION / CUTOVER
ADMISSION / PREVENTION
```

Delta items are causal evidence nodes, not a todo queue.

## 13. Dynamic Root Graph and execution units

Build the causal graph, then synthesize candidate execution units at the highest useful granularity.

```text
ROOT = HIGHEST PROVEN CAUSE WHOSE ELIMINATION COLLAPSES MATERIAL DEFECT CLUSTERS
EXECUTION_UNIT = HIGHEST CAUSALLY COMPLETE SAFE CUTOVER THAT REMOVES THE MOST PROVEN NONCANONICAL STRUCTURE
```

Candidate units may be a whole top-level surface, domain, service, package family, subtree, migration epoch, contract lineage, CI control plane or narrower root.

Rank by structural leverage, canonical correctness, deletable losing structure and complete cutover—not ease.

## 14. Root/unit declaration

Before mutation establish:

```text
UNIT_ID
CAUSAL_PROOF
CANONICAL_TARGET
VALUE_TO_PRESERVE
LOSING_AUTHORITIES/CONTAINERS
COMPLETE AFFECTED CONE
WRITERS/READERS/CONSUMERS
DATA/CONTRACT MIGRATION
CUTOVER
DELETION/PRUNING
ADMISSION/PREVENTION
VERIFICATION/FALSIFICATION
VALID BLOCKERS
```

Forbidden shrinkage reasons:

```text
TOO MANY FILES
TOO MANY CALLERS
TOO MANY PACKAGES
TOO MUCH DELETION
WOULD REQUIRE MIGRATION
TOO LARGE FOR ONE SESSION
```

## 15. Diagnosis freshness

After every material mutation unit:

```text
RE-PIN h
→ UPDATE CURRENT
→ REFRESH CENSUS/DELTA
→ INVALIDATE AFFECTED EVIDENCE
→ REBUILD ROOT GRAPH
→ RE-SYNTHESIZE EXECUTION UNITS
→ RE-RANK
```

Never execute a stale static queue after architecture changes.
