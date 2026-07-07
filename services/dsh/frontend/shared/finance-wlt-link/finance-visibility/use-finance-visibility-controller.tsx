import { useCallback, useEffect, useState } from "react";
import {
  fetchWltPaymentStatus,
  fetchWltSettlementStatus,
  fetchWltRefundStatus,
} from "./finance-visibility.api";
import {
  financeIdle,
  financeLoading,
  financeSuccess,
  financeError,
  financeWltUnavailable,
} from "./finance-visibility.states";
import { buildPartnerFinanceSummaryViewModel } from "./finance-visibility.view-model";
import type { DshFinanceVisibilityState } from "./finance-visibility.types";

function classifyError(err: unknown): DshFinanceVisibilityState {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "wlt_unavailable") return financeWltUnavailable();
  if (e?.kind === "network") return financeError("لا يوجد اتصال بالإنترنت");
  if (e?.status === 401) return financeError("الجلسة منتهية، يرجى إعادة تسجيل الدخول");
  if (e?.status === 404) return financeError("لم يُعثر على بيانات مالية لهذا الطلب");
  return financeError("تعذّر تحميل البيانات المالية، يرجى المحاولة مجدداً");
}

function usePartnerFinanceVisibilityController(
  authKind: string,
  orderId: string | null
) {
  const [state, setState] = useState<DshFinanceVisibilityState>(financeIdle());

  const load = useCallback(async (id: string) => {
    setState(financeLoading());
    const [payment, settlement, refund] = await Promise.allSettled([
      fetchWltPaymentStatus(id),
      fetchWltSettlementStatus(id),
      fetchWltRefundStatus(id),
    ]);

    if (payment.status === "rejected") {
      setState(classifyError(payment.reason));
      return;
    }
    if (settlement.status === "rejected") {
      setState(classifyError(settlement.reason));
      return;
    }

    setState(
      financeSuccess(
        buildPartnerFinanceSummaryViewModel(
          payment.value,
          settlement.value,
          refund.status === "fulfilled" ? refund.value : null
        )
      )
    );
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated" || !orderId) {
      setState(financeIdle());
      return;
    }
    load(orderId);
  }, [authKind, orderId, load]);

  return { state, reload: orderId ? () => load(orderId) : () => undefined };
}
