import { useCallback, useEffect, useReducer } from "react";
import {
  fetchOwnRepresentativeLedger,
  fetchOwnRepresentativeWallet,
  type RepresentativeActorType,
  type RepresentativeLedgerEntry,
  type RepresentativeWallet,
} from "./actor-wallet.api";

export type ActorWalletState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "loaded";
      readonly wallet: RepresentativeWallet;
      readonly ledgerEntries: readonly RepresentativeLedgerEntry[];
      readonly ledgerError: string | null;
    };

type Action =
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string }
  | {
      readonly type: "loaded";
      readonly wallet: RepresentativeWallet;
      readonly ledgerEntries: readonly RepresentativeLedgerEntry[];
      readonly ledgerError: string | null;
    };

function reducer(_state: ActorWalletState, action: Action): ActorWalletState {
  switch (action.type) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error", message: action.message };
    case "loaded":
      return {
        kind: "loaded",
        wallet: action.wallet,
        ledgerEntries: action.ledgerEntries,
        ledgerError: action.ledgerError,
      };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { readonly message?: unknown }).message ?? "unknown error");
  }
  return String(error);
}

export function useActorWalletController(actorType: RepresentativeActorType) {
  const [state, dispatch] = useReducer(reducer, { kind: "loading" });

  const refresh = useCallback(() => {
    dispatch({ type: "loading" });
    void Promise.allSettled([
      fetchOwnRepresentativeWallet(actorType),
      fetchOwnRepresentativeLedger(actorType),
    ]).then(([walletResult, ledgerResult]) => {
      if (walletResult.status === "rejected") {
        dispatch({ type: "error", message: errorMessage(walletResult.reason) });
        return;
      }
      dispatch({
        type: "loaded",
        wallet: walletResult.value,
        ledgerEntries: ledgerResult.status === "fulfilled" ? ledgerResult.value : [],
        ledgerError: ledgerResult.status === "rejected" ? errorMessage(ledgerResult.reason) : null,
      });
    });
  }, [actorType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, refresh } as const;
}
