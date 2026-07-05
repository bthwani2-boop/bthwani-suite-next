import { useEffect, useReducer } from "react";
import type { WltCaptainCodState } from "./wlt-dsh-captain-cod.states";
import { fetchWltCodRecordsByCapitain } from "./wlt-dsh-cod.api";

type Action =
  | { type: "LOADING" }
  | { type: "LOADED"; records: import("./wlt-dsh-boundary.types").WltDshCodReference[] }
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

/**
 * WLT-owned reference controller for a captain's COD (cash-on-delivery) liability.
 * DSH surfaces (app-captain) must consume COD/settlement figures through this
 * controller instead of computing or simulating their own financial state.
 */
export function useWltDshCaptainCodReferenceController(
  captainId: string | null | undefined,
): WltCaptainCodController {
  const [state, dispatch] = useReducer(reducer, { kind: "not_available" });

  const load = () => {
    if (!captainId) {
      dispatch({ type: "NOT_AVAILABLE" });
      return;
    }

    dispatch({ type: "LOADING" });

    fetchWltCodRecordsByCapitain(captainId)
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
  }, [captainId]);

  return { state, retry: load };
}
