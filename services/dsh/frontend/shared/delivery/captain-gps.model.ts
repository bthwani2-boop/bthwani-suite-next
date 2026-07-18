// Canonical location: dsh/frontend/shared/delivery/captain/captain-gps.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain GPS status model.
// No JSX. No ui-kit. No Tamagui.

import React from "react";
import type { CaptainGpsStatus } from "./captain.contract";

/**
 * GPS readiness must come from a real permission and location-provider result.
 * A local default cannot prove that the device can publish a valid location.
 */
export function useCaptainGpsModel() {
  const [gpsStatus, setGpsStatus] =
    React.useState<CaptainGpsStatus>("disabled");

  return {
    gpsStatus,
    setGpsStatus,
  } as const;
}
