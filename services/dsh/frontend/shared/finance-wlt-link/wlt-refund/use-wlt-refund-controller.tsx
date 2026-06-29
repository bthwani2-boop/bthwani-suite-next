import { useCallback, useState } from "react";
import { fetchDshWltRefundView, fetchDshWltRefundsByOrderView } from "./wlt-refund.api";
import type { DshWltRefundState, DshWltRefundView } from "./wlt-refund.types";

export function useWltRefundController() {
  const [state, setState] = useState<DshWltRefundState>({ kind: "idle" });

  const loadById = useCallback(async (refundId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltRefundView(refundId);
    if (result.ok) {
      setState({ kind: "loaded", refund: result.view });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadById, reset };
}

export function useWltRefundsByOrderController() {
  const [state, setState] = useState<
    | { readonly kind: "idle" }
    | { readonly kind: "loading" }
    | { readonly kind: "loaded"; readonly refunds: readonly DshWltRefundView[] }
    | { readonly kind: "error"; readonly message: string }
  >({ kind: "idle" });

  const loadByOrder = useCallback(async (orderId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltRefundsByOrderView(orderId);
    if (result.ok) {
      setState({ kind: "loaded", refunds: result.views });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadByOrder, reset };
}
