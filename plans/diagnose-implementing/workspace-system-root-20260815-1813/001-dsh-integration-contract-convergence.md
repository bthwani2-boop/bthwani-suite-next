# SEQ-001 — DSH Integration Contract Convergence

Status: DERIVED_SUPPORT
TASK_ID: PKG-WORKSPACE_SYSTEM_ROOT_20260815_1813
REPOSITORY: bthwani2-boop/bthwani-suite-next
BRANCH: A
TASK_BRANCH: task/workspace-system-root-20260815-1813
MODE: EXECUTE_END_TO_END
SEQUENCE_ID: SEQ-001
SEQUENCE_NAME: dsh-integration-contract-convergence
SEQUENCE_ORDER: 001
BASE_SHA: 8a244d7b2bb5a0193cd8a9ff7476892585175a1b
RECONCILED_HEAD_SHA: 8a244d7b2bb5a0193cd8a9ff7476892585175a1b
ROOT_CAUSE_CLUSTER_ID: RC-001
PRIORITY_CLASS: PRIMARY_SYSTEMIC
PRIORITY_BASIS: Highest proven execution leverage: exact candidate currently fails backend API binding, frontend feature binding and runtime-real-bindings; downstream runtime proof cannot be trusted until these graph edges converge.
DERIVATION_BASIS: ROOT_GRAPH selected RC-001 after complete operational-root coverage, clustered findings, competitive deepening and priority proof on A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b.
DEPENDS_ON: NONE
BLOCKS: RC-005
UNLOCKS: RC-005,DSH_RUNTIME_VERIFICATION,FULL_CANDIDATE_VERIFICATION
CONFLICT_DOMAIN: DSH_CONTRACT_BACKEND_SURFACE_MIGRATION_GUARDS
EXECUTION_OWNER: CURRENT_TASK_SINGLE_REMOTE_WRITER
PARALLEL_SAFETY: SERIAL_REQUIRED
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
SCOPE_DELTA_CLASSIFIED: YES

> One coherent root-cause treatment for RC-001. No leaf symptom may be fixed in isolation if it would preserve a contradictory contract/router/surface/migration edge.

## 1. Scope / Context / Graph Position

- Operational parents: `OUT-004`, `OUT-006`, `OUT-007`, `OUT-009`, `OUT-016`, `INV-005`, `INV-006`, `BND-006`, `BND-009`.
- Journeys impacted: partner/field onboarding, checkout/order readback, fulfillment/dispatch, field readiness, cross-surface navigation/readback and DSH database/runtime verification.
- State impact: no new business state is authorized; the treatment restores declared operations and existing state machines to one reachable contract/runtime graph.
- Authority impact: DSH remains operational owner; WLT remains financial owner; surfaces remain authorized consumers; migration history remains immutable.
- Handoff impact: generated client → DSH router/domain, shared controller → governed screen, and migration manifest/verifier → DSH database runtime.
- Current frontier rationale: RC-001 is machine-ranked `priorityRank=1` and blocks three foundational exact-SHA diagnostics; RC-002/003 are independent but serialized under one remote writer, RC-005 is downstream proof convergence.
- Depends on: none. Blocks/unlocks: source convergence unlocks current-candidate runtime/proof work in RC-005.
- Conflict domain: DSH contract/router/surface-binding/migration-grammar files. Execution owner: current task single remote writer.

## 2. Diagnosis / Findings / Disposition

- `F-001`: payout-destination DSH OpenAPI operations have no registered backend routes.
- `F-002`: five field-onboarding assignment operations embed `{assignmentId}` without declaring the required path parameter.
- `F-003`: seven governed DSH surface bindings are missing or unreachable from the configured controller/navigation graph.
- `F-004`: DSH migrations `dsh-1000` through `dsh-1007` fail the current runtime filename grammar.

All four findings are assigned to RC-001. No HOLD finding remains in this cluster.

## 3. Root Cause / Blast Radius

Highest proven causal root: DSH integration provenance drift across canonical contract declarations, backend route binding, surface registry/reachability and migration-verifier grammar. The blast radius crosses the DSH OpenAPI/generated client, HTTP router, app-client/app-partner/app-captain/app-field surface bindings and DSH migration/runtime verifier.

Competing hypothesis rejected: this is not evidence that WLT should lose financial ownership or that historical DSH migrations should be renamed. Product/governance invariants require preserving WLT sovereignty and immutable applied migration history.

## 4. Decisions / Impact Propagation / Re-Diagnosis

No non-derivable user decision is required. The evidence-derived decisions are:

1. Do not invent DSH financial mutation authority merely to satisfy a route-binding guard; determine whether payout aliases are stale contract declarations or missing bounded DSH facade reads before changing either side.
2. Declare required OpenAPI path parameters where route templates already contain `{assignmentId}`.
3. Reconcile surface-map expectations to real canonical screens/controllers/navigation; prefer fixing stale registry/import reachability over creating duplicate product surfaces.
4. Preserve historical migration SQL/names if already part of canonical history; inspect the migration manifest/parser and correct the enforcing grammar if four-digit sequence numbers are valid current history.

Any contradictory evidence reopens priority derivation before writes continue.

## 5. Exact Target State / Coherent Cutover

- Every active DSH OpenAPI operation has a canonical registered backend route or is removed only when proven obsolete with all consumers migrated.
- Every templated path parameter is explicitly declared and generated-client composition remains deterministic.
- Every governed surface binding points to one real, reachable canonical screen/controller path with no duplicate surface-local truth.
- Migration manifest/runtime verification accepts the canonical immutable DSH migration history without renaming or rewriting applied SQL.
- No unauthorized financial owner, compatibility fork, fallback truth or unreachable obsolete binding remains.

## 6. Treatment / Execution

Execute bottom-up only after the above root is fixed at authoritative owners:

1. inspect payout contract + router/handler + consumers and resolve canonical DSH facade boundary;
2. correct assignment path parameter declarations;
3. reconcile each of the seven surface binding failures to actual navigation/controller ownership;
4. inspect migration manifest/runtime parser before selecting grammar fix versus any new forward-only migration metadata adjustment;
5. regenerate/reconcile affected generated clients if contract source changes;
6. remove only proven obsolete aliases/imports after consumer proof.

## 7. Consumers / Contracts / Data / Governance

| Item | Before | Required/Actual transition | After | Verification / disposition |
|---|---|---|---|---|
| DSH payout destination contract/router | declared operations without route registration | prove canonical facade owner then align contract + route/consumers | one reachable or intentionally removed canonical operation | backend API binding + affected tests |
| Field assignment OpenAPI | template variable undeclared | add required `assignmentId` parameter | valid operation contract | OpenAPI compose/lint/generated-client checks |
| DSH surface bindings | seven missing/unreachable mappings | bind registry to real canonical screen/controller/navigation graph | one reachable binding per governed feature | frontend feature binding + typecheck |
| DSH migration grammar | canonical 1000+ history rejected by verifier | align verifier/manifest grammar to immutable history if proven valid | runtime verifier accepts canonical history | migration manifest + runtime-real-bindings |

## 8. Cleanup

Remove only RC-001-related stale aliases, unreachable registry entries or redundant imports proven obsolete after consumers are reconciled. Do not rename applied migrations, add duplicate screens, preserve workaround routes, or leave TODO/FIXME/HACK residue.

## 9. Verification / Runtime / Evidence

| Evidence ID | Claim | Check/source | Candidate/runtime provenance | Result | Proof limit | Invalidation/reopen trigger |
|---|---|---|---|---|---|---|
| EV-RC001-01 | backend contract/router aligned | backend API binding gate | final task candidate | PENDING | static binding only | later contract/router mutation |
| EV-RC001-02 | governed surfaces reachable | frontend feature binding gate | final task candidate | PENDING | static navigation/controller binding | later surface/registry mutation |
| EV-RC001-03 | canonical migration history accepted | runtime-real-bindings + migration manifest drift | final task candidate | PENDING | static/runtime-binding policy | later migration/parser/manifest mutation |
| EV-RC001-04 | OpenAPI/generated provenance deterministic | compose/lint/provenance guards | final task candidate | PENDING | contract generation | later contract/generated-client mutation |
| EV-RC001-05 | affected DSH implementation remains valid | DSH Go/TS affected verification + contextual CI | final task candidate | PENDING | affected code | later relevant mutation |

## 10. Sequence Exit / Suspension / Reopen

`COMPLETE` is forbidden until implementation, consumers, cleanup and verification are all complete on one candidate and machine RC-001 state is reconciled. Suspend and re-rank if a higher upstream root appears. Reopen on later contract/router/surface/migration changes, failed exact-candidate verification or target-branch movement affecting the root graph.
