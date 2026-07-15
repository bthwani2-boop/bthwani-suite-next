// Canonical location: dsh/frontend/shared/delivery/captain/captain-profile.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain profile model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainServiceType, CaptainAppMode } from './captain.contract';

import { useIdentitySession } from '@bthwani/core-identity';

export function useCaptainProfileModel() {
  const session = useIdentitySession();
  const roles = session.state.kind === 'authenticated' ? session.state.identity.roles : [];
  const isPartner = roles.includes('partner');
  const isCaptain = roles.includes('captain');

  const defaultMode: CaptainAppMode = (isPartner && !isCaptain) ? 'store_courier_mode' : 'bthwani_captain_mode';

  const [activeServiceType, setActiveServiceType] = React.useState<CaptainServiceType>('dsh');
  const [captainAppMode, setCaptainAppModeState] = React.useState<CaptainAppMode>(defaultMode);

  React.useEffect(() => {
    if (isPartner && !isCaptain) {
      setCaptainAppModeState('store_courier_mode');
    } else if (isCaptain && !isPartner) {
      setCaptainAppModeState('bthwani_captain_mode');
    }
  }, [isPartner, isCaptain]);

  const setCaptainAppMode = React.useCallback((next: React.SetStateAction<CaptainAppMode>) => {
    setCaptainAppModeState((prev) => {
       const resolved = typeof next === 'function' ? next(prev) : next;
       if (resolved === 'store_courier_mode' && !isPartner) return prev;
       if (resolved === 'bthwani_captain_mode' && !isCaptain) return prev;
       return resolved;
    });
  }, [isPartner, isCaptain]);

  return {
    activeServiceType,
    setActiveServiceType,
    captainAppMode,
    setCaptainAppMode,
  };
}
