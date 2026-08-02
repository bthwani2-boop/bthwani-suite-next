import { useCallback, useEffect, useReducer } from "react";
import type { WltDshCodReference, WltReferenceApiResult } from "./wlt-cod.api";

export type DshCaptainCodState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly records: readonly WltDshCodReference[] }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "not_available" };

type Action =
  | { readonly type: "LOADING" }
  | { readonly type: "LOADED"; readonly records: readonly WltDshCodReference[] }
  | { readonly type: "ERROR"; readonly message: string }
  | { readonly type: "NOT_AVAILABLE" };

function reducer(_state: DshCaptainCodState, action: Action): DshCaptainCodState {
  switch (action.type) {
    case "LOADING":
      return { kind: "loading" };
    case "LOADED":
      return { kind: "loaded", records: action.records };
    case "ERROR":
      return { kind: "error", message: action.message };
    case "NOT_AVAILABLE":
      return { kind: "not_available" };
  }
}

export type DshCaptainCodRecordsFetcher = () => Promise<WltReferenceApiResult<WltDshCodReference[]>>;

export function useWltCaptainCodCustodyController(
  actorAvailable: boolean,
  fetchCodRecords: DshCaptainCodRecordsFetcher,
) {
  const [state, dispatch] = useReducer(reducer, { kind: "not_available" });
  const load = useCallback(() => {
    if (!actorAvailable) {
      dispatch({ type: "NOT_AVAILABLE" });
      return;
    }
    dispatch({ type: "LOADING" });
    void fetchCodRecords()
      .then((result) => {
        if (result.ok) dispatch({ type: "LOADED", records: result.data });
        else dispatch({ type: "ERROR", message: result.message });
      })
      .catch((error: unknown) => {
        dispatch({ type: "ERROR", message: error instanceof Error ? error.message : "unknown error" });
      });
  }, [actorAvailable, fetchCodRecords]);

  useEffect(load, [load]);
  return { state, retry: load };
}
