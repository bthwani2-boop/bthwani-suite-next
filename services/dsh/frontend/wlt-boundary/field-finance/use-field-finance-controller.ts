import { useCallback, useEffect, useReducer } from "react";
import {
  fetchFieldMeWallet,
  fetchFieldMeLedgerEntries,
  fetchFieldMeCommissions,
  type FieldWallet,
  type FieldLedgerEntry,
  type FieldCommission,
} from "./field-finance.api";

type FieldFinanceState =
  | { kind: "idle" }
  | { kind: "loading" }
  /**
   * `code` is a stable reason code for the consuming surface to map to a
   * governed presentation. WLT deliberately does not import the DSH view
   * layer: it emits the code, the surface decides how to render it.
   */
  | { kind: "error"; message: string; code: string }
  | {
      kind: "loaded";
      wallet: FieldWallet;
      ledgerEntries: FieldLedgerEntry[];
      commissions: FieldCommission[];
      ledgerError: string | null;
      commissionsError: string | null;
    };

type Action =
  | { type: "LOADING" }
  | {
      type: "LOADED";
      wallet: FieldWallet;
      ledgerEntries: FieldLedgerEntry[];
      commissions: FieldCommission[];
      ledgerError: string | null;
      commissionsError: string | null;
    }
  | { type: "ERROR"; message: string; code: string };

function reducer(_state: FieldFinanceState, action: Action): FieldFinanceState {
  switch (action.type) {
    case "LOADING":
      return { kind: "loading" };
    case "LOADED":
      return {
        kind: "loaded",
        wallet: action.wallet,
        ledgerEntries: action.ledgerEntries,
        commissions: action.commissions,
        ledgerError: action.ledgerError,
        commissionsError: action.commissionsError,
      };
    case "ERROR":
      return { kind: "error", message: action.message, code: action.code };
  }
}

export type FieldFinanceController = {
  readonly state: FieldFinanceState;
  readonly refresh: () => void;
};

export function useFieldFinanceController(): FieldFinanceController {
  const [state, dispatch] = useReducer(reducer, { kind: "idle" });

  const load = useCallback(() => {
    dispatch({ type: "LOADING" });

    void Promise.all([
      fetchFieldMeWallet(),
      fetchFieldMeLedgerEntries(),
      fetchFieldMeCommissions(),
    ])
      .then(([walletResult, ledgerResult, commissionsResult]) => {
        if (!walletResult.ok) {
          dispatch({ type: "ERROR", message: walletResult.message, code: walletResult.code ?? "INTERNAL_ERROR" });
          return;
        }
        dispatch({
          type: "LOADED",
          wallet: walletResult.wallet,
          ledgerEntries: ledgerResult.ok ? ledgerResult.ledgerEntries : [],
          commissions: commissionsResult.ok ? commissionsResult.commissions : [],
          ledgerError: ledgerResult.ok ? null : ledgerResult.message,
          commissionsError: commissionsResult.ok ? null : commissionsResult.message,
        });
      })
      .catch((error: unknown) => {
        const code =
          typeof error === "object" && error !== null && "code" in error &&
          typeof (error as { code: unknown }).code === "string"
            ? (error as { code: string }).code
            : "INTERNAL_ERROR";
        dispatch({
          type: "ERROR",
          code,
          message: error instanceof Error ? error.message : "unknown error",
        });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { state, refresh: load };
}
