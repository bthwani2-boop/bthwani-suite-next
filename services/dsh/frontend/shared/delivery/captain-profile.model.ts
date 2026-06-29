// Canonical location: dsh/frontend/shared/delivery/captain/captain-profile.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain profile model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainServiceType, CaptainAppMode } from './captain.contract';

export function useCaptainProfileModel() {
  const [activeServiceType, setActiveServiceType] = React.useState<CaptainServiceType>('dsh');
  const [captainAppMode, setCaptainAppMode] = React.useState<CaptainAppMode>('bthwani_captain_mode');

  return {
    activeServiceType,
    setActiveServiceType,
    captainAppMode,
    setCaptainAppMode,
  };
}
