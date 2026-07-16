import { useEffect, useReducer, useState } from "react";
import {
  fetchFieldMeWallet,
  fetchFieldMeCommissions,
  fetchFieldMePayoutRequests,
  submitFieldMePayoutRequest,
  type FieldWallet,
  type FieldCommission,
  type FieldPayoutRequest,
} from "./field-finance.api";

type FieldFinanceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "loaded";
      wallet: FieldWallet;
      commissions: FieldCommission[];
      payoutRequests: FieldPayoutRequest[];
      // Non-fatal: the wallet loaded but commissions and/or payout requests
      // failed to load. Previously these failures were silently swallowed
      // into an empty list, which looks identical to "genuinely none" --
      // surfacing the message lets the screen show a real error instead.
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

  const load = () => {
    dispatch({ type: "LOADING" });

    Promise.all([
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
      .catch((e: unknown) => {
        dispatch({
          type: "ERROR",
          message: e instanceof Error ? e.message : "unknown error",
        });
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPayoutRequest = async (amountMinorUnits: number, currency: string): Promise<boolean> => {
    setSubmittingPayout(true);
    setSubmitPayoutError(null);
    const idempotencyKey = `field-payout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await submitFieldMePayoutRequest(amountMinorUnits, currency, idempotencyKey);
    setSubmittingPayout(false);
    if (!result.ok) {
      setSubmitPayoutError(result.message);
      return false;
    }
    load();
    return true;
  };

  return { state, refresh: load, submittingPayout, submitPayoutError, submitPayoutRequest };
}
