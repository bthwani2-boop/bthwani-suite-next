// Canonical location: dsh/frontend/shared/delivery/captain/captain-service-mode.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain service mode model.
// Navigation is owned by the app Router; this model mutates domain/presentation state only.

import React from 'react';
import type { CaptainServiceType, CaptainAppMode } from './captain.contract';

type ServiceModeDeps = {
  setActiveServiceType: React.Dispatch<React.SetStateAction<CaptainServiceType>>;
  setInboxState: React.Dispatch<React.SetStateAction<any>>;
  setCaptainAppMode: React.Dispatch<React.SetStateAction<CaptainAppMode>>;
};

export function useCaptainServiceModeModel({
  setActiveServiceType,
  setInboxState,
  setCaptainAppMode,
}: ServiceModeDeps) {
  const handleSelectServiceType = React.useCallback((typeId: string) => {
    setActiveServiceType(typeId === 'amn' ? 'amn' : 'dsh');
    setInboxState('ready');
  }, [setActiveServiceType, setInboxState]);

  const toggleStoreCourierMode = React.useCallback((next: boolean) => {
    setCaptainAppMode(next ? 'store_courier_mode' : 'bthwani_captain_mode');
  }, [setCaptainAppMode]);

  return { handleSelectServiceType, toggleStoreCourierMode };
}
