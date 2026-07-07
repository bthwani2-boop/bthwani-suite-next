# Backend API and Database Binding Plan

This document maps OpenAPI operations to their corresponding backend routes, handlers, services, and database tables to prove complete integration trace.

## Operation Mapping Matrix

| OpenAPI operationId | HTTP Route | Go Handler | Service Method / Db Table |
|---|---|---|---|
| `createDshCheckoutIntent` | `POST /dsh/client/checkout-intents` | `checkoutHandler.CreateIntent` | `checkout_intents` table |
| `getDshCheckoutIntent` | `GET /dsh/client/checkout-intents/{intentId}` | `checkoutHandler.GetIntent` | `checkout_intents` table |
| `cancelDshCheckoutIntent` | `POST /dsh/client/checkout-intents/{intentId}/cancel` | `checkoutHandler.CancelIntent` | `checkout_intents` table |
| `listOperatorCheckoutIntents` | `GET /dsh/operator/checkout-intents` | `checkoutHandler.ListOperatorIntents` | `checkout_intents` table |
| `createDshOrder` | `POST /dsh/client/orders` | `ordersHandler.CreateOrder` | `orders`, `order_items` tables |
| `listDshClientOrders` | `GET /dsh/client/orders` | `ordersHandler.ListClientOrders` | `orders` table |
| `getDshClientOrder` | `GET /dsh/client/orders/{orderId}` | `ordersHandler.GetClientOrder` | `orders` table |
| `getDshClientOrderTracking` | `GET /dsh/client/orders/{orderId}/tracking` | `ordersHandler.GetTracking` | `dispatch_assignments` table |
| `listDshPartnerOrders` | `GET /dsh/partner/orders` | `ordersHandler.ListPartnerOrders` | `orders` table |
| `acceptDshOrder` | `POST /dsh/partner/orders/{orderId}/accept` | `ordersHandler.AcceptOrder` | `orders` table |
| `rejectDshOrder` | `POST /dsh/partner/orders/{orderId}/reject` | `ordersHandler.RejectOrder` | `orders` table |
| `markDshOrderPreparing` | `POST /dsh/partner/orders/{orderId}/preparing` | `ordersHandler.MarkPreparing` | `orders` table |
| `markDshOrderReadyForPickup` | `POST /dsh/partner/orders/{orderId}/ready` | `ordersHandler.MarkReady` | `orders` table |
| `listDshOperatorOrders` | `GET /dsh/operator/orders` | `ordersHandler.ListOperatorOrders` | `orders` table |
| `cancelDshOperatorOrder` | `POST /dsh/operator/orders/{orderId}/cancel` | `ordersHandler.CancelOperatorOrder` | `orders` table |
| `listDshDispatchAssignments` | `GET /dsh/operator/dispatch/assignments` | `dispatchHandler.ListAssignments` | `dispatch_assignments` table |
| `createDshAssignment` | `POST /dsh/operator/dispatch/assignments` | `dispatchHandler.CreateAssignment` | `dispatch_assignments` table |
| `listDshCaptainAssignments` | `GET /dsh/captain/dispatch/assignments` | `dispatchHandler.ListCaptainAssignments` | `dispatch_assignments` table |
| `acceptDshAssignment` | `POST /dsh/captain/dispatch/assignments/{assignmentId}/accept` | `dispatchHandler.AcceptAssignment` | `dispatch_assignments` table |
| `declineDshAssignment` | `POST /dsh/captain/dispatch/assignments/{assignmentId}/decline` | `dispatchHandler.DeclineAssignment` | `dispatch_assignments` table |
| `updateDshDeliveryStatus` | `POST /dsh/captain/dispatch/assignments/{assignmentId}/status` | `dispatchHandler.UpdateStatus` | `dispatch_assignments` table |
| `submitDshPoD` | `POST /dsh/captain/dispatch/assignments/{assignmentId}/pod` | `dispatchHandler.SubmitPoD` | `dispatch_assignments` table |

## Database Schema Truth
- **orders**: contains `id`, `store_id`, `client_id`, `status`, `total_price`, `checkout_intent_id`, `wlt_payment_ref_id`, `captain_id`, `created_at`, `updated_at`.
- **order_items**: contains `id`, `order_id`, `product_id`, `quantity`, `price`.
- **dispatch_assignments**: contains `id`, `order_id`, `captain_id`, `status`, `created_at`, `updated_at`.
- **order_status_events**: contains `id`, `order_id`, `actor`, `from_status`, `to_status`, `note`, `created_at`.
