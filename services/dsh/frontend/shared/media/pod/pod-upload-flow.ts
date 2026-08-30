// Canonical location: dsh/frontend/shared/media/pod/pod-upload-flow.ts
// Authority: dsh/frontend/shared/media — Proof of Delivery (PoD) state only.
// Navigation is owned by the app Router.

import React from 'react';

export type CaptainPodState =
  | 'ready'
  | 'loading'
  | 'pending_review'
  | 'success'
  | 'rejected'
  | 'error';

export function usePodUploadFlow() {
  const [captainPodState, setCaptainPodState] = React.useState<CaptainPodState>('ready');
  const [captainPodPhotoUri, setCaptainPodPhotoUri] = React.useState<string | undefined>(undefined);

  const resetPodFields = React.useCallback(() => {
    setCaptainPodState('ready');
    setCaptainPodPhotoUri(undefined);
  }, []);

  return {
    captainPodState,
    setCaptainPodState,
    captainPodPhotoUri,
    setCaptainPodPhotoUri,
    resetPodFields,
  };
}
