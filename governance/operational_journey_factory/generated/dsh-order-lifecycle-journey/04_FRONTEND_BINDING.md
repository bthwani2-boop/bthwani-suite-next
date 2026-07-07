# Frontend Binding

status: `DISCOVERY_PACKAGE_ONLY`

## Required Binding Chain

UI screen or section -> shared controller/view-model/API adapter -> generated DSH client -> OpenAPI operation -> backend route/handler/service -> database/config truth where applicable.

## app-client Binding

Files:

- `services/dsh/frontend/app-client/cart/CartScreen.tsx`
- `services/dsh/frontend/app-client/cart/PaymentDecisionSection.tsx`
- `services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx`
- `services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx`
- `services/dsh/frontend/app-client/orders/OrdersListScreen.tsx`
- `services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx`

Required bindings:

- Cart to checkout intent.
- Checkout intent to order creation.
- Client order list to client order API.
- Tracking screen to order tracking API.
- Payment decision to WLT boundary proof when financial state is involved.

Current blockers:

- `CheckoutScreen.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.
- `OrdersListScreen.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.
- Shared controller/view-model mapping remains unclassified.

## app-partner Binding

Files:

- `services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx`
- `services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderActionPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderConversationPanel.tsx`
- `services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx`

Required bindings:

- Order inbox to `listDshPartnerOrders`.
- Accept to `acceptDshOrder`.
- Reject to `rejectDshOrder`.
- Preparing to `markDshOrderPreparing`.
- Ready for pickup to `markDshOrderReadyForPickup`.
- Alerts/issues/conversation to support, incident, notification, or order event evidence.

Current blockers:

- `OrdersInboxScreen.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.
- `DshPartnerOrderRejectionScreen.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.
- `PartnerOrderAlertsPanel.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.
- `PartnerOrderIssuePanel.tsx`: `BUSINESS_LOGIC_IN_SURFACE`.

## app-captain Binding

Files:

- `services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainHomeOrderPanel.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainPickupDropoffScreen.tsx`
- `services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx`
- `services/dsh/frontend/app-captain/orders/OrderActionSection.tsx`
- `services/dsh/frontend/app-captain/orders/OrderInboxSection.tsx`
- `services/dsh/frontend/app-captain/orders/OrderProofSection.tsx`

Required bindings:

- Assignment inbox to `listDshCaptainAssignments`.
- Accept to `acceptDshAssignment`.
- Decline to `declineDshAssignment`.
- Delivery progress to `updateDshDeliveryStatus`.
- Proof of delivery to `submitDshPoD`.

Current blockers:

- Handler, permission, and state mapping for each captain action remain `BLOCKED_NEEDS_EVIDENCE`.

## control-panel Binding

Files:

- `services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx`
- `services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx`
- `services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx`
- `services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx`
- `services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx`
- `services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx`
- `services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx`
- `services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx`

Required bindings:

- Checkout activity to `listOperatorCheckoutIntents`.
- Live orders and order queue to `listDshOperatorOrders`.
- Operator cancel to `cancelDshOperatorOrder`.
- Dispatch assignment to `listDshDispatchAssignments` and `createDshAssignment`.
- Exceptions/escalations to incident, support, audit, or order rescue evidence.

Current blockers:

- Multiple operations screens have `BUSINESS_LOGIC_IN_SURFACE`.
- Operator intervention audit and rollback proof remains unclassified.

## Shared Layer Decision

- `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts` is the current shared order lifecycle candidate.
- It is flagged as `SHARED_API_LOGIC_MIXED`.
- It must receive a split, bind, or keep-with-proof decision before journey implementation.
