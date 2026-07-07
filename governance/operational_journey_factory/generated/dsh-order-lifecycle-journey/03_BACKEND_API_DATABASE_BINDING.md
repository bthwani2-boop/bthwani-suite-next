# Backend API Database Binding

status: `DISCOVERY_PACKAGE_ONLY`

## Backend Source Candidates

- `services/dsh/backend/internal/http/checkout.go`
- `services/dsh/backend/internal/http/orders.go`
- `services/dsh/backend/internal/http/dispatch.go`
- `services/dsh/backend/internal/http/server.go`

## Contract And Client Sources

- OpenAPI contract: `services/dsh/contracts/dsh.openapi.yaml`
- Generated client: `services/dsh/clients/generated/dsh-api.ts`

## Required OpenAPI Operations

Checkout operations:

- `createDshCheckoutIntent`
- `getDshCheckoutIntent`
- `cancelDshCheckoutIntent`
- `listOperatorCheckoutIntents`

Client order operations:

- `createDshOrder`
- `listDshClientOrders`
- `getDshClientOrder`
- `getDshClientOrderTracking`

Partner order operations:

- `listDshPartnerOrders`
- `acceptDshOrder`
- `rejectDshOrder`
- `markDshOrderPreparing`
- `markDshOrderReadyForPickup`

Operator order operations:

- `listDshOperatorOrders`
- `cancelDshOperatorOrder`

Dispatch and captain operations:

- `listDshDispatchAssignments`
- `createDshAssignment`
- `listDshCaptainAssignments`
- `acceptDshAssignment`
- `declineDshAssignment`
- `updateDshDeliveryStatus`
- `submitDshPoD`

## Binding Requirements

Each operation must be mapped before implementation to:

- HTTP method and path in OpenAPI.
- Generated client operation/type.
- Backend route registration.
- Backend handler.
- Service/domain owner.
- Repository/database truth when applicable.
- Permission or policy enforcement.
- Error mapping.
- Audit event and rollback or compensation path when applicable.

## Current Backend/API Decisions

- OpenAPI operation evidence exists for checkout, order, partner order, operator order, dispatch, captain assignment, delivery status, PoD, and tracking paths.
- Backend route candidate files exist for checkout, orders, and dispatch.
- Generated DSH client exists.
- Precise operation-to-handler mapping remains `BLOCKED_NEEDS_EVIDENCE`.
- Database table, migration, constraint, index, transaction, idempotency, and audit truth remain `BLOCKED_NEEDS_EVIDENCE`.

## WLT Boundary

- WLT owns payment session, settlement, refund, commission, COD, wallet, and ledger truth.
- DSH order lifecycle may request or display financial state but must not own financial mutation truth.
- Any payment, refund, settlement, commission, COD, or ledger dependency must be bound through WLT evidence before implementation.
