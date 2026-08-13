// Canonical location: dsh/frontend/shared/delivery/captain/captain-availability.model.ts
// Authority: dsh/frontend/shared/delivery/captain — captain availability model.
// No JSX. No ui-kit. No Tamagui.

import React from "react";
import type { CaptainAvailabilityStatus } from "./captain.contract";
import {
  fetchOwnCaptainAvailability,
  setOwnCaptainAvailability,
} from "../dispatch/dispatch.api";
import { useIdentitySession } from "@bthwani/core-identity";

/**
 * Captain availability is operational truth and must be persisted by DSH.
 * Until an authenticated availability mutation/readback contract is wired, the
 * local surface stays unavailable and every mutation attempt fails closed.
 */
export function useCaptainAvailabilityModel() {
  const session = useIdentitySession();
  const [captainAvailabilityStatus, setCaptainAvailabilityStatusState] =
    React.useState<CaptainAvailabilityStatus>("unavailable");
  const [version, setVersion] = React.useState(0);
  const [availabilityMutationReady, setAvailabilityMutationReady] = React.useState(false);

  const isAuthenticatedCaptain = session.state.kind === "authenticated"
    && session.state.identity.roles.includes("captain");

  const refreshAvailability = React.useCallback(async () => {
    if (!isAuthenticatedCaptain) {
      setAvailabilityMutationReady(false);
      return;
    }
    try {
      const readback = await fetchOwnCaptainAvailability();
      setCaptainAvailabilityStatusState(readback.status);
      setVersion(readback.version);
      setAvailabilityMutationReady(true);
    } catch {
      setCaptainAvailabilityStatusState("unavailable");
      setAvailabilityMutationReady(false);
    }
  }, [isAuthenticatedCaptain]);

  React.useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  const setCaptainAvailabilityStatus = React.useCallback(async (next: CaptainAvailabilityStatus) => {
    if (!availabilityMutationReady || (next !== "available" && next !== "unavailable")) return;
    try {
      const readback = await setOwnCaptainAvailability(next, version);
      setCaptainAvailabilityStatusState(readback.status);
      setVersion(readback.version);
    } catch {
      await refreshAvailability();
    }
  }, [availabilityMutationReady, refreshAvailability, version]);

  const toggleAvailability = React.useCallback(() => {
    const next = captainAvailabilityStatus === "available" ? "unavailable" : "available";
    void setCaptainAvailabilityStatus(next);
  }, [captainAvailabilityStatus, setCaptainAvailabilityStatus]);

  return {
    captainAvailabilityStatus,
    availabilityMutationReady,
    toggleAvailability,
    setCaptainAvailabilityStatus,
    refreshAvailability,
  } as const;
}
