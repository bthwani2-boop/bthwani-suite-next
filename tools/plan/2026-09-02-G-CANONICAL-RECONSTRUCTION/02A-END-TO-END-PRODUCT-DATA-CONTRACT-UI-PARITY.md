# 02A — END-TO-END PRODUCT / DATA / CONTRACT / UI PARITY

## Purpose

Prevent a structurally clean backend and a structurally clean frontend from drifting into two different product truths. Every material capability/journey on `g` must be proven as one continuous canonical vertical slice from product meaning to persisted truth and every required consumer/screen.

Layer separation is allowed and required where appropriate. Semantic separation is forbidden.

```text
BACKEND_FRONTEND_LAYER_SEPARATION=ALLOWED
BACKEND_FRONTEND_SEMANTIC_DIVERGENCE=FORBIDDEN
ONE_PRODUCT_MEANING=ONE_END_TO_END_TRUTH_CHAIN
```

## Mandatory vertical-slice chain

For every material capability/journey, establish where applicable:

```text
PRODUCT_MEANING
→ ACTOR
→ JOURNEY
→ STATE / TRANSITION / ALLOWED ACTION
→ CANONICAL DOMAIN OWNER
→ DATABASE / STORAGE TRUTH
→ CANONICAL MUTABLE WRITER
→ BACKEND SERVICE / USE CASE
→ API / EVENT / COMMAND
→ CANONICAL CONTRACT
→ GENERATED BINDING
→ FRONTEND DATA CONSUMER / QUERY / MUTATION / STORE
→ VIEW MODEL
→ COMPONENT
→ SCREEN / ROUTE
→ USER ACTION
→ MUTATION
→ PERSISTED READBACK
→ UPDATED USER-VISIBLE STATE
```

A layer may be `N/A` only when the capability genuinely does not require it. An unexplained break is `PARITY_GAP` and blocks root selection/closure.

## Cross-Layer Capability Matrix — mandatory

Create one record per material capability/journey:

```text
CAPABILITY=
ACTOR=
JOURNEY=
STATES_TRANSITIONS=
DOMAIN_OWNER=

DATABASE_TABLES_FIELDS=
CANONICAL_WRITER=
BACKEND_SERVICE=
BACKEND_USE_CASE=

API_ENDPOINT_EVENT_COMMAND=
REQUEST_SCHEMA=
RESPONSE_SCHEMA=
ERROR_SCHEMA=
CANONICAL_CONTRACT=
GENERATED_BINDING=

FRONTEND_CONSUMER=
QUERY_MUTATION_STORE=
VIEW_MODEL=
COMPONENTS=
SCREENS_ROUTES=

LOADING_STATE=
SUCCESS_STATE=
EMPTY_MISSING_STATE=
ERROR_STATE=
RETRY_STATE=
OFFLINE_DEGRADED_STATE=
AUTH_PERMISSION_STATE=
CONFLICT_CONCURRENCY_STATE=

USER_ACTIONS=
BACKEND_MUTATIONS=
PERSISTED_READBACK=
VISIBLE_FINAL_STATE=

PARALLEL_FRONTEND_TRUTH=
PARALLEL_BACKEND_TRUTH=
MANUAL_DTO_ENUM_MAPPING=
ORPHAN_ENDPOINT=
ORPHAN_SCREEN=
ORPHAN_BINDING=
ORPHAN_DB_TRUTH=
PARITY_GAPS=
PARITY_STATUS=PASS|FAIL
```

Before structural root selection:

```text
UNMAPPED_MATERIAL_CAPABILITIES=0
UNMAPPED_REQUIRED_SCREENS=0
UNMAPPED_REQUIRED_ENDPOINTS=0
UNMAPPED_REQUIRED_BINDINGS=0
UNRESOLVED_E2E_PARITY_GAPS=0
```

## Canonical authority law across layers

For every material product meaning:

```text
ONE PRODUCT MEANING
→ ONE DOMAIN OWNER
→ ONE DATA/STORAGE TRUTH WHERE APPLICABLE
→ ONE CANONICAL MUTABLE WRITER
→ ONE API/CONTRACT REPRESENTATION WHERE EXPOSED
→ GENERATED CLIENT BINDINGS WHERE GENERATION EXISTS
→ DERIVED FRONTEND CONSUMERS
→ ZERO MANUAL PARALLEL BUSINESS TRUTH
```

Frontend may own presentation/navigation/transient editing/animation state. It may not independently own backend/domain business truth such as permissions, eligibility, serviceability, financial state, order state, allowed actions, pricing/fees, availability, role/capability decisions, workflow transitions, or business validation.

If such truth is duplicated locally, treat the local copy as `SHADOW/PARALLEL_AUTHORITY` unless proven presentation-only.

## Contract/generated law

When a canonical contract/generated path exists, handwritten frontend/backend mirrors are suspicious by default:

`MANUAL DTO | MANUAL ENUM | MANUAL STATUS MAP | MANUAL API TYPE | MANUAL ERROR MAP | KEEP-IN-SYNC COMMENT`.

If duplicate semantics are proven:

```text
CANONICAL DOMAIN SEMANTICS
→ CANONICAL CONTRACT
→ REGENERATE
→ MIGRATE ALL BACKEND/FRONTEND CONSUMERS
→ DELETE MANUAL MIRROR
→ ZERO OLD REFERENCES
```

## Screen census and right-to-exist

Every material screen/route must answer:

```text
WHAT_CAPABILITY_DOES_IT_SERVE?
WHICH_ACTOR_AND_JOURNEY?
WHAT_BACKEND_CAPABILITY_SUPPORTS_IT?
WHAT_API_CONTRACT_BINDING_SUPPORTS_IT?
WHAT_QUERY_MUTATION_STORE_FEEDS_IT?
WHAT_BUSINESS_STATES_DOES_IT_RENDER?
WHAT_ACTIONS_CAN_THE_USER_TAKE?
WHAT_PERSISTED_RESULT_FOLLOWS?
IS_ANY_BUSINESS_TRUTH_HARDCODED_OR_LOCAL?
IS_ANY_MOCK/FALLBACK HIDING_MISSING_BACKEND?
IS_IT_DUPLICATED_BY_ANOTHER_SCREEN/FLOW?
IS_IT_STILL_REQUIRED?
```

Outcomes:

```text
REQUIRED + CORRECTLY CONNECTED → KEEP/HARDEN
REQUIRED + BACKEND/CONTRACT GAP → ROOT_OPEN; CONNECT CANONICALLY
DUPLICATE SCREEN/FLOW → SELECT WINNER → MIGRATE → DELETE LOSER
NOT REQUIRED / NO JOURNEY → DELETE_NOW WHEN LOW-RISK
MOCK/HARDCODED BUSINESS TRUTH → REPLACE WITH CANONICAL CHAIN OR DELETE FLOW
```

## Backend/API/data orphan law

An endpoint/service/handler/DTO/schema field/event/binding with no required consumer is not preserved just because it exists.

Search all possible consumers first: every app/surface, control panel, mobile clients, runtime calls, integrations, events/webhooks, scripts/tools, operations, tests where they represent a supported external behavior.

If no required consumer/authority remains and deletion is low-risk:

`PROVE NO REQUIRED CONSUMER → DELETE_NOW`.

If state/contract/migration-sensitive:

`MIGRATE/CUTOVER → DELETE`.

## Database lineage law

Do not require every DB column to appear in UI. Require every persisted product meaning to have a truthful lineage to all required consumers:

```text
DB/STORAGE TRUTH
→ WRITER
→ DOMAIN SEMANTICS
→ API/CONTRACT WHERE EXPOSED
→ GENERATED BINDING WHERE APPLICABLE
→ REQUIRED CONSUMER(S)
```

Backend-internal data is valid when its purpose/owner/consumers are proven. Orphan persisted truth is a deletion/migration candidate.

## Mandatory parity gate per product root

A material product root cannot close until all applicable checks pass:

```text
DATABASE_TO_BACKEND_PARITY=PASS_OR_NA
BACKEND_TO_API_PARITY=PASS_OR_NA
API_TO_CONTRACT_PARITY=PASS_OR_NA
CONTRACT_TO_GENERATED_PARITY=PASS_OR_NA
GENERATED_TO_FRONTEND_PARITY=PASS_OR_NA
FRONTEND_TO_SCREEN_PARITY=PASS_OR_NA
SCREEN_ACTION_TO_MUTATION_PARITY=PASS_OR_NA
MUTATION_TO_PERSISTED_READBACK=PASS_OR_NA
VISIBLE_FINAL_STATE_PARITY=PASS_OR_NA
ERROR_STATE_PARITY=PASS_OR_NA
AUTH_PERMISSION_PARITY=PASS_OR_NA
STATE_TRANSITION_PARITY=PASS_OR_NA

MANUAL_PARALLEL_DTO=0
MANUAL_PARALLEL_ENUM=0
MANUAL_PARALLEL_BUSINESS_MAPPING=0
FRONTEND_SHADOW_BUSINESS_TRUTH=0
BACKEND_SHADOW_BUSINESS_TRUTH=0
ORPHAN_REQUIRED_ENDPOINTS=0
ORPHAN_REQUIRED_SCREENS=0
ORPHAN_REQUIRED_BINDINGS=0
ORPHAN_REQUIRED_DB_TRUTH=0
UNRESOLVED_E2E_PARITY_GAPS=0
```

## Root synthesis effect

A parity break is not automatically an independent root. Correlate it with Current/Canonical/Structural Delta and collapse it under the highest causal owner.

Examples:

```text
FRONTEND LOCAL STATUS MAP + BACKEND ENUM + CONTRACT DRIFT
→ likely one canonical state/contract authority root

ORPHAN SCREEN + MOCK DATA + NO BACKEND CAPABILITY
→ capability ownership/completeness root or DELETE flow if no longer required

UNUSED API + UNUSED DTO + UNUSED DB FIELD
→ delete-now/decommission chain after complete consumer proof
```

## Final fixed-point requirement

Final `g` qualification requires a fresh branch-wide vertical parity sweep over all material capabilities/journeys and all required screens/APIs/contracts/bindings/data authorities.

```text
UNMAPPED_MATERIAL_CAPABILITIES=0
UNRESOLVED_E2E_PARITY_GAPS=0
FRONTEND_SHADOW_BUSINESS_TRUTH=0
BACKEND_SHADOW_BUSINESS_TRUTH=0
MANUAL_PARALLEL_DTO_ENUM_MAPPING=0
ORPHAN_REQUIRED_ENDPOINTS=0
ORPHAN_REQUIRED_SCREENS=0
ORPHAN_REQUIRED_BINDINGS=0
ORPHAN_REQUIRED_DB_TRUTH=0
END_TO_END_PRODUCT_DATA_CONTRACT_UI_PARITY=PASS
```

`CLEAN_BACKEND + CLEAN_FRONTEND + BROKEN_SEMANTIC_CHAIN = NOT CLOSED`.
