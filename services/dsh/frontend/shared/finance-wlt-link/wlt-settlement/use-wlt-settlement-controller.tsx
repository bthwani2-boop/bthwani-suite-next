import { useCallback, useState } from "react";
import { fetchDshWltSettlementsByPartner, fetchDshWltSettlementSummary } from "./wlt-settlement.api";
import type {
  DshWltSettlementState,
  DshWltSettlementSummaryState,
} from "./wlt-settlement.types";

function useWltSettlementController() {
  const [state, setState] = useState<DshWltSettlementState>({ kind: "idle" });

  const loadByPartner = useCallback(async (partnerId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltSettlementsByPartner(partnerId);
    if (result.ok) {
      setState({ kind: "loaded", settlements: result.views });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadByPartner, reset };
}

function useWltSettlementSummaryController() {
  const [state, setState] = useState<DshWltSettlementSummaryState>({ kind: "idle" });

  const loadSummary = useCallback(async (partnerId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltSettlementSummary(partnerId);
    if (result.ok) {
      setState({ kind: "loaded", summary: result.view });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, loadSummary, reset };
}
