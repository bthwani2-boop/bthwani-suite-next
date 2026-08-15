# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: v5-all-surfaces-rootfix-20260815-2345
TARGET: كل الاسطح
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: A
TASK_BRANCH: task/v5-all-surfaces-rootfix-20260815-2345
BASE_SHA: bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7
LATEST_RECONCILED_SHA: bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7
ROOT: كل الاسطح
INTEGRATION_OWNER: chatgpt-github
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-SYSTEM | SYSTEM_ROOT | ROOT | BThwani surfaces are operating views over shared governed operational truth; DSH owns order lifecycle truth while WLT keeps financial authority. | PROVEN | EVD-ROOT |
| OP-ORDER | MATERIAL_JOURNEY | OP-SYSTEM | The canonical order journey spans authenticated client creation, partner acceptance/preparation, dispatch/captain transitions, exception/return paths, operator oversight and later event readback. | PROVEN | EVD-ROOT,EVD-NEGATIVE-SPACE |
| OP-PROVENANCE | AUTHORITY_INVARIANT | OP-ORDER | Every material canonical order transition must preserve the concrete acting identity separately from actor role whenever the authority is known. | PROVEN | EVD-LIFECYCLE,EVD-WRITERS,EVD-SCHEMA |
| OP-CONSUMERS | CROSS_SURFACE_HANDOFF | OP-PROVENANCE | Canonical status-event storage feeds operator order truth, shared frontend order-truth contracts and the order-event outbox, so lost provenance propagates beyond the local writer. | PROVEN | EVD-SCHEMA,EVD-READBACK |
| OP-PRIVACY | SECURITY_INVARIANT | OP-CONSUMERS | Raw stable actor identity is retained for operator investigation but redacted from client and partner order-truth responses that do not require cross-actor identity. | PROVEN | EVD-ROOT,EVD-READBACK |
| OP-MIGRATION | DATA_INVARIANT | OP-PROVENANCE | Forward writes must fail closed on blank actor identity without fabricating or rewriting historical rows whose true identity is unknown. | PROVEN | EVD-SCHEMA,EVD-MIGRATION-FRONTIER |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-ORDER-ACTOR-PROVENANCE | The order-event schema gained actor_id but the cutover was incomplete: the canonical transition primitive was partly repaired while direct lifecycle writers, authenticated creation, operator readback and the outbox still lose known actor identity; the database still permits new blank actor_id values. | OP-PROVENANCE | EVD-LIFECYCLE,EVD-WRITERS,EVD-SCHEMA,EVD-READBACK,EVD-ADVERSARIAL | NONE | CNS-EVENT-DB,CNS-OUTBOX,CNS-OPERATOR,CNS-SURFACES | One coherent cutover restores responsibility attribution across creation, partner, dispatch/captain, cancellation/return and operator investigation while preventing future role-only writes. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-DIRECT-WRITERS | RC-ORDER-ACTOR-PROVENANCE | Partner decision and preparation still insert dsh_order_status_events with actor_role only even though input.ActorID or actorID is available; remaining exception/cancellation writers are in the same cutover cone. | PROMOTED | EVD-WRITERS |
| FINDING | FND-CREATION | RC-ORDER-ACTOR-PROVENANCE | Authenticated order creation still records order.created without preserving the concrete client identity in canonical event provenance. | PROMOTED | EVD-READBACK |
| FINDING | FND-OUTBOX | RC-ORDER-ACTOR-PROVENANCE | dsh_publish_order_event_to_outbox serializes actorRole but omits actorId. | PROMOTED | EVD-SCHEMA |
| FINDING | FND-READBACK | RC-ORDER-ACTOR-PROVENANCE | Canonical order-truth readback/shared contract does not expose actorId for operator-scoped investigation and therefore cannot selectively redact it for lower-authority surfaces. | PROMOTED | EVD-READBACK |
| FINDING | FND-FORWARD-GUARD | RC-ORDER-ACTOR-PROVENANCE | dsh_order_status_events.actor_id is NOT NULL but defaults to empty string, so new role-only writers remain accepted. | PROMOTED | EVD-SCHEMA |
| DECISION | DEC-ATTRIBUTION | RC-ORDER-ACTOR-PROVENANCE | Preserve concrete actor identity on every governed order event; service-generated events use explicit service identity and actor role remains a separate field. | DONE | EVD-ROOT,EVD-ADVERSARIAL |
| DECISION | DEC-PRIVACY | RC-ORDER-ACTOR-PROVENANCE | Retain actorId in canonical storage/outbox and operator order-truth readback; redact actorId from client and partner readback. | DONE | EVD-ROOT,EVD-READBACK |
| CONSUMER | CNS-EVENT-DB | RC-ORDER-ACTOR-PROVENANCE | dsh_order_status_events and all production writers consume the canonical provenance invariant. | DONE | EVD-SCHEMA,EVD-WRITERS |
| CONSUMER | CNS-OUTBOX | RC-ORDER-ACTOR-PROVENANCE | dsh_order_event_outbox receives the canonical order-event envelope. | DONE | EVD-SCHEMA |
| CONSUMER | CNS-OPERATOR | RC-ORDER-ACTOR-PROVENANCE | Operator order-truth investigation needs concrete actor provenance. | DONE | EVD-READBACK |
| CONSUMER | CNS-SURFACES | RC-ORDER-ACTOR-PROVENANCE | Shared order-truth contract is consumed by client, partner and operator-facing surfaces with role-specific redaction. | DONE | EVD-READBACK |
| DEPENDENCY | DEP-MIGRATION | RC-ORDER-ACTOR-PROVENANCE | The immutable migration frontier already uses 1008 for checkout snapshot truth; actor provenance must use the next proven frontier 1009 / ordinal 256. | DISPOSITIONED | EVD-MIGRATION-FRONTIER |
| SCOPE_DELTA | SCOPE-ALL-SURFACES | RC-ORDER-ACTOR-PROVENANCE | TARGET includes all surfaces; this root crosses DSH lifecycle writers, data, outbox, operator readback and shared client contracts but does not change WLT financial ownership. | RESOLVED | EVD-ROOT,EVD-NEGATIVE-SPACE |
| LOWER_LAYER | LOW-PRIMITIVE | RC-ORDER-ACTOR-PROVENANCE | TransitionDispatchOrder/transitionOrderTx already require and persist actorID after the earlier partial cutover; this is supporting evidence, not closure of the root. | DISPOSITIONED | EVD-LIFECYCLE |
| LOWER_LAYER | LOW-STAGE2-AUTOMATION | RC-ORDER-ACTOR-PROVENANCE | The old Stage-2 workflow is pinned to stale base babc873... and its temporary script still targets migration 1008, so it cannot be execution authority after the merged foreign delta. | DISPOSITIONED | EVD-MIGRATION-FRONTIER,EVD-ADVERSARIAL |
| CLEANUP | CLN-TEMP-STAGE2 | RC-ORDER-ACTOR-PROVENANCE | Remove the temporary Python mutator and obsolete branch-specific Stage-2 workflow after the governed cutover; neither may remain as parallel execution truth. | PLANNED | EVD-VERIFICATION-PLAN |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WORK-ACTOR-PROVENANCE-CUTOVER | RC-ORDER-ACTOR-PROVENANCE | NONE | Coherent cutover of all writers, creation, operator-only readback, outbox payload, forward-only DB guard, generated contracts and obsolete Stage-2 cleanup. | dsh-order-event-provenance | chatgpt-github | NO | READY | EVD-VERIFICATION-PLAN,EVD-LIFECYCLE,EVD-WRITERS,EVD-SCHEMA,EVD-MIGRATION-FRONTIER |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Current A integrates the prior system/checkout/workspace roots; authoritative product/platform files are unchanged from the previously proven authority model, and current diagnosis starts at the unified order journey rather than a local code symptom. | compare babc873..A plus governance/product/PRD.md and governance/product/platform-model.yaml provenance from integrated V5 packages | BASE_SHA | GitHub remote A=bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7 | PASS | Invalidated by authoritative product/ownership change or integration-head movement. |
| EVD-NEGATIVE-SPACE | Review covered authenticated creation, partner decision/preparation, canonical transition primitive, dispatch/captain callers, cancellation/return cone, event storage, outbox, operator readback and shared surface contract; checkout snapshot root is already resolved and no higher operational cause was found. | integrated V5 root packages reconciled against current lifecycle.go, decision.go, preparation.go, dsh-902/dsh-903 and migration manifest | BASE_SHA | GitHub task branch from exact merged A | PASS | Invalidated by a newly discovered higher-authority writer/consumer or root-changing foreign delta. |
| EVD-ADVERSARIAL | The defect is not missing identity availability or schema capability: current transitionOrderTx rejects blank actorID and persists it, partner writers already receive ActorID, and dsh-902 already has actor_id; the incomplete cutover alone drops identity. | lifecycle.go; decision.go; preparation.go; dsh-902_order_truth.sql | BASE_SHA | GitHub task branch | PASS | Invalidated if a material writer is proven unable to derive a legitimate actor/service identity. |
| EVD-VERIFICATION-PLAN | Before integration, fail closed on every production status-event writer omitting actor_id; apply migrations to PostgreSQL; prove NOT VALID forward guard rejects blank new actor_id without fabricating historical values; prove outbox contains actorId; run all DSH Go tests, OpenAPI verify/generate/typecheck, migration manifest and governance gates, then final exact-candidate adversarial verification. | governed Stage-2 test sequence adapted to this task and current migration frontier | BASE_SHA | task branch / PostgreSQL 16 CI | PASS | Invalidated by solution-scope change, migration-frontier movement, or candidate source write after verification. |
| EVD-LIFECYCLE | Current canonical transitionOrderTx requires nonblank actorID and inserts actor_id, proving the primitive half of the cutover is already present. | services/dsh/backend/internal/orders/lifecycle.go | BASE_SHA | GitHub task branch | PASS | Invalidated by lifecycle.go change. |
| EVD-WRITERS | Current partner decision and preparation writers possess actor identity but still write actor_role-only canonical events. | services/dsh/backend/internal/orders/decision.go; services/dsh/backend/internal/orders/preparation.go | BASE_SHA | GitHub task branch | PASS | Invalidated by affected writer change. |
| EVD-SCHEMA | dsh-902 defines actor_id with empty-string default and dsh-903 outbox payload includes actorRole but not actorId. | services/dsh/database/migrations/dsh-902_order_truth.sql; dsh-903_order_event_runtime.sql | BASE_SHA | GitHub task branch | PASS | Invalidated by order-event migration/function change. |
| EVD-READBACK | Integrated prior diagnosis and current source establish that actor provenance is not yet carried through operator order-truth/shared contract; privacy requires operator retention and client/partner redaction. | services/dsh/backend/internal/orders/order_truth.go; order_truth_queries.go; services/dsh/frontend/shared/order-truth/order-truth.types.ts | BASE_SHA | GitHub task branch | PASS | Invalidated by readback/type/redaction change. |
| EVD-MIGRATION-FRONTIER | Current manifest extension frontier is ordinal 255 / dsh-1008_checkout_order_item_snapshot_truth.sql, so actor provenance must be the next immutable migration 1009 / ordinal 256. | services/dsh/database/migrations/manifest.extensions.json | BASE_SHA | GitHub task branch | PASS | Invalidated by any new DSH migration before execution. |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: PENDING
- Runtime/product evidence: PENDING
- Cleanup: PENDING
- Governance: PENDING
- Final adversarial: PENDING
