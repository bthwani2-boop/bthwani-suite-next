"use client";

import { useCallback, useEffect, useState } from "react";
import type { DshPartnerStoresState, DshPartnerMutationState } from "./partner.states";
import {
  fetchGovernedPartnerStores,
  linkOrTransferPartnerStore,
  type GovernedPartnerStoreLinkInput,
} from "./partner-store-ownership.api";

type ControllerError = Readonly<{
  status?: number;
  kind?: string;
  code?: string;
  message?: string;
}>;

function messageFor(error: unknown): string {
  const typed = error as ControllerError;
  if (typed.code === "STORE_OWNERSHIP_CONFLICT") return "نقل متجر مملوك يتطلب سببًا وإصدار المتجر الحالي.";
  if (typed.code === "VERSION_CONFLICT") return "تغير إصدار المتجر. أعد تحميل بياناته ثم أدخل الإصدار الحالي.";
  if (typed.code === "OPEN_STORE_OPERATIONS") return "لا يمكن نقل ملكية المتجر مع وجود عمليات أو طلبات مفتوحة.";
  if (typed.status === 403) return "لا تملك صلاحية إدارة ملكية المتاجر.";
  if (typed.status === 404) return "الشريك أو المتجر غير موجود ضمن المستأجر الحالي.";
  if (typed.kind === "network" || typed.status === 0) return "تعذر الوصول إلى DSH.";
  return typed.message?.trim() || "تعذر تنفيذ عملية ملكية المتجر.";
}

export function useGovernedPartnerStoresController(partnerId: string, authKind: string) {
  const [state, setState] = useState<DshPartnerStoresState>({ kind: "idle" });
  const [actionState, setActionState] = useState<DshPartnerMutationState>({ kind: "idle" });
  const authenticated = authKind === "authenticated";

  const reload = useCallback(async () => {
    if (!authenticated || !partnerId) return false;
    setState({ kind: "loading" });
    try {
      const result = await fetchGovernedPartnerStores(partnerId);
      setState(result.stores.length === 0
        ? { kind: "empty" }
        : { kind: "success", stores: result.stores, total: result.total });
      return true;
    } catch (error) {
      setState({ kind: "error", message: messageFor(error) });
      return false;
    }
  }, [authenticated, partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const linkOrTransfer = useCallback(async (input: GovernedPartnerStoreLinkInput) => {
    if (!authenticated) return false;
    setActionState({ kind: "loading" });
    try {
      await linkOrTransferPartnerStore(partnerId, input);
      await reload();
      setActionState({ kind: "idle" });
      return true;
    } catch (error) {
      setActionState({ kind: "error", message: messageFor(error) });
      return false;
    }
  }, [authenticated, partnerId, reload]);

  return {
    state,
    actionState,
    reload,
    linkOrTransfer,
    resetAction: () => setActionState({ kind: "idle" }),
  };
}
