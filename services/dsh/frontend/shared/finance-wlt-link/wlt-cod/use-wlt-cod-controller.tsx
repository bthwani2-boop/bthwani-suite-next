import { useCallback, useState } from "react";
import { fetchDshWltCodRecordsByCapitain, fetchDshWltCommissionsByOrder } from "./wlt-cod.api";
import type { DshWltCodState, DshWltCommissionState } from "./wlt-cod.types";

function useWltCodController() {
  const [state, setState] = useState<DshWltCodState>({ kind: "idle" });

  const loadByCapitain = useCallback(async (captainId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltCodRecordsByCapitain(captainId);
    if (result.ok) {
      setState({ kind: "loaded", records: result.views });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadByCapitain, reset };
}

function useWltCommissionController() {
  const [state, setState] = useState<DshWltCommissionState>({ kind: "idle" });

  const loadByOrder = useCallback(async (orderId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltCommissionsByOrder(orderId);
    if (result.ok) {
      setState({ kind: "loaded", commissions: result.views });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadByOrder, reset };
}
