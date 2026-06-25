import { useCallback, useEffect, useState } from "react";
import { fetchPartnerSelfStatus, fetchPartnerSelfReadiness } from "./partner.api";
import type { DshPartnerDetailState, DshPartnerReadinessState } from "./partner.states";
import { buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

function resolveMessage(err: unknown): string {
  const e = err as { status?: number };
  if (e?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (e?.status === 404) return "لم يتم إيجاد ملف الشريك";
  return "حدث خطأ، يرجى المحاولة مجدداً";
}

export function usePartnerSelfController(authKind: string) {
  const [statusState, setStatusState] = useState<DshPartnerDetailState>({ kind: "idle" });
  const [readinessState, setReadinessState] = useState<DshPartnerReadinessState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const loadStatus = useCallback(async () => {
    if (!isAuth) return;
    setStatusState({ kind: "loading" });
    try {
      const partner = await fetchPartnerSelfStatus();
      setStatusState({ kind: "success", partner });
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 404) setStatusState({ kind: "not_found" });
      else if (e?.status === 403) setStatusState({ kind: "forbidden" });
      else setStatusState({ kind: "error", message: resolveMessage(err) });
    }
  }, [isAuth]);

  const loadReadiness = useCallback(async () => {
    if (!isAuth) return;
    setReadinessState({ kind: "loading" });
    try {
      const readiness = await fetchPartnerSelfReadiness();
      setReadinessState({ kind: "success", readiness });
    } catch (err) {
      setReadinessState({ kind: "error", message: resolveMessage(err) });
    }
  }, [isAuth]);

  useEffect(() => {
    void loadStatus();
    void loadReadiness();
  }, [loadStatus, loadReadiness]);

  const statusViewModel = statusState.kind === "success"
    ? buildPartnerDetailViewModel(statusState.partner)
    : null;

  const readinessViewModel = readinessState.kind === "success"
    ? buildPartnerReadinessViewModel(readinessState.readiness)
    : null;

  return {
    statusState,
    readinessState,
    statusViewModel,
    readinessViewModel,
    reload: () => { void loadStatus(); void loadReadiness(); },
  };
}
