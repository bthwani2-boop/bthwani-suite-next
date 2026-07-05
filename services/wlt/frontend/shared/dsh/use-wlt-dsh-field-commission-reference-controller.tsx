import { useEffect, useReducer } from "react";
import type { WltFieldCommissionState } from "./wlt-dsh-field-commission.states";
import type { WltDshFieldCommissionReference } from "./wlt-dsh-field-commission.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson, type WltReferenceApiResult } from "./wlt-dsh-http-request";

type Action =
  | { type: "LOADING" }
  | { type: "LOADED"; reference: WltDshFieldCommissionReference }
  | { type: "ERROR"; message: string }
  | { type: "NOT_AVAILABLE" };

function reducer(_state: WltFieldCommissionState, action: Action): WltFieldCommissionState {
  switch (action.type) {
    case "LOADING":
      return { kind: "loading" };
    case "LOADED":
      return { kind: "loaded", reference: action.reference };
    case "ERROR":
      return { kind: "error", message: action.message };
    case "NOT_AVAILABLE":
      return { kind: "not_available" };
  }
}

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<WltReferenceApiResult<WltDshFieldCommissionReference>> {
  return wltFetchJson<WltDshFieldCommissionReference>(
    `${baseUrl}/wlt/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    (body: any) => body.reference as WltDshFieldCommissionReference,
  );
}

export type WltFieldCommissionController = {
  readonly state: WltFieldCommissionState;
  readonly retry: () => void;
};

export function useWltDshFieldCommissionReferenceController(partnerId: string): WltFieldCommissionController {
  const [state, dispatch] = useReducer(reducer, { kind: "not_available" });

  const load = () => {
    const baseUrl = getWltApiBaseUrl();
    if (!baseUrl) {
      dispatch({ type: "NOT_AVAILABLE" });
      return;
    }

    dispatch({ type: "LOADING" });

    fetchWltFieldCommissionRef(baseUrl, partnerId)
      .then((res) => {
        if (res.ok) {
          dispatch({ type: "LOADED", reference: res.data });
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
  }, [partnerId]);

  return { state, retry: load };
}
