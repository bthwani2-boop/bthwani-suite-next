# H Forensic Diagnosis and Causal Refoundation Synthesis

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: full branch census, required-truth extraction, hostile survival challenge, semantic clustering, systemic-catastrophe synthesis, container/surface diagnosis, canonical target, structural delta, Source-of-Defect/Source-of-Fix proof and causal execution-unit synthesis.

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

Stage A requires this census to be branch-wide, not restricted to the currently failing cone. Sampling, first-error inspection or root-local discovery cannot satisfy the pre-root survival challenge.

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
BRANCH_SURVIVAL_VIEW
SYSTEMIC_CATASTROPHE_VIEW
CATASTROPHE_TO_DESCENDANT_ROOT_VIEW
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

Before Stage B specifically, every material artifact/container must either have a proven current disposition or be mapped to an explicit Stage-B causal obligation; silent unreviewed structure is forbidden.

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

The survival burden is hostile:

```text
WHY_DOES_THIS_DESERVE_TO_SURVIVE?
```

is mandatory for material inherited structure. Current use, successful build, caller count or historical acceptance is not positive survival proof.

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

During Stage A it is sufficient to design the canonical foundation and enough descendant shape to execute systemic cutovers safely; do not invent unnecessary local Stage-B implementation detail before shared foundations settle.

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

Every material delta node must be classified into one of:

```text
PRE_ROOT_SYSTEMIC_CATASTROPHE
STAGE_B_CAUSAL_ROOT_OR_DESCENDANT
LOCAL_FINDING_MAPPED_TO_A_CAUSAL_UNIT
BLOCKED_UNKNOWN
```

The classification is causal. Warning count or file count alone cannot promote a finding to systemic status.

## 14. Mandatory systemic-catastrophe synthesis

Before normal Root Graph selection, synthesize a separate pre-root graph for conditions that poison the shared baseline.

```text
SYSTEMIC_CATASTROPHE =
A PROVEN NONCANONICAL CONDITION THAT
CROSSES OR CONTAMINATES MULTIPLE FUTURE ROOTS
OR CORRUPTS A SHARED EXECUTION/OWNERSHIP/DATA/CONTRACT/RUNTIME/VERIFICATION SUBSTRATE,
AND WHOSE EARLY REFOUNDATION MATERIALLY REDUCES
THE COST, DISTORTION OR COMPLEXITY OF MULTIPLE LATER CLOSURES.
```

Strong systemic signals include:

```text
CROSS_ROOT_BLAST_RADIUS
SHARED_AUTHORITY_CORRUPTION
DUPLICATE_MUTABLE_AUTHORITY_ACROSS_SURFACES
ROOT_CLOSURE_BLOCKING_POWER
DIAGNOSIS_CONTAMINATION
VERIFICATION_CONTAMINATION
PARALLEL_TRUTH_MULTIPLIER
COMPENSATION_LAYER_MULTIPLIER
BAD_REPOSITORY/WORKSPACE/PACKAGE_TOPOLOGY
BAD_DATABASE_OWNERSHIP_OR_MIGRATION_EPOCH
DUPLICATE_CONTRACT_OR_GENERATED_LINEAGE
REACHABLE_SUPERSEDED_RUNTIME/CONFIG
CONFLICTING_GOVERNANCE/AGENT/TOOL_AUTHORITY
HIGH_LEVERAGE_OBSOLETE_SUBTREE
SHARED_CORE_COMMON_OWNERSHIP_REFUGE
```

A local bug, duplicate helper or isolated warning is not systemic merely because it is ugly.

For every systemic candidate derive conceptually:

```text
CATASTROPHE_ID
ACTUAL_SHARED_CAUSE
AFFECTED_ROOT_FAMILIES / CAPABILITIES
SHARED_SUBSTRATE
WINNING_CANONICAL_FOUNDATION
LOSING_AUTHORITIES/CONTAINERS
REQUIRED_TRUTH_TO_SALVAGE
COMPLETE_AFFECTED_CONE
MIGRATION/CUTOVER
DELETION/PRUNING
ADMISSION/PREVENTION
FALSIFICATION
VALID_BLOCKERS
```

## 15. Systemic Catastrophe Graph, ROOT_TAX and ranking signals

Build:

```text
SYSTEMIC_CATASTROPHE_GRAPH
```

before normal root traversal. Parent systemic causes must absorb descendant catastrophe symptoms where causally correct.

Use `ROOT_TAX` as a qualitative diagnosis concept:

```text
ROOT_TAX =
THE EXTRA MIGRATION, COMPATIBILITY, DIAGNOSIS, VERIFICATION,
PARALLEL-AUTHORITY AND CLEANUP WORK THAT A SURVIVING SHARED DEFECT
WOULD FORCE INTO FUTURE ROOTS.
```

Rank systemic candidates by demonstrated leverage, not by ease or raw count:

```text
TRUTH / DATA / SECURITY RISK
CROSS_ROOT_BLOCKING_POWER
SHARED_AUTHORITY_COLLAPSE
NUMBER_AND_MATERIALITY_OF_ROOT_FAMILIES_AFFECTED
DIAGNOSIS / VERIFICATION CONTAMINATION REMOVAL
LOSING_STRUCTURE_DELETABLE
COMPENSATION_LAYER_REMOVAL
ROOT_TAX_REMOVAL
FUTURE_COMPLEXITY_REDUCTION
SAFE_COMPLETE_CUTOVER_FEASIBILITY
```

The governing question is:

```text
WHICH PROVEN REFOUNDATION, IF DONE NOW,
MAKES THE LARGEST SET OF FUTURE ROOTS
SMALLER, CLEANER, MORE INDEPENDENT AND EASIER TO CLOSE
WITHOUT SACRIFICING REQUIRED TRUTH?
```

`02` synthesizes and ranks evidence. Campaign traversal and stage admission are owned by `05` and `04` respectively.

## 16. Normal Dynamic Root Graph and execution units

The normal Root Graph is the Stage-B causal graph after Stage-A systemic decontamination has passed its exit gate.

```text
ROOT = HIGHEST_PROVEN_CAUSE_WHOSE_ELIMINATION_COLLAPSES_MATERIAL_DEFECT_CLUSTERS
EXECUTION_UNIT = HIGHEST_CAUSALLY_COMPLETE_SAFE_CUTOVER_THAT_REMOVES_THE_MOST_PROVEN_NONCANONICAL_STRUCTURE
```

Candidate units may be a whole top-level surface, domain, service, package family, subtree, capability/journey, migration epoch, contract lineage, CI control plane or narrower root.

Rank by structural leverage, canonical correctness, deletable losing structure and complete cutover—not ease.

```text
NORMAL_ROOT_SELECTION_BEFORE_STAGE_A_EXIT_PASS = FORBIDDEN
```

A Stage-B graph may be prepared conceptually during Stage A for dependency analysis, but it cannot control mutation order while an executable systemic catastrophe survives.

## 17. Source-of-Defect / Source-of-Fix execution gate

Before material mutation establish compactly:

```text
UNIT_ID
UNIT_STAGE
ROOT_CAUSE_ID_OR_CATASTROPHE_ID
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

## 18. Patch-loop breaker and treatment adequacy

If work degenerates into:

```text
LOCAL_ERROR → LOCAL_FIX → RELATED_ERROR → FALLBACK/WRAPPER → ANOTHER_SYMPTOM
```

stop descendant patching, cluster symptoms and ask first whether the shared parent is a Stage-A systemic catastrophe. If yes, promote it into the Systemic Catastrophe Graph. Otherwise promote the correct Stage-B causal parent and re-rank.

Before accepting a write, be able to answer:

```text
WHAT_SYSTEMIC_CATASTROPHE_OR_ROOT_DOES_THIS_WRITE_REMOVE?
WHAT_SOURCE_OF_DEFECT_DOES_IT_CHANGE?
WHY_IS_THIS_THE_CANONICAL_SOURCE_OF_FIX?
WHICH_DESCENDANT_FINDINGS_OR_ROOT_TAX_SHOULD_COLLAPSE?
WHAT_OLD_STRUCTURE_BECOMES_DELETE_REQUIRED?
```

If the cause survives without the write, the write is not sufficient treatment except as a bounded migration/cutover step.

## 19. Independent challenger pass

Before committing a high-impact canonical target or irreversible treatment, run a logically independent falsification pass. This is not an approval workflow and must not delay a proven executable unit unnecessarily.

Challenge at least:

```text
IS_THE_FAVORED_CAUSE_ACTUALLY_A_SYMPTOM?
WHAT_HIGHER_CAUSAL_PARENT_ALSO_FITS?
IS_THIS_REALLY_SYSTEMIC_OR_MERELY_LOCAL?
WHAT_SHARED_SUBSTRATE_OR_DESCENDANT_ROOT_FAMILY_IS_MISSING?
WHAT_EVIDENCE_WOULD_DISPROVE_THE_TARGET?
WHAT_WRITER/READER/CONSUMER/HANDOFF_MAY_BE_MISSING?
WHAT_OLD_AUTHORITY_COULD_STILL_BE_REACHABLE?
WHAT_DATA/RUNTIME_READBACK_WOULD_CONTRADICT_CUTOVER?
WHAT_RACE/RETRY/RESTART/LOST_RESPONSE_CASE_BREAKS_THE_MODEL?
WHAT_EXTERNAL_OR_SECURITY_TRUST_ASSUMPTION_IS_UNPROVEN?
```

A proven higher cause immediately reopens ranking. Challenger output is evidence, never a second authority.

## 20. Stateful and trust-boundary modeling

For materially stateful units model enough of:

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

These models exist only where material and are used to find higher causes faster; they are not mandatory documentation artifacts.

## 21. Diagnosis freshness

After every material mutation unit:

```text
RE-PIN h
→ UPDATE CURRENT
→ REFRESH CENSUS/DELTA
→ INVALIDATE AFFECTED EVIDENCE
→ REBUILD SYSTEMIC_CATASTROPHE_GRAPH
→ RE-SYNTHESIZE SYSTEMIC UNITS
→ IF STAGE_A_EXIT_NOT_PROVEN: RE-RANK SYSTEMIC UNITS
→ IF STAGE_A_EXIT_PROVEN: REBUILD NORMAL ROOT GRAPH / RE-SYNTHESIZE STAGE-B UNITS / RE-RANK
```

For a cross-cutting Stage-A change, refresh branch-wide enough to catch collapsed, newly exposed or invalidated systemic candidates. Never execute a stale static queue after architecture changes.