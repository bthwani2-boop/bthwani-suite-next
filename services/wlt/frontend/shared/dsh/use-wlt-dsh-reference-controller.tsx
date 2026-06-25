import { useEffect, useReducer } from "react";
import type { WltDshReferenceState } from "./wlt-dsh-reference.states";
import type { WltDshReferenceContext } from "./wlt-dsh-boundary.types";
import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import {
  fetchWltPaymentStatusRef,
  fetchWltSettlementStatusRef,
  fetchWltRefundStatusRef,
} from "./wlt-dsh-reference.api";

type Action =
  | { type: "LOADING" }
  | { type: "LOADED"; reference: WltDshReferenceContext }
  | { type: "ERROR"; message: string }
  | { type: "NOT_AVAILABLE" };

function reducer(_state: WltDshReferenceState, action: Action): WltDshReferenceState {
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

export type WltDshReferenceController = {
  readonly state: WltDshReferenceState;
  readonly retry: () => void;
};

export function useWltDshReferenceController(orderId: string): WltDshReferenceController {
  const [state, dispatch] = useReducer(reducer, { kind: "not_available" });

  const load = () => {
    const baseUrl = getWltApiBaseUrl();
    if (!baseUrl) {
      dispatch({ type: "NOT_AVAILABLE" });
      return;
    }

    dispatch({ type: "LOADING" });

    Promise.all([
      fetchWltPaymentStatusRef(baseUrl, orderId),
      fetchWltSettlementStatusRef(baseUrl, orderId),
      fetchWltRefundStatusRef(baseUrl, orderId),
    ]).then(([payment, settlement, refund]) => {
      const reference: WltDshReferenceContext = {
        orderId,
        paymentStatus: payment.ok ? payment.data : null,
        settlementStatus: settlement.ok ? settlement.data : null,
        refundStatus: refund.ok ? refund.data : null,
      };
      dispatch({ type: "LOADED", reference });
    }).catch((e: unknown) => {
      dispatch({
        type: "ERROR",
        message: e instanceof Error ? e.message : "unknown error",
      });
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return { state, retry: load };
}
