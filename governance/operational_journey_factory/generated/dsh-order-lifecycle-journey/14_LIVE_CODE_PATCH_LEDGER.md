# Live Code Patch Ledger

This file tracks live code changes performed to satisfy the journey execution plan.

## Patches Performed

### 1. P0_SHARED_ORDER_LAYER_SPLIT
- **Files Created**:
  - [dsh-order-lifecycle.types.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.types.ts)
  - [dsh-order-lifecycle.policy.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts)
  - [dsh-order-lifecycle.adapter.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.adapter.ts)
  - [dsh-order-lifecycle.transport.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts)
  - [dsh-order-lifecycle.view-model.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.view-model.ts)
  - [dsh-order-lifecycle.controller.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts)
- **Files Modified**:
  - [dsh-order-lifecycle-client.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts) (rewritten as hub).

### 2. Partner Types Restoration and Workflow Fix
- **Files Modified**:
  - [partner.types.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/partner/partner.types.ts) (restored original types deleted in `27997e3`).
  - [partner.workflow.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/partner/partner.workflow.ts) (exported types and fixed redeclaration of `UiAuditRow`).
