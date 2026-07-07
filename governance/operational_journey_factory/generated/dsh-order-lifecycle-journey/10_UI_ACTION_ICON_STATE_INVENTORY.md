# UI Action, Icon, and State Inventory

This file inventories all key buttons, icons, and action handlers across the journey surfaces.

## Action Inventory

### 1. app-client
- **Surface**: `CheckoutScreen.tsx`
  - **Component**: `Button` (Submit payment / checkout)
  - **Handler**: `onCheckoutPress` / `useCheckoutToOrderFlow`
  - **State Guard**: Enabled only when WLT payment session is successfully created and status is active.
- **Surface**: `OrdersListScreen.tsx`
  - **Component**: `Pressable` (Expand order details)
  - **Handler**: `setExpanded(!expanded)`
  - **Icon**: `bicycle-outline` (active) / `receipt-outline` (inactive)

### 2. app-partner
- **Surface**: `OrdersInboxScreen.tsx`
  - **Component**: `Button` (Accept Order)
  - **Handler**: `onOpenOrderAction('accept', item.id)` / `markReady`
  - **State Guard**: Visible in 'needs_accept' state.
- **Surface**: `DshPartnerOrderRejectionScreen.tsx`
  - **Component**: `Button` (Confirm Rejection)
  - **Handler**: `onRejectPress`
  - **State Guard**: Enabled only when a rejection reason is chosen.

### 3. app-captain
- **Surface**: `TaskInboxScreen.tsx`
  - **Component**: `Button` (Accept Delivery Task)
  - **Handler**: `acceptTask`
- **Surface**: `ActiveTaskScreen.tsx`
  - **Component**: `Button` (Confirm Pickup / Deliver with POD)
  - **Handler**: `confirmPickup` / `deliverOrder`

### 4. control-panel
- **Surface**: `LiveOrdersScreen.tsx`
  - **Component**: `Button` (Rescue Order)
  - **Handler**: `onRescuePress`
