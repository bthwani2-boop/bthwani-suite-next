# Scope And Surfaces

status: `DISCOVERY_PACKAGE_ONLY`

## Journey Scope

This journey is a single business outcome across the unified full-stack multi-surface system. It is not a screen-only journey and not an API-only journey.

## Required Surfaces

### app-client

Required files:

- `services/dsh/frontend/app-client/cart/CartScreen.tsx`
- `services/dsh/frontend/app-client/cart/PaymentDecisionSection.tsx`
- `services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx`
- `services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx`
- `services/dsh/frontend/app-client/orders/OrdersListScreen.tsx`
- `services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx`

Current blockers:

- `CheckoutScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `OrdersListScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- UI action, icon, and state coverage must be inspected before execution.

### app-partner

Required files:

- `services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx`
- `services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderActionPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderConversationPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx`

Current blockers:

- `OrdersInboxScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `DshPartnerOrderRejectionScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `PartnerOrderAlertsPanel.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `PartnerOrderIssuePanel.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- Partner accept, reject, preparing, and ready actions require handler and permission proof.

### app-captain

Required files:

- `services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainHomeOrderPanel.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainPickupDropoffScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx`
- `services/dsh/frontend/app-captain/orders/OrderActionSection.tsx`
- `services/dsh/frontend/app-captain/orders/OrderInboxSection.tsx`
- `services/dsh/frontend/app-captain/orders/OrderProofSection.tsx`
- `services/dsh/frontend/app-captain/dispatch/DshCaptainOrdersScreen.tsx`

Current blockers:

- Assignment accept, decline, delivery status update, and PoD submit require API, permission, state, and audit proof.
- Map and pickup/dropoff runtime dependencies remain unclassified.

### control-panel operations

Required files:

- `services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx`
- `services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx`
- `services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx`
- `services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx`
- `services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx`
- `services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx`
- `services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx`
- `services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx`

Current blockers:

- `LiveOrdersScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `OrderRescueScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `DispatchAssignmentScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `CaptainOperationsScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `CommandCenterScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- `ExceptionsEscalationsScreen.tsx` has `BUSINESS_LOGIC_IN_SURFACE`.
- Operator cancel, assignment, rescue, exception, and escalation paths need backend/audit proof.

### shared order layer

Required file:

- `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts`

Current blocker:

- `dsh-order-lifecycle-client.ts` has `SHARED_API_LOGIC_MIXED` and requires a transport/domain split decision before execution.

### backend/API/database/runtime/CI

Required files and areas:

- `services/dsh/backend/internal/http/checkout.go`
- `services/dsh/backend/internal/http/orders.go`
- `services/dsh/backend/internal/http/dispatch.go`
- `services/dsh/contracts/dsh.openapi.yaml`
- `services/dsh/clients/generated/dsh-api.ts`
- DSH database migrations and table truth: `BLOCKED_NEEDS_EVIDENCE`
- runtime services and environment: `BLOCKED_NEEDS_EVIDENCE`
- CI and guards: `BLOCKED_NEEDS_EVIDENCE`

## Surface Exclusion Policy

No surface is excluded in this package. Any later exclusion requires source proof and a verification command.
