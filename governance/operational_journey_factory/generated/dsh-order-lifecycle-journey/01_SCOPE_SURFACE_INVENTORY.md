# Scope and Surface Inventory

This file inventories all frontend and backend surfaces active in the DSH Order Lifecycle.

## Active Surfaces

### 1. app-client
- [CheckoutScreen.tsx](services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx) — renders checkout checkout intents, transitions to order creation.
- [OrdersListScreen.tsx](services/dsh/frontend/app-client/orders/OrdersListScreen.tsx) — lists order history and current active orders.
- [OrderTrackingScreen.tsx](services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx) — tracks active order status, shows captain en-route states.

### 2. app-partner
- [OrdersInboxScreen.tsx](services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx) — main order inbox with stages (acceptance, preparing, ready, handoff).
- [DshPartnerOrderRejectionScreen.tsx](services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx) — rejection form when store declines order.
- [PartnerOrderAlertsPanel.tsx](services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx) — SLA warnings and quick actions.
- [PartnerOrderIssuePanel.tsx](services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx) — issue registration and courier delays.

### 3. app-captain
- [TaskInboxScreen.tsx](services/dsh/frontend/app-captain/tasks/TaskInboxScreen.tsx) — captain task acceptance/decline surface.
- [ActiveTaskScreen.tsx](services/dsh/frontend/app-captain/tasks/ActiveTaskScreen.tsx) — active delivery en-route, arrived, and POD submit flow.

### 4. control-panel
- [LiveOrdersScreen.tsx](services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx) — operations live order grid.
- [OrderRescueScreen.tsx](services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx) — manual override for stranded/exception orders.
- [DispatchAssignmentScreen.tsx](services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx) — captain dispatch and matching control panel.
- [CaptainOperationsScreen.tsx](services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx) — captain status and live maps.
- [CommandCenterScreen.tsx](services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx) — high-level serviceability metrics.
- [ExceptionsEscalationsScreen.tsx](services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx) — support escalation queues.

### 5. shared order layer
- [dsh-order-lifecycle-client.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts) — SSoT export hub.
- [dsh-order-lifecycle.types.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.types.ts) — types.
- [dsh-order-lifecycle.policy.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts) — policy capabilities.
- [dsh-order-lifecycle.adapter.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.adapter.ts) — normalization.
- [dsh-order-lifecycle.transport.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts) — fetch client.
- [dsh-order-lifecycle.view-model.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.view-model.ts) — view-model presentation.
- [dsh-order-lifecycle.controller.ts](services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts) — React controller hook.

### 6. backend api
- [checkout.go](services/dsh/backend/internal/http/checkout.go)
- [orders.go](services/dsh/backend/internal/http/orders.go)
- [dispatch.go](services/dsh/backend/internal/http/dispatch.go)
- [server.go](services/dsh/backend/internal/http/server.go)
