# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: v5-first-top-logic-gap-20260815
TARGET: كل الوركسبايس
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: A
TASK_BRANCH: task/v5-first-top-logic-gap-20260815
BASE_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
LATEST_RECONCILED_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
ROOT: كل الوركسبايس
INTEGRATION_OWNER: chatgpt-github
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-SYSTEM | SYSTEM_ROOT | NONE | BThwani is one unified multi-surface platform; app-client, app-partner, app-captain, app-field, control-panel and service-owned backends are operating views over governed shared truth. | PROVEN | EVD-PRD,EVD-PLATFORM |
| OP-DSH | DOMAIN_OWNER | OP-SYSTEM | DSH owns commerce, checkout/order operational truth, dispatch, delivery, custody/handoff and operational exceptions. | PROVEN | EVD-PRD,EVD-PLATFORM |
| OP-WLT | DOMAIN_OWNER | OP-SYSTEM | WLT exclusively owns authoritative financial truth while DSH may retain bounded WLT-backed operational projections. | PROVEN | EVD-PRD,EVD-WLT-CONTROL |
| OP-ORDER-JOURNEY | JOURNEY | OP-DSH | The canonical order journey spans authenticated creation, partner decision/preparation, dispatch/captain progress, pickup/partner-delivery variants, cancellation/return and canonical event/readback propagation. | PROVEN | EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS,EVD-READBACK |
| OP-AUTHORITY-PROVENANCE | AUTHORITY_INVARIANT | OP-ORDER-JOURNEY | Material order transitions have an acting authority and the canonical event schema contains actor_id so responsibility can be preserved without conflating role with identity. | PROVEN | EVD-ORDER-SCHEMA,EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS |
| OP-EVENT-CONSUMERS | CONSUMER_PATH | OP-ORDER-JOURNEY | Order status events feed canonical order truth timelines and the order-event outbox, so event-envelope defects propagate beyond the local writer. | PROVEN | EVD-READBACK,EVD-ORDER-SCHEMA |
| OP-PRIVACY | SECURITY_INVARIANT | OP-SYSTEM | Stable actor identifiers are useful for investigation but must be minimized/redacted for surfaces that do not require raw cross-actor identity. | PROVEN | EVD-PRD,EVD-READBACK |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-ORDER-ACTOR-PROVENANCE | The order-event schema was upgraded to actor_id but the canonical transition primitive, multiple direct writers, readback contract, and outbox envelope were not cut over coherently; role-only legacy writes therefore discard known actor identity and order creation is misattributed as system. | OP-AUTHORITY-PROVENANCE | EVD-ORDER-SCHEMA,EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS,EVD-WLT-CONTROL,EVD-READBACK | NONE | CNS-OPERATOR-AUDIT,CNS-ORDER-TIMELINE,CNS-ORDER-OUTBOX,CNS-CROSS-SURFACE | Restoring one canonical provenance invariant repairs creation, partner, operator, captain, pickup, partner-delivery and return transitions and makes downstream event/readback responsibility trustworthy without changing WLT ownership. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-ACTOR-ID-DROPPED | RC-ORDER-ACTOR-PROVENANCE | Known authenticated actor IDs are dropped by role-only dsh_order_status_events inserts and by TransitionDispatchOrder. | PROMOTED | EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS |
| FINDING | FND-CREATION-MISATTRIBUTED | RC-ORDER-ACTOR-PROVENANCE | Authenticated client order creation records order.created as actor_role=system with empty actor_id despite actor.ID being available. | PROMOTED | EVD-ORDER-WRITERS |
| FINDING | FND-READBACK-OMITS-ACTOR | RC-ORDER-ACTOR-PROVENANCE | OrderTruthEvent and shared TypeScript OrderTruthEvent omit actorId, preventing operator readback from recovering stored provenance. | PROMOTED | EVD-READBACK |
| FINDING | FND-OUTBOX-OMITS-ACTOR | RC-ORDER-ACTOR-PROVENANCE | The canonical order-event outbox payload excludes actorId even when the status-event row contains it. | PROMOTED | EVD-ORDER-SCHEMA |
| DECISION | DEC-CANONICAL-ATTRIBUTION | RC-ORDER-ACTOR-PROVENANCE | Preserve concrete actor identity at every canonical transition; use explicit service identity for service-generated events and preserve role separately. | DONE | EVD-PRD,EVD-WLT-CONTROL |
| DECISION | DEC-PRIVACY-READBACK | RC-ORDER-ACTOR-PROVENANCE | Expose actorId only to operator order-truth readback; redact it for client and partner surfaces while retaining canonical storage/outbox provenance. | DONE | EVD-PRD,EVD-READBACK |
| CONSUMER | CNS-OPERATOR-AUDIT | RC-ORDER-ACTOR-PROVENANCE | Operator investigation and responsibility tracing consume canonical order truth. | DONE | EVD-PRD,EVD-READBACK |
| CONSUMER | CNS-ORDER-TIMELINE | RC-ORDER-ACTOR-PROVENANCE | Canonical order timeline reads dsh_order_status_events. | DONE | EVD-READBACK |
| CONSUMER | CNS-ORDER-OUTBOX | RC-ORDER-ACTOR-PROVENANCE | Order-event outbox is populated from status events and must retain event provenance. | DONE | EVD-ORDER-SCHEMA |
| CONSUMER | CNS-CROSS-SURFACE | RC-ORDER-ACTOR-PROVENANCE | Client/partner/control-panel shared order-truth contract consumes the same event envelope with privacy-specific redaction. | DONE | EVD-READBACK |
| DEPENDENCY | DEP-SCHEMA-GUARD | RC-ORDER-ACTOR-PROVENANCE | New event writes need a database fail-closed invariant so another role-only writer cannot silently reintroduce empty actor_id. | DISPOSITIONED | EVD-ORDER-SCHEMA |
| DEPENDENCY | DEP-CALLER-PLUMBING | RC-ORDER-ACTOR-PROVENANCE | TransitionDispatchOrder callers already possess actorID/captainID and must pass it into the canonical primitive. | DISPOSITIONED | EVD-DISPATCH-WRITERS |
| CLEANUP | CLN-LEGACY-WRITERS | RC-ORDER-ACTOR-PROVENANCE | Remove remaining role-only canonical event writes in the affected order lifecycle rather than retaining compatibility fallbacks. | DISPOSITIONED | EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS |
| LOWER_LAYER | LL-WLT-PROJECTION | RC-ORDER-ACTOR-PROVENANCE | WLT projection writer already supplies actor_id=wlt; it is control evidence that schema supports explicit actor provenance and is not the root. | DISPOSITIONED | EVD-WLT-CONTROL |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WRK-CANONICAL-PRIMITIVE | RC-ORDER-ACTOR-PROVENANCE | NONE | Blocks all trustworthy order transition attribution; unlocks dispatch, pickup, partner-delivery and handoff callers. | services/dsh/backend/internal/orders | chatgpt-github | NO | READY | EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS |
| WRK-DIRECT-WRITERS | RC-ORDER-ACTOR-PROVENANCE | WRK-CANONICAL-PRIMITIVE | Removes direct role-only writes in creation, partner decision/preparation, cancellation and delivery-exception returns. | services/dsh/backend/internal/orders,services/dsh/backend/internal/dispatch | chatgpt-github | NO | WAITING | EVD-ORDER-WRITERS,EVD-DISPATCH-WRITERS |
| WRK-CONTRACT-READBACK | RC-ORDER-ACTOR-PROVENANCE | WRK-CANONICAL-PRIMITIVE | Restores operator provenance readback while preserving client/partner privacy. | services/dsh/backend/internal/orders,services/dsh/frontend/shared/order-truth | chatgpt-github | NO | WAITING | EVD-READBACK |
| WRK-DATABASE-FAIL-CLOSED | RC-ORDER-ACTOR-PROVENANCE | WRK-DIRECT-WRITERS,WRK-CONTRACT-READBACK | Prevents new empty actor_id events and emits actorId in canonical outbox payload; preserves legacy rows without fabricating identity. | services/dsh/database/migrations | chatgpt-github | NO | WAITING | EVD-ORDER-SCHEMA |
| WRK-VERIFY-ADVERSARIAL | RC-ORDER-ACTOR-PROVENANCE | WRK-DATABASE-FAIL-CLOSED | Proves all writers pass concrete identity, privacy redaction is enforced, tests/guards are green and no role-only canonical writer remains. | tests,guards,ci,runtime | independent-review | NO | WAITING | EVD-PRD,EVD-ORDER-SCHEMA |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Diagnosis began at the workspace operational root, established the unified platform and DSH/WLT authority split, then descended through the canonical order journey to the responsibility-provenance invariant before ranking any technical defect. | governance/product/PRD.md + governance/product/platform-model.yaml + pinned workspace/app/service tree | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by integration-head movement or authoritative operational-model change. |
| EVD-NEGATIVE-SPACE | Negative-space review checked all five product surfaces, DSH/WLT ownership boundaries, alternate fulfillment paths, direct and helper transition writers, event outbox and readback; no evidence showed a higher operational parent or separate root outranking the incomplete actor-provenance cutover. | pinned apps/services trees + order/dispatch/pickup/partner-delivery/WLT writers + order-truth readback | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by a previously unseen higher-authority writer/consumer or newer integration truth. |
| EVD-ADVERSARIAL | Adversarial diagnosis disproved the alternatives that actor provenance is unsupported by schema or unavailable at callers: dsh-902 contains actor_id, WLT writes explicit actor_id=wlt, and affected DSH callers already possess actorID/captainID while only the legacy cutover drops it. | dsh-902_order_truth.sql + wlt_events.go + lifecycle/dispatch/handoff/pickup/partner-delivery writers | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated if a writer without derivable actor identity is found or schema ownership changes. |
| EVD-VERIFICATION-PLAN | Verification is fail-closed: compile/test every DSH package, inventory every TransitionDispatchOrder caller and direct status-event writer, verify operator-only actorId readback redaction, enforce a DB guard for future writes, exercise runtime migration/readback, run diff security review and final adversarial V5 gates on the exact candidate. | V5 Frontier + CodeRabbit review skill + Codex Security diff-scan skill + orchestrator close requirements | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A / planned exact task candidate | PASS | Invalidated by scope expansion, candidate movement, untested changed file or unavailable required runtime evidence. |
| EVD-PRD | Product truth defines a unified multi-surface platform, DSH operational ownership, canonical write/readback and privacy minimization requirements. | governance/product/PRD.md at pinned branch A SHA | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by newer integration SHA or authoritative product-truth change. |
| EVD-PLATFORM | Actors include operator/partner/captain/field/customer and DSH owns operational truth while WLT owns financial truth. | governance/product/platform-model.yaml at pinned branch A SHA | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by newer integration SHA or platform-model change. |
| EVD-ORDER-SCHEMA | dsh_order_status_events contains actor_id and dsh-903 enriches/outboxes events but does not derive real actor identity and omits actorId from payload. | services/dsh/database/migrations/dsh-902_order_truth.sql + dsh-903_order_event_runtime.sql | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by migration/runtime trigger changes. |
| EVD-ORDER-WRITERS | Creation, partner decision/preparation, transition helper and cancellation possess actor identity but canonical status-event writes omit it; creation uses system/empty despite authenticated client input. | services/dsh/backend/internal/orders/order_truth.go,decision.go,preparation.go,lifecycle.go,cancellation_saga.go + HTTP creation handler | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by changes to these writers or authentication handoff. |
| EVD-DISPATCH-WRITERS | Dispatch, store-captain handoff, return flows, pickup and partner-delivery callers have actorID/captainID yet TransitionDispatchOrder/direct event writes preserve only actorRole. | dispatch.go,store_captain_handoff.go,delivery_exceptions.go,pickup/service.go,partnerdelivery/service.go | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by changes to dispatch/pickup/partner-delivery transition paths. |
| EVD-WLT-CONTROL | WLT payment projection event explicitly writes actor_id=wlt, proving explicit service attribution already works in the same schema. | services/dsh/backend/internal/http/wlt_events.go | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by WLT projection writer change. |
| EVD-READBACK | Go OrderTruthEvent and shared TypeScript OrderTruthEvent omit actorId; current redaction also provides the boundary where raw actor identity can be hidden from client/partner and retained for operator. | order_truth.go,order_truth_queries.go,frontend/shared/order-truth/order-truth.types.ts | babc873b6b2e712efbe082e37d1bcec977fc3d8d | GitHub remote branch A | PASS | Invalidated by readback/type/redaction contract changes. |

## Closure

- Integration head: PENDING
- Final candidate: PENDING
- Verification: PENDING
- Runtime/product evidence: PENDING
- Cleanup: PENDING
- Governance: PENDING
- Final adversarial: PENDING
