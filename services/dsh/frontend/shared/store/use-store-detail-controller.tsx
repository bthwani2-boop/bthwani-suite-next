import { useCallback, useEffect, useState } from "react";
import { fetchStoreDetail } from "./store-discovery.api";
import type { DshStoreDetailState } from "./store-discovery.states";

export type StoreDetailController = {
  readonly state: DshStoreDetailState;
  readonly retry: () => void;
};

export function useStoreDetailController(storeId: string): StoreDetailController {
  const [state, setState] = useState<DshStoreDetailState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetchStoreDetail(storeId);
      setState(response);
    } catch (err: unknown) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "unknown error",
      });
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    state,
    retry: load,
  };
}
