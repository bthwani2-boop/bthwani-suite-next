// Canonical location: dsh/frontend/shared/delivery/delivery.lifecycle.ts
// Authority: dsh/frontend/shared/delivery — delivery lifecycle and sheet visibility.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';

export type DeliveryActionState = 'idle' | 'loading' | 'success' | 'error';

export function useDeliveryLifecycle() {
  const [inboxState, setInboxState] = React.useState<'ready' | 'loading' | 'empty' | 'offer-accepting' | 'offer-accepted' | 'delivered' | 'error'>('loading');
  const [isDeclineSheetVisible, setIsDeclineSheetVisible] = React.useState(false);
  const [declineSheetState, setDeclineSheetState] = React.useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [declineOrderId, setDeclineOrderId] = React.useState('');
  const [deliveryActionState, setDeliveryActionState] = React.useState<DeliveryActionState>('idle');
  const [deliveryActionMessage, setDeliveryActionMessage] = React.useState<string | null>(null);

  return {
    inboxState,
    setInboxState,
    isDeclineSheetVisible,
    setIsDeclineSheetVisible,
    declineSheetState,
    setDeclineSheetState,
    declineOrderId,
    setDeclineOrderId,
    deliveryActionState,
    setDeliveryActionState,
    deliveryActionMessage,
    setDeliveryActionMessage,
  };
}
