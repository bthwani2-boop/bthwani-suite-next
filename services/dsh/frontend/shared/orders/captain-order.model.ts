// Canonical location: dsh/frontend/shared/orders/captain-order.model.ts
// Authority: dsh/frontend/shared/orders — captain active order details and states.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';

export function useCaptainOrderModel() {
  // The dispatch assignment id — the only id every accept/decline/pickup/
  // deliver mutation targets. `activeOrderId` below is the underlying order
  // id, for display only, derived from whichever assignment is active.
  const [activeAssignmentId, setActiveAssignmentId] = React.useState('');
  const [activeOrderId, setActiveOrderId] = React.useState('');
  const [activeOrderExpanded, setActiveOrderExpanded] = React.useState(false);

  const toggleOrderExpanded = React.useCallback(() => {
    setActiveOrderExpanded((prev) => !prev);
  }, []);

  return {
    activeAssignmentId,
    setActiveAssignmentId,
    activeOrderId,
    setActiveOrderId,
    activeOrderExpanded,
    setActiveOrderExpanded,
    toggleOrderExpanded,
  };
}
