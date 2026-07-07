# Shared Order Layer Split Plan

This document details the refactoring and split plan implemented for the shared order layer.

## Split Details

To resolve the `SHARED_API_LOGIC_MIXED` code smell in [dsh-order-lifecycle-client.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts), the logic has been decoupled into:

1. [dsh-order-lifecycle.types.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.types.ts)
   - Exposes all type-safe definitions for order records, request payloads, response bodies, and error contexts.
2. [dsh-order-lifecycle.policy.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts)
   - Contains immutable capability settings (`DSH_CAPTAIN_CONTRACT_CAPABILITIES`).
3. [dsh-order-lifecycle.adapter.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.adapter.ts)
   - Handles the mapping and normalization from backend OpenAPI payloads to frontend record formats.
4. [dsh-order-lifecycle.transport.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts)
   - Resolves endpoints and constructs the fetch client instance (`createDshOrderLifecycleHttpClient`).
5. [dsh-order-lifecycle.view-model.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.view-model.ts)
   - Pure presentation model helpers.
6. [dsh-order-lifecycle.controller.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts)
   - Exposes `useDshOrderLifecycleClient` React hook.

## Integration Hub
- [dsh-order-lifecycle-client.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts) re-exports all modules, maintaining complete backward-compatibility.
