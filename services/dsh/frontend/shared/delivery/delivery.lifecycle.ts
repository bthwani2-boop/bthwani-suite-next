// Canonical location: dsh/frontend/shared/delivery/delivery.lifecycle.ts
// Authority: dsh/frontend/shared/delivery — delivery lifecycle and sheet visibility.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { ActiveOrderPhase, StoreCourierStage } from './delivery.contract';

export function useDeliveryLifecycle() {
  const [inboxState, setInboxState] = React.useState<'ready' | 'loading' | 'empty' | 'offer-accepting' | 'offer-accepted' | 'delivered' | 'error'>('loading');
  const [activeOrderPhase, setActiveOrderPhase] = React.useState<ActiveOrderPhase>('pickup');
  const [storeCourierStage, setStoreCourierStage] = React.useState<StoreCourierStage>('ready_for_pickup');
  const [isPickupSheetVisible, setIsPickupSheetVisible] = React.useState(false);
  const [isDeliverySheetVisible, setIsDeliverySheetVisible] = React.useState(false);
  const [isDeclineSheetVisible, setIsDeclineSheetVisible] = React.useState(false);
  const [declineSheetState, setDeclineSheetState] = React.useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [declineOrderId, setDeclineOrderId] = React.useState('');
  const [pickupSheetState, setPickupSheetState] = React.useState<'ready' | 'loading' | 'success' | 'error'>('ready');

  return {
    inboxState,
    setInboxState,
    activeOrderPhase,
    setActiveOrderPhase,
    storeCourierStage,
    setStoreCourierStage,
    isPickupSheetVisible,
    setIsPickupSheetVisible,
    isDeliverySheetVisible,
    setIsDeliverySheetVisible,
    isDeclineSheetVisible,
    setIsDeclineSheetVisible,
    declineSheetState,
    setDeclineSheetState,
    declineOrderId,
    setDeclineOrderId,
    pickupSheetState,
    setPickupSheetState,
  };
}
