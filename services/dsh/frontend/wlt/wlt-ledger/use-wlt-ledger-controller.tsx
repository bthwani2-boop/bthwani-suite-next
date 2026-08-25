import { useCallback, useState } from "react";
import { fetchDshWltLedgerEntries } from "./wlt-ledger.api";
import type { DshWltLedgerState, DshWltLedgerParams } from "./wlt-ledger.types";

function useWltLedgerController() {
  const [state, setState] = useState<DshWltLedgerState>({ kind: "idle" });

  const load = useCallback(async (params: DshWltLedgerParams) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltLedgerEntries(params);
    if (result.ok) {
      setState({ kind: "loaded", entries: result.entries, nextCursor: result.nextCursor });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, load, reset };
}
