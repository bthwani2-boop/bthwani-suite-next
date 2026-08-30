import { classifyGovernedError } from "../_kernel/governed-problem";
import type { DshPartnerErrorState } from "./partner.states";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPartnerSelfStatus, fetchPartnerSelfReadiness } from "./partner.api";
import type { DshPartnerDetailState, DshPartnerReadinessState } from "./partner.states";
import { buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

function partnerSelfErrorState(err: unknown): DshPartnerErrorState {
  const message = resolveMessage(err);
  return { kind: "error", message, problem: { ...classifyGovernedError(err), message } };
}

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

export function usePartnerSelfController(authKind: string, storeId?: string) {
  const [statusState, setStatusState] = useState<DshPartnerDetailState>({ kind: "idle" });
  const [readinessState, setReadinessState] = useState<DshPartnerReadinessState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";
  const mountedRef = useRef(true);
  const statusRequestSeqRef = useRef(0);
  const readinessRequestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      statusRequestSeqRef.current += 1;
      readinessRequestSeqRef.current += 1;
    };
  }, []);

  const loadStatus = useCallback(async (): Promise<boolean> => {
    const requestSeq = ++statusRequestSeqRef.current;
    if (!isAuth) {
      if (mountedRef.current) setStatusState({ kind: "idle" });
      return false;
    }
    setStatusState({ kind: "loading" });
    try {
      const partner = await fetchPartnerSelfStatus(storeId);
      if (!mountedRef.current || requestSeq !== statusRequestSeqRef.current) return false;
      setStatusState({ kind: "success", partner });
      return true;
    } catch (err) {
      if (!mountedRef.current || requestSeq !== statusRequestSeqRef.current) return false;
      // app-partner Product Truth exposes one recoverable error state rather
      // than separate operator-facing not-found/forbidden states. Preserve the
      // precise explanation while routing both through the Hub retry boundary.
      setStatusState(partnerSelfErrorState(err));
      return false;
    }
  }, [isAuth, storeId]);

  const loadReadiness = useCallback(async (): Promise<boolean> => {
    const requestSeq = ++readinessRequestSeqRef.current;
    if (!isAuth) {
      if (mountedRef.current) setReadinessState({ kind: "idle" });
      return false;
    }
    setReadinessState({ kind: "loading" });
    try {
      const readiness = await fetchPartnerSelfReadiness(storeId);
      if (!mountedRef.current || requestSeq !== readinessRequestSeqRef.current) return false;
      setReadinessState({ kind: "success", readiness });
      return true;
    } catch (err) {
      if (!mountedRef.current || requestSeq !== readinessRequestSeqRef.current) return false;
      setReadinessState(partnerSelfErrorState(err));
      return false;
    }
  }, [isAuth, storeId]);

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
