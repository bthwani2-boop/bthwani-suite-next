import { useCallback, useEffect, useState } from "react";
import { fetchPartnerSelfStatus, fetchPartnerSelfReadiness } from "./partner.api";
import type { DshPartnerDetailState, DshPartnerReadinessState } from "./partner.states";
import { buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

function resolveMessage(err: unknown): string {
  const e = err as { status?: number; kind?: string };
  if (e?.kind === "network" || e?.status === 0) {
    return "تعذر الوصول إلى DSH. تحقق من الاتصال ثم أعد المحاولة";
  }
  if (e?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (e?.status === 403) return "الجلسة الحالية غير مصرح لها بعرض ملف الشريك";
  if (e?.status === 404) return "الجلسة الحالية غير مرتبطة بملف شريك صالح";
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
      // app-partner Product Truth exposes one recoverable error state rather
      // than separate operator-facing not-found/forbidden states. Preserve the
      // precise explanation while routing both through the Hub retry boundary.
      setStatusState({ kind: "error", message: resolveMessage(err) });
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
