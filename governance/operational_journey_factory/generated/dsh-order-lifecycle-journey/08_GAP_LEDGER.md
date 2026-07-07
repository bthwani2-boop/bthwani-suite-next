# Gap Ledger

status: `DISCOVERY_PACKAGE_ONLY`

This file contains summarized journey-relevant gaps only. Raw diagnostics remain outside Git under `.diagnostics/operational-journey-factory/`.

## Open Blocking Gaps

### app-client

- `services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/app-client/orders/OrdersListScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

### app-partner

- `services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

### control-panel operations

- `services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

- `services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx`
  - type: `BUSINESS_LOGIC_IN_SURFACE`
  - severity: `HIGH`
  - required_action: `move_or_bind_to_shared_or_backend_owner`
  - status: `OPEN`
  - blocks_journey_start: `true`

### shared order layer

- `services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts`
  - type: `SHARED_API_LOGIC_MIXED`
  - severity: `HIGH`
  - required_action: `split_transport_from_shared_domain_logic`
  - status: `OPEN`
  - blocks_journey_start: `true`

## Missing Proof Blockers

- database table and migration truth: `BLOCKED_NEEDS_EVIDENCE`
- audit event mapping: `BLOCKED_NEEDS_EVIDENCE`
- permission matrix enforcement: `BLOCKED_NEEDS_EVIDENCE`
- UI action and icon handler inventory: `BLOCKED_NEEDS_EVIDENCE`
- runtime smoke requirement: `BLOCKED_NEEDS_EVIDENCE`
- CI coverage mapping: `BLOCKED_NEEDS_EVIDENCE`
