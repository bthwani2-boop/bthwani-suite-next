// Canonical location: dsh/frontend/shared/delivery/captain/captain-service-mode.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain service mode model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainServiceType, CaptainAppMode, DshCaptainRoute } from './captain.contract';

type ServiceModeDeps = {
  setActiveServiceType: React.Dispatch<React.SetStateAction<CaptainServiceType>>;
  setRoute: React.Dispatch<React.SetStateAction<DshCaptainRoute>>;
  setInboxState: React.Dispatch<React.SetStateAction<any>>;
  setActiveAssignmentId: React.Dispatch<React.SetStateAction<string>>;
  setActiveOrderExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPickupSheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDeliverySheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCaptainAppMode: React.Dispatch<React.SetStateAction<CaptainAppMode>>;
};

export function useCaptainServiceModeModel({
  setActiveServiceType,
  setRoute,
  setInboxState,
  setActiveAssignmentId,
  setActiveOrderExpanded,
  setIsPickupSheetVisible,
  setIsDeliverySheetVisible,
  setCaptainAppMode,
}: ServiceModeDeps) {
  const handleSelectServiceType = React.useCallback((typeId: string) => {
    setActiveServiceType(typeId === 'amn' ? 'amn' : 'dsh');
    setRoute('home');
    setInboxState('ready');
    setActiveAssignmentId('');
    setActiveOrderExpanded(false);
    setIsPickupSheetVisible(false);
    setIsDeliverySheetVisible(false);
  }, [setActiveServiceType, setRoute, setInboxState, setActiveAssignmentId, setActiveOrderExpanded, setIsPickupSheetVisible, setIsDeliverySheetVisible]);

  const toggleStoreCourierMode = React.useCallback((next: boolean) => {
    setCaptainAppMode(next ? 'store_courier_mode' : 'bthwani_captain_mode');
    setRoute('home');
  }, [setCaptainAppMode, setRoute]);

  return { handleSelectServiceType, toggleStoreCourierMode };
}
