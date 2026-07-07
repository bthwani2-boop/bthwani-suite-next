# Cleanup File Decisions

status: `DISCOVERY_PACKAGE_ONLY`

## Decision Vocabulary

Every related file, export, helper, component, route, generated binding, and shared client must receive one of these decisions before implementation:

- `KEEP_ACTIVE`
- `BIND_TO_ROUTE`
- `BIND_TO_SHARED`
- `MOVE_TO_OWNER`
- `MERGE_DUPLICATE`
- `SPLIT_REFACTOR`
- `RETIRE_DEAD`
- `DELETE_AFTER_PROOF`
- `FALSE_POSITIVE_WITH_PROOF`
- `BLOCKED_NEEDS_EVIDENCE`
- `FIX_REQUIRED`

## Current File Decisions

### app-client

- `services/dsh/frontend/app-client/cart/CartScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-client/cart/PaymentDecisionSection.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-client/orders/OrdersListScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`

### app-partner

- `services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/app-partner/orders/PartnerOrderActionPanel.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/app-partner/orders/PartnerOrderConversationPanel.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx`: `FIX_REQUIRED`

### app-captain

- `services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/DshCaptainHomeOrderPanel.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/DshCaptainPickupDropoffScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/OrderActionSection.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/OrderInboxSection.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/app-captain/orders/OrderProofSection.tsx`: `BLOCKED_NEEDS_EVIDENCE`

### control-panel operations

- `services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx`: `FIX_REQUIRED`
- `services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx`: `FIX_REQUIRED`

### shared/backend/API

- `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts`: `FIX_REQUIRED`
- `services/dsh/backend/internal/http/checkout.go`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/backend/internal/http/orders.go`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/backend/internal/http/dispatch.go`: `BLOCKED_NEEDS_EVIDENCE`
- `services/dsh/contracts/dsh.openapi.yaml`: `KEEP_ACTIVE`
- `services/dsh/clients/generated/dsh-api.ts`: `KEEP_ACTIVE`

## Delete Policy

No file in this journey has a delete decision. Any future `DELETE_AFTER_PROOF` decision requires proof from imports, exports, routes, navigation, runtime map, service manifest, capability map, generated clients, tests, and CI/guards.
