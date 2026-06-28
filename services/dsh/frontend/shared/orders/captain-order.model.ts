// Canonical location: dsh/frontend/shared/orders/captain-order.model.ts
// Authority: dsh/frontend/shared/orders — captain active order details and states.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';

export function useCaptainOrderModel() {
  const [activeOrderId, setActiveOrderId] = React.useState('');
  const [activeOrderExpanded, setActiveOrderExpanded] = React.useState(false);

  const toggleOrderExpanded = React.useCallback(() => {
    setActiveOrderExpanded((prev) => !prev);
  }, []);

  return {
    activeOrderId,
    setActiveOrderId,
    activeOrderExpanded,
    setActiveOrderExpanded,
    toggleOrderExpanded,
  };
}
