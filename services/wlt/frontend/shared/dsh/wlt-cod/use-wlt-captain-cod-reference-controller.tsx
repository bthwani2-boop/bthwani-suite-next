import { useEffect, useReducer } from "react";
import type { WltCaptainCodState } from "./wlt-captain-cod.states";
import type { WltDshCodReference } from "../finance-boundary/wlt-dsh-boundary.types";
import type { DshReferenceApiResult } from "./wlt-cod.api";

export type WltCaptainCodRecordsFetcher = (
  captainId: string,
) => Promise<DshReferenceApiResult<WltDshCodReference[]>>;

type Action =
  | { type: "LOADING" }
  | { type: "LOADED"; records: WltDshCodReference[] }
  | { type: "ERROR"; message: string }
  | { type: "NOT_AVAILABLE" };

function reducer(_state: WltCaptainCodState, action: Action): WltCaptainCodState {
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

export type WltCaptainCodController = {
  readonly state: WltCaptainCodState;
  readonly retry: () => void;
};

export function useWltDshCaptainCodReferenceController(
  captainId: string | null | undefined,
  fetchCodRecords: WltCaptainCodRecordsFetcher,
): WltCaptainCodController {
  const [state, dispatch] = useReducer(reducer, { kind: "not_available" });

  const load = () => {
    if (!captainId) {
      dispatch({ type: "NOT_AVAILABLE" });
      return;
    }

    dispatch({ type: "LOADING" });

    fetchCodRecords(captainId)
      .then((res) => {
        if (res.ok) {
          dispatch({ type: "LOADED", records: res.data });
        } else {
          dispatch({ type: "ERROR", message: res.message });
        }
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
  }, [captainId, fetchCodRecords]);

  return { state, retry: load };
}
