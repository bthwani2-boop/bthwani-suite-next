# File Decision Matrix

This matrix tracks all file status decisions (modified, created, split, or verified) within the scope of the DSH Order Lifecycle journey.

## Decisions Matrix

| File Path | Status | Action | Rationale |
|---|---|---|---|
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts` | `MODIFIED` | Rewrite | Changed to act as a backward-compatible export hub for split files. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.types.ts` | `CREATED` | Split | Houses type-safe record definitions. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts` | `CREATED` | Split | Houses capability flags. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.adapter.ts` | `CREATED` | Split | Houses order normalization mapping. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts` | `CREATED` | Split | Houses API fetch client construction. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.view-model.ts` | `CREATED` | Split | Houses UI presentation display models. |
| `services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts` | `CREATED` | Split | Houses React hook controllers. |
| `services/dsh/frontend/shared/partner/partner.types.ts` | `MODIFIED` | Restore | Restored activation types accidentally deleted in previous circular dependency fix. |
| `services/dsh/frontend/shared/partner/partner.workflow.ts` | `MODIFIED` | Edit | Exported types from `partner.types` and resolved `UiAuditRow` local redeclaration. |
| `services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx` | `VERIFIED` | None | Pure UI surface, business logic is correctly externalized. |
| `services/dsh/frontend/app-client/orders/OrdersListScreen.tsx` | `VERIFIED` | None | Pure UI surface, state mapped via shared controller. |
| `services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx` | `VERIFIED` | None | Pure UI surface, uses shared hooks. |
