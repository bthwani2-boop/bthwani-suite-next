// Canonical location: dsh/frontend/shared/delivery/captain/captain-availability.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain availability model.
// No JSX. No ui-kit. No Tamagui.

import React from "react";
import type { CaptainAvailabilityStatus } from "./captain.contract";

/**
 * Captain availability is operational truth and must be persisted by DSH.
 * Until an authenticated availability mutation/readback contract is wired, the
 * local surface stays unavailable and cannot promote itself to available.
 */
export function useCaptainAvailabilityModel() {
  const [captainAvailabilityStatus] =
    React.useState<CaptainAvailabilityStatus>("unavailable");

  return {
    captainAvailabilityStatus,
    availabilityMutationReady: false,
  } as const;
}
