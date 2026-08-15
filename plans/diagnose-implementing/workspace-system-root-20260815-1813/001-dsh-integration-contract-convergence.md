TASK_ID: TASK-20260815-1813-WORKSPACE-SYSTEM-ROOT
REPOSITORY: bthwani2-boop/bthwani-suite-next
BRANCH: A
TASK_BRANCH: task/workspace-system-root-20260815-1813
MODE: EXECUTE_END_TO_END
SEQUENCE_ID: SEQ-001
SEQUENCE_NAME: dsh-integration-contract-convergence
SEQUENCE_ORDER: 1
BASE_SHA: 8a244d7b2bb5a0193cd8a9ff7476892585175a1b
RECONCILED_HEAD_SHA: 8a244d7b2bb5a0193cd8a9ff7476892585175a1b
ROOT_CAUSE_CLUSTER_ID: RC-001
PRIORITY_CLASS: PRIMARY_SYSTEMIC
PRIORITY_BASIS: Highest proven systemic leverage; exact-A CI fails backend API binding, frontend feature binding and runtime-real-bindings across contract/backend/four surfaces/database migration grammar.
DERIVATION_BASIS: ROOT_GRAPH
DEPENDS_ON: NONE
BLOCKS: RC-005 current-candidate proof convergence
UNLOCKS: DSH runtime verification; downstream full-candidate verification
CONFLICT_DOMAIN: DSH_CONTRACT_BACKEND_SURFACE_MIGRATION_GUARDS
EXECUTION_OWNER: CURRENT_TASK_SINGLE_REMOTE_WRITER
PARALLEL_SAFETY: SERIALIZED
SUSPENDED_BY: NONE
RESUME_AFTER: NONE
INVALIDATES: NONE
SEQUENCE_STATUS: READY_TO_EXECUTE
OPERATIONAL_GRAPH_POSITION_PROVEN: YES
JOURNEY_IMPACT_MAPPED: YES
STATE_IMPACT_MAPPED: YES
AUTHORITY_IMPACT_MAPPED: YES
HANDOFF_IMPACT_MAPPED: YES
CANONICAL_TRUTH_IMPACT_MAPPED: YES
ROOT_CAUSE_PROVEN: YES
DECISIONS_RESOLVED: YES
DECISION_IMPACT_PROPAGATED: YES
REDIAGNOSIS_COMPLETE: YES
IMPACT_MAPPED: YES
FINDINGS_DISPOSITIONED: YES
DEPENDENCIES_DISPOSITIONED: YES
VERIFICATION_DEFINED: YES
SOLUTION_READY: YES
IMPLEMENTATION_COMPLETE: NO
CONSUMERS_RECONCILED: NO
LOCAL_CLEANUP_COMPLETE: NO
VERIFICATION_PASS: NO
GOVERNANCE_SYNC: NO
SCOPE_DELTA_CLASSIFIED: NO

# SEQ-001 — DSH Integration Contract Convergence

## Root cause and operational graph

RC-001 is latent cross-layer DSH integration drift, not a regression from the latest orchestrator commits. It blocks partner/field onboarding, checkout/order readback, fulfillment/dispatch, multi-surface operational reachability and database/runtime verification. Canonical truth ownership is unchanged: DSH owns operational state; WLT retains financial truth; surfaces remain consumers.

## Proven findings and solution intent

1. Remove obsolete legacy field payout-destination contract aliases only where current sovereign `/me` read and Finance-managed mutation paths supersede them; do not add beneficiary mutation authority merely to satisfy a route-binding guard.
2. Declare `assignmentId` as a required path parameter on each of the five field-onboarding assignment operations that embeds it.
3. Reconcile the seven governed surface-map entries to the real current screen/controller/navigation graph; prefer correcting stale registry paths/import reachability over creating duplicate screens.
4. Correct the runtime migration filename grammar to accept canonical immutable DSH sequence numbers of three or more digits; never rename or edit historical active migration SQL.

## Verification

Required before COMPLETE:
- exact candidate backend API binding gate PASS;
- exact candidate frontend feature binding gate PASS;
- exact candidate runtime-real-bindings gate PASS;
- migration manifest drift remains PASS;
- OpenAPI compose/validate remains deterministic PASS;
- DSH Go/TypeScript affected verification remains PASS;
- no new parallel truth or unauthorized payout mutation route;
- consumers/references reconciled and local cleanup completed;
- current `A` rechecked and any foreign delta classified before integration.
