import { useCallback, useEffect, useState } from "react";
import { fetchStoreDetail } from "./store-discovery.api";
import { toggleFavoriteIds } from "./store-discovery.controller-core";
import type { DshStoreDetailState } from "./store-discovery.states";

export type StoreDetailController = {
  readonly state: DshStoreDetailState;
  readonly favoriteIds: ReadonlySet<string>;
  readonly toggleFavorite: (storeId: string) => void;
  readonly retry: () => void;
};

export function useStoreDetailController(storeId: string): StoreDetailController {
  const [state, setState] = useState<DshStoreDetailState>({ kind: "loading" });
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(new Set());

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

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => toggleFavoriteIds(prev, id));
  }, []);

  return {
    state,
    favoriteIds,
    toggleFavorite,
    retry: load,
  };
}
