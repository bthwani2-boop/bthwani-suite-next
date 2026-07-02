// Canonical location: dsh/frontend/shared/media/pod/pod-upload-flow.ts
// Authority: dsh/frontend/shared/media — Proof of Delivery (PoD) state and flow trigger.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainAppMode } from '../../delivery/captain.contract';
import { getCaptainLifecycleForOrderStage } from '../../delivery/delivery.policy';

export function usePodUploadFlow() {
  const [captainPodState, setCaptainPodState] = React.useState<'ready' | 'loading' | 'success' | 'error' | 'retry-required'>('ready');
  const [captainPodPhotoUri, setCaptainPodPhotoUri] = React.useState<string | undefined>(undefined);
  const [captainPodMediaKey, setCaptainPodMediaKey] = React.useState<string | undefined>(undefined);

  const resetPodFields = React.useCallback(() => {
    setCaptainPodState('ready');
    setCaptainPodPhotoUri(undefined);
    setCaptainPodMediaKey(undefined);
  }, []);

  const openStoreCourierProof = React.useCallback((captainAppMode: CaptainAppMode, setRoute: (r: any) => void) => {
    setCaptainPodState('ready');
    setRoute(getCaptainLifecycleForOrderStage('proof', captainAppMode === 'store_courier_mode').captainRoute);
  }, []);

  return {
    captainPodState,
    setCaptainPodState,
    captainPodPhotoUri,
    setCaptainPodPhotoUri,
    captainPodMediaKey,
    setCaptainPodMediaKey,
    resetPodFields,
    openStoreCourierProof,
  };
}
