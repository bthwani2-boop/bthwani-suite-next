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
import {
  clearCaptainAvailabilityAttempt,
  getOrCreateCaptainAvailabilityAttempt,
} from "./captain-availability-attempt";

type CaptainAvailabilityState = "loading" | "ready" | "mutating" | "error";

export function useCaptainAvailabilityModel() {
  const session = useIdentitySession();
  const [captainAvailabilityStatus, setCaptainAvailabilityStatusState] =
    React.useState<CaptainAvailabilityStatus>("unavailable");
  const [version, setVersion] = React.useState(0);
  const [availabilityState, setAvailabilityState] = React.useState<CaptainAvailabilityState>("loading");
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);

  const authenticatedIdentity = session.state.kind === "authenticated" && session.state.identity.roles.includes("captain")
    ? session.state.identity
    : null;
  const isAuthenticatedCaptain = authenticatedIdentity !== null;
  const captainActorId = authenticatedIdentity?.subject.trim() ?? "";

  const refreshAvailability = React.useCallback(async () => {
    if (!isAuthenticatedCaptain) {
      setAvailabilityState("error");
      setAvailabilityError("يجب تسجيل الدخول بهوية كابتن لقراءة التوفر.");
      return;
    }
    setAvailabilityState("loading");
    setAvailabilityError(null);
    try {
      const readback = await fetchOwnCaptainAvailability();
      setCaptainAvailabilityStatusState(readback.status);
      setVersion(readback.version);
      setAvailabilityState("ready");
    } catch {
      setCaptainAvailabilityStatusState("unavailable");
      setVersion(0);
      setAvailabilityState("error");
      setAvailabilityError("تعذر قراءة توفر الكابتن من DSH. أعد المحاولة قبل تغيير الحالة.");
    }
  }, [isAuthenticatedCaptain]);

  React.useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  const setCaptainAvailabilityStatus = React.useCallback(async (next: CaptainAvailabilityStatus): Promise<boolean> => {
    if (next !== "available" && next !== "unavailable") {
      setAvailabilityError("لا يمكن للكابتن ضبط هذه الحالة من هذا المسار.");
      return false;
    }
    if (!isAuthenticatedCaptain || !captainActorId) {
      setAvailabilityError("يجب تسجيل الدخول بهوية كابتن قبل تغيير التوفر.");
      return false;
    }
    if (availabilityState !== "ready" || version < 1) {
      setAvailabilityError("لم تُثبت قراءة التوفر الحالية بعد. أعد المحاولة بعد اكتمال القراءة.");
      return false;
    }

    const intent = { actorId: captainActorId, status: next, expectedVersion: version } as const;
    setAvailabilityState("mutating");
    setAvailabilityError(null);
    try {
      const attempt = await getOrCreateCaptainAvailabilityAttempt(intent);
      let readback;
      try {
        readback = await setOwnCaptainAvailability(next, version, attempt.context);
      } catch {
        // Replay the exact durable command identity after an uncertain response.
        readback = await setOwnCaptainAvailability(next, version, attempt.context);
      }
      setCaptainAvailabilityStatusState(readback.status);
      setVersion(readback.version);
      await clearCaptainAvailabilityAttempt(intent, attempt.signature);
      setAvailabilityState("ready");
      return true;
    } catch {
      setAvailabilityState("error");
      setAvailabilityError("تعذر حفظ توفر الكابتن. بقي الأمر محفوظًا لإعادة المصالحة الآمنة.");
      return false;
    }
  }, [availabilityState, captainActorId, isAuthenticatedCaptain, version]);

  const toggleAvailability = React.useCallback(() => {
    const next = captainAvailabilityStatus === "available" ? "unavailable" : "available";
    void setCaptainAvailabilityStatus(next);
  }, [captainAvailabilityStatus, setCaptainAvailabilityStatus]);

  return {
    captainAvailabilityStatus,
    availabilityMutationReady: availabilityState === "ready" && version > 0,
    availabilityBusy: availabilityState === "loading" || availabilityState === "mutating",
    availabilityError,
    toggleAvailability,
    setCaptainAvailabilityStatus,
    refreshAvailability,
  } as const;
}
