// Canonical location: dsh/frontend/shared/delivery/captain/captain-availability.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain availability model.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { CaptainAvailabilityStatus } from './captain.contract';

export function useCaptainAvailabilityModel() {
  const [captainAvailabilityStatus, setCaptainAvailabilityStatus] =
    React.useState<CaptainAvailabilityStatus>('available');

  const toggleAvailability = React.useCallback(() => {
    setCaptainAvailabilityStatus((current) => (current === 'available' ? 'unavailable' : 'available'));
  }, []);

  return {
    captainAvailabilityStatus,
    setCaptainAvailabilityStatus,
    toggleAvailability,
  };
}
