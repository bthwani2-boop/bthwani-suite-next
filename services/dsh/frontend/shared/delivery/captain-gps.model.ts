// Canonical location: dsh/frontend/shared/delivery/captain/captain-gps.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain GPS status model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainGpsStatus } from './captain.contract';

export function useCaptainGpsModel() {
  const [gpsStatus, setGpsStatus] = React.useState<CaptainGpsStatus>('limited');

  return {
    gpsStatus,
    setGpsStatus,
  };
}
