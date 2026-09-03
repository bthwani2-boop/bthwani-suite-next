# H Forensic Diagnosis and Causal Refoundation Synthesis

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: full census, required-truth extraction, semantic clustering, container/surface diagnosis, canonical target, structural delta, Source-of-Defect/Source-of-Fix proof and causal execution-unit synthesis.

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

For every material semantic cluster record conceptually:

```text
SEMANTIC_ID
CURRENT_OWNERS
CURRENT_WRITERS
CURRENT_READERS/CONSUMERS
CURRENT_STORAGE
CURRENT_CONTRACTS
CURRENT_GENERATED_LINEAGE
CURRENT_RUNTIME/CONFIG_AUTHORITY
CURRENT_CONTAINERS
CURRENT_SCREENS/JOURNEYS
CURRENT_TEST/CI/TOOL/GOVERNANCE_AUTHORITIES
CURRENT_COMPAT/BRIDGE/FORWARDER_LAYERS
CURRENT_DEAD/SHADOW_PATHS
HISTORICAL_DEFECT/ADMISSION_SIGNALS
```

Contradictions are findings, not something to average away.

## 5. Mandatory conceptual closure views

The following views must be derivable from live evidence whenever material, but MUST NOT become mandatory durable repository ledgers or a second execution authority:

```text
ARTIFACT_DISPOSITION_VIEW
FILE_VERDICT_VIEW
CONTAINER_VERDICT_VIEW
SEMANTIC_AUTHORITY_VIEW
WINNER_LOSER_VIEW
CANONICAL_CONTAINER_VIEW
END_TO_END_CAPABILITY_VIEW
STRUCTURAL_DELTA_VIEW
```

They may exist in memory, generated output or temporary evidence. Their purpose is total accounting, not bureaucracy.

Closure requires, evidence-bounded:

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNRESOLVED_FILE_VERDICTS=0
UNRESOLVED_CONTAINER_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
UNRESOLVED_WINNER_LOSER_GROUPS=0
UNRESOLVED_CANONICAL_CONTAINER_ASSIGNMENTS=0
UNMAPPED_MATERIAL_CAPABILITIES=0
UNRESOLVED_STRUCTURAL_DELTA_ITEMS=0
```

## 6. Artifact/container/surface disposition

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

`UNCLASSIFIED` and `BLOCKED_UNKNOWN` block closure; they do not create preservation rights.

## 7. File and parent death test

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

## 8. Parallel/shadow truth census

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
LOSING_CONTAINERS
LOSING_WRITERS
LOSING_READERS/CONSUMERS
VALUE_TO_SALVAGE
MIGRATION/CUTOVER
DELETE_TARGETS
OLD_PATH/ALIAS/ROUTE_CLEANUP
NEGATIVE_SPACE_PROOF
```

```text
DISCOVERED_PARALLEL_TRUTH => MANDATORY_STRUCTURAL_DISPOSITION
LOSING_AUTHORITY_OR_CONTAINER_SURVIVES_AFTER_CUTOVER => OPEN
```

Creating a third wrapper is forbidden.

## 9. End-to-end parity census

For each required product capability trace as applicable:

```text
PRODUCT_MEANING
→ ACTOR / JOURNEY / STATE
→ DATA/STORAGE_OWNER
→ DOMAIN/BACKEND_OWNER
→ API/EVENT
→ CANONICAL_CONTRACT
→ GENERATED_BINDING
→ FRONTEND_DATA_CONSUMER
→ COMPONENT/SCREEN
→ USER_ACTION/MUTATION
→ PERSISTED_READBACK
→ VISIBLE_FINAL_STATE
```

Any unjustified break, local manual business mirror or orphan required layer is a structural delta item.

## 10. Top-level confusion surfaces

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
OWNS_UNIQUE_REQUIRED_VALUE
DUPLICATES_ANOTHER_AUTHORITY
CONTAINS_STALE/CONFLICTING_INSTRUCTIONS
EMBEDS_OBSOLETE_CI/PR/BRANCH_ASSUMPTIONS
EXISTS_TO_COMPENSATE_FOR_OLD_DEFECTS
CAN_BE_SIMPLER_AS_EXTRACT→DELETE→MINIMAL_RECREATE
```

Do not repair dozens of historical files when one surface refoundation removes the causal confusion.

## 11. Historical defects and raw findings are clustering evidence

Failures, regressions, TODO/FIXME/HACK, brittle migrations, generated drift, repeated type/test failures, suppressions, scanner findings and old branch differences are evidence only.

Every material raw finding from code/runtime/tests/CI/Sonar/CodeQL/Semgrep/OpenCodeReview/reviews/scanners receives one traceable disposition:

```text
MAPPED_TO_ROOT_OR_FINDING
DUPLICATE_OF
FALSE_POSITIVE_PROVEN
AUTHORIZED_INTENTIONAL_CONDITION
TOOL_LIMITATION_PROVEN
STALE_OR_SUPERSEDED_WITH_PROOF
N/A_PROVEN
```

```text
UNMAPPED != RESOLVED
DISAPPEARED_FROM_LATER_RUN != RESOLVED
GREEN_TOOL != ALL_FINDINGS_DISPOSITIONED
```

Cluster by causal mechanism, never one objective per symptom.

## 12. Design CANONICAL from first principles

Canonical modeling must answer:

```text
WHAT_REQUIRED_TRUTH_SURVIVES?
WHO_OWNS/WRITES_IT?
WHERE_IS_IT_STORED?
WHAT_IS_GENERATED_VS_HAND_WRITTEN?
WHAT_DOMAIN/SERVICE/PACKAGE/DIRECTORY/FILE_SET_SHOULD_EXIST?
WHAT_SCREENS/JOURNEYS_SHOULD_EXIST?
WHAT_TOOLS/WORKFLOWS/GOVERNANCE_SHOULD_EXIST?
WHAT_SHOULD_NOT_EXIST_AT_ALL?
WHAT_MUST_BE_MIGRATED?
WHAT_MUST_BE_DELETED?
WHAT_MUST_PREVENT_REGRESSION?
```

Current topology is evidence, never a design constraint.

## 13. Complete delta

Compute CURRENT → CANONICAL across at least:

```text
PRODUCT/JOURNEY_PARITY
OWNERSHIP / WRITER_AUTHORITY
PERSISTENCE / MIGRATION_EPOCH
CONTRACTS / GENERATED_LINEAGE
DOMAIN / SERVICE_BOUNDARIES
PACKAGE / DIRECTORY / FILE / SYMBOL_RESPONSIBILITY
SCREENS / FRONTEND_BUSINESS_TRUTH
RUNTIME / CONFIG / INFRA
TOOLS / DOCS / GOVERNANCE / AGENTS
TEST / CI / ASSURANCE
DEPENDENCIES / WORKSPACES
MIGRATION / CUTOVER
ADMISSION / PREVENTION
```

Delta items are causal evidence nodes, not a todo queue.

## 14. Dynamic Root Graph and execution units

Build the causal graph, then synthesize candidate execution units at the highest useful granularity.

```text
ROOT = HIGHEST_PROVEN_CAUSE_WHOSE_ELIMINATION_COLLAPSES_MATERIAL_DEFECT_CLUSTERS
EXECUTION_UNIT = HIGHEST_CAUSALLY_COMPLETE_SAFE_CUTOVER_THAT_REMOVES_THE_MOST_PROVEN_NONCANONICAL_STRUCTURE
```

Candidate units may be a whole top-level surface, domain, service, package family, subtree, migration epoch, contract lineage, CI control plane or narrower root.

Rank by structural leverage, canonical correctness, deletable losing structure and complete cutover—not ease.

## 15. Source-of-Defect / Source-of-Fix execution gate

Before material mutation establish compactly:

```text
UNIT_ID
ROOT_CAUSE_ID
CAUSAL_PROOF
ACTUAL_SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
CANONICAL_TARGET
CANONICAL_OWNER/WRITER/BOUNDARY
VALUE_TO_PRESERVE
LOSING_AUTHORITIES/CONTAINERS
COMPLETE_AFFECTED_CONE
WRITERS/READERS/CONSUMERS
DATA/CONTRACT/RUNTIME_IMPACT
MIGRATION/BACKFILL/RECONCILIATION
CUTOVER
DELETION/PRUNING
ADMISSION/PREVENTION
VERIFICATION/FALSIFICATION
VALID_BLOCKERS
```

This is an internal correctness gate, not a human approval gate and not a reason to shrink the unit.

If `ACTUAL_SOURCE_OF_DEFECT` is unknown, destructive mutation is not root-correct unless the mutation is a bounded diagnostic probe. If a higher Source-of-Fix is proven, fixing only a descendant representation is forbidden.

Generated output is not the default Source-of-Fix: fix source/schema/template/generator, regenerate, migrate consumers, then delete stale output/mirrors.

Forbidden shrinkage reasons:

```text
TOO_MANY_FILES
TOO_MANY_CALLERS
TOO_MANY_PACKAGES
TOO_MUCH_DELETION
WOULD_REQUIRE_MIGRATION
TOO_LARGE_FOR_ONE_SESSION
```

## 16. Patch-loop breaker and treatment adequacy

If work degenerates into:

```text
LOCAL_ERROR → LOCAL_FIX → RELATED_ERROR → FALLBACK/WRAPPER → ANOTHER_SYMPTOM
```

stop descendant patching, cluster symptoms, promote the shared parent and re-rank.

Before accepting a write, be able to answer:

```text
WHAT_ROOT_DOES_THIS_WRITE_REMOVE?
WHAT_SOURCE_OF_DEFECT_DOES_IT_CHANGE?
WHY_IS_THIS_THE_CANONICAL_SOURCE_OF_FIX?
WHICH_DESCENDANT_FINDINGS_SHOULD_COLLAPSE?
WHAT_OLD_STRUCTURE_BECOMES_DELETE_REQUIRED?
```

If the root survives without the write, the write is not sufficient root treatment except as a bounded migration/cutover step.

## 17. Independent challenger pass

Before committing a high-impact canonical target or irreversible treatment, run a logically independent falsification pass. This is not an approval workflow and must not delay a proven executable unit unnecessarily.

Challenge at least:

```text
IS_THE_FAVORED_ROOT_ACTUALLY_A_SYMPTOM?
WHAT_HIGHER_CAUSAL_PARENT_ALSO_FITS?
WHAT_EVIDENCE_WOULD_DISPROVE_THE_TARGET?
WHAT_WRITER/READER/CONSUMER/HANDOFF_MAY_BE_MISSING?
WHAT_OLD_AUTHORITY_COULD_STILL_BE_REACHABLE?
WHAT_DATA/RUNTIME_READBACK_WOULD_CONTRADICT_CUTOVER?
WHAT_RACE/RETRY/RESTART/LOST_RESPONSE_CASE_BREAKS_THE_MODEL?
WHAT_EXTERNAL_OR_SECURITY_TRUST_ASSUMPTION_IS_UNPROVEN?
```

A proven higher root immediately reopens ranking. Challenger output is evidence, never a second authority.

## 18. Stateful and trust-boundary modeling

For materially stateful roots model enough of:

```text
STATE
EVENT/COMMAND
ACTOR
GUARD/PRECONDITION
CANONICAL_DECISION_OWNER
EXPECTED_NEXT_STATE
FORBIDDEN_TRANSITIONS
TERMINALITY
RETRY/DUPLICATE/REPLAY
CONCURRENCY/ORDERING
FAILURE/RECOVERY
IDEMPOTENCY
```

For material security/privacy/financial/trust boundaries model enough of:

```text
ASSETS
ACTORS/SERVICE_IDENTITIES
ENTRY_POINTS
TRUSTED_VS_UNTRUSTED_INPUTS
PRIVILEGES/OBJECT_SCOPES
DATA_FLOW
ABUSE/MISUSE_CASES
REPLAY/CONFUSED_DEPUTY/CROSS_SCOPE
FAILURE_IMPACT
CANONICAL_MITIGATION_OWNER
REQUIRED_FALSIFICATION_EVIDENCE
```

These models exist only where material and are used to find higher roots faster; they are not mandatory documentation artifacts.

## 19. Diagnosis freshness

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
