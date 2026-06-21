import { useState, useEffect, useCallback } from "react";
import { fetchStoreList, loadingState } from "./store-discovery.api";
import type { DshStoreListState } from "./store-discovery.states";

export type DiscoveryFilter = "all" | "favorites" | "nearest";

export type StoreDiscoveryController = {
  readonly state: DshStoreListState;
  readonly activeFilter: DiscoveryFilter;
  readonly favoriteIds: ReadonlySet<string>;
  readonly setActiveFilter: (filter: DiscoveryFilter) => void;
  readonly toggleFavorite: (storeId: string) => void;
  readonly retry: () => void;
};

export function useStoreDiscoveryController(): StoreDiscoveryController {
  const [state, setState] = useState<DshStoreListState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>("all");
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    setState(loadingState());
    const next = await fetchStoreList();
    setState(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = useCallback((storeId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }, []);

  return {
    state,
    activeFilter,
    favoriteIds,
    setActiveFilter,
    toggleFavorite,
    retry: load,
  };
}
