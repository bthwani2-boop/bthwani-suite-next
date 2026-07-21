import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  fetchFieldMeWallet,
  fetchFieldMeCommissions,
  fetchFieldMePayoutRequests,
  submitFieldMePayoutRequest,
  type FieldWallet,
  type FieldCommission,
  type FieldPayoutRequest,
} from "./field-finance.api";
import {
  clearFieldPayoutAttempt,
  getOrCreateFieldPayoutAttempt,
} from "./field-payout-attempt";

type FieldFinanceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "loaded";
      wallet: FieldWallet;
      commissions: FieldCommission[];
      payoutRequests: FieldPayoutRequest[];
      commissionsError: string | null;
      payoutRequestsError: string | null;
    };

type Action =
  | { type: "LOADING" }
  | {
      type: "LOADED";
      wallet: FieldWallet;
      commissions: FieldCommission[];
      payoutRequests: FieldPayoutRequest[];
      commissionsError: string | null;
      payoutRequestsError: string | null;
    }
  | { type: "ERROR"; message: string };

function reducer(_state: FieldFinanceState, action: Action): FieldFinanceState {
  switch (action.type) {
    case "LOADING":
      return { kind: "loading" };
    case "LOADED":
      return {
        kind: "loaded",
        wallet: action.wallet,
        commissions: action.commissions,
        payoutRequests: action.payoutRequests,
        commissionsError: action.commissionsError,
        payoutRequestsError: action.payoutRequestsError,
      };
    case "ERROR":
      return { kind: "error", message: action.message };
  }
}

export type FieldFinanceController = {
  readonly state: FieldFinanceState;
  readonly refresh: () => void;
  readonly submittingPayout: boolean;
  readonly submitPayoutError: string | null;
  readonly submitPayoutRequest: (amountMinorUnits: number, currency: string) => Promise<boolean>;
};

export function useFieldFinanceController(): FieldFinanceController {
  const [state, dispatch] = useReducer(reducer, { kind: "idle" });
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [submitPayoutError, setSubmitPayoutError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const load = useCallback(() => {
    dispatch({ type: "LOADING" });

    void Promise.all([
      fetchFieldMeWallet(),
      fetchFieldMeCommissions(),
      fetchFieldMePayoutRequests(),
    ])
      .then(([walletResult, commissionsResult, payoutsResult]) => {
        if (!walletResult.ok) {
          dispatch({ type: "ERROR", message: walletResult.message });
          return;
        }
        dispatch({
          type: "LOADED",
          wallet: walletResult.wallet,
          commissions: commissionsResult.ok ? commissionsResult.commissions : [],
          payoutRequests: payoutsResult.ok ? payoutsResult.payoutRequests : [],
          commissionsError: commissionsResult.ok ? null : commissionsResult.message,
          payoutRequestsError: payoutsResult.ok ? null : payoutsResult.message,
        });
      })
      .catch((error: unknown) => {
        dispatch({
          type: "ERROR",
          message: error instanceof Error ? error.message : "unknown error",
        });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitPayoutRequest = useCallback(async (
    amountMinorUnits: number,
    currency: string,
  ): Promise<boolean> => {
    if (submittingRef.current) {
      setSubmitPayoutError("يوجد طلب صرف قيد الإرسال بالفعل.");
      return false;
    }
    if (state.kind !== "loaded") {
      setSubmitPayoutError("يجب تحميل المحفظة قبل إرسال طلب الصرف.");
      return false;
    }
    if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
      setSubmitPayoutError("مبلغ الصرف غير صالح.");
      return false;
    }
    const normalizedCurrency = currency.trim().toUpperCase();
    if (normalizedCurrency !== state.wallet.currency.trim().toUpperCase()) {
      setSubmitPayoutError("عملة طلب الصرف لا تطابق عملة المحفظة.");
      return false;
    }
    if (amountMinorUnits > state.wallet.availableBalanceMinorUnits) {
      setSubmitPayoutError("مبلغ الصرف أكبر من الرصيد المتاح.");
      return false;
    }

    submittingRef.current = true;
    setSubmittingPayout(true);
    setSubmitPayoutError(null);
    try {
      const attempt = await getOrCreateFieldPayoutAttempt(
        state.wallet.actorId,
        amountMinorUnits,
        normalizedCurrency,
      );
      const result = await submitFieldMePayoutRequest(
        amountMinorUnits,
        normalizedCurrency,
        attempt.idempotencyKey,
      );
      if (!result.ok) {
        setSubmitPayoutError(result.message);
        return false;
      }
      await clearFieldPayoutAttempt(attempt.idempotencyKey);
      load();
      return true;
    } catch (error) {
      setSubmitPayoutError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      submittingRef.current = false;
      setSubmittingPayout(false);
    }
  }, [load, state]);

  return { state, refresh: load, submittingPayout, submitPayoutError, submitPayoutRequest };
}
