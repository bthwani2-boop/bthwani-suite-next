// Canonical location: dsh/frontend/shared/delivery/captain/captain-service-mode.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain service mode model.
// Navigation is owned by the app Router; this model mutates domain/presentation state only.

import React from 'react';
import type { CaptainServiceType, CaptainAppMode } from './captain.contract';

type ServiceModeDeps = {
  setActiveServiceType: React.Dispatch<React.SetStateAction<CaptainServiceType>>;
  setInboxState: React.Dispatch<React.SetStateAction<any>>;
  setActiveOrderExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPickupSheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDeliverySheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCaptainAppMode: React.Dispatch<React.SetStateAction<CaptainAppMode>>;
};

export function useCaptainServiceModeModel({
  setActiveServiceType,
  setInboxState,
  setActiveOrderExpanded,
  setIsPickupSheetVisible,
  setIsDeliverySheetVisible,
  setCaptainAppMode,
}: ServiceModeDeps) {
  const handleSelectServiceType = React.useCallback((typeId: string) => {
    setActiveServiceType(typeId === 'amn' ? 'amn' : 'dsh');
    setInboxState('ready');
    setActiveOrderExpanded(false);
    setIsPickupSheetVisible(false);
    setIsDeliverySheetVisible(false);
  }, [setActiveServiceType, setInboxState, setActiveOrderExpanded, setIsPickupSheetVisible, setIsDeliverySheetVisible]);

  const toggleStoreCourierMode = React.useCallback((next: boolean) => {
    setCaptainAppMode(next ? 'store_courier_mode' : 'bthwani_captain_mode');
  }, [setCaptainAppMode]);

  return { handleSelectServiceType, toggleStoreCourierMode };
}
