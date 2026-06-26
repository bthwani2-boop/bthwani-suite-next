import { useState, useEffect, useCallback } from "react";
import { fetchStoreList } from "./store-discovery.api";
import {
  loadStoreDiscovery,
  toggleFavoriteIds,
  withStoreDiscoveryFilter,
  withClientEligibilityFilter,
  type DiscoveryFilter,
} from "./store-discovery.controller-core";
import { loadingState } from "./store-discovery.states";
import type { DshStoreListState } from "./store-discovery.states";

export type StoreDiscoveryController = {
  readonly state: DshStoreListState;
  readonly visibleState: DshStoreListState;
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
    await loadStoreDiscovery(fetchStoreList, setState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = useCallback((storeId: string) => {
    setFavoriteIds((prev) => toggleFavoriteIds(prev, storeId));
  }, []);

  const eligibleState = withClientEligibilityFilter(state);

  return {
    state,
    visibleState: withStoreDiscoveryFilter(eligibleState, activeFilter, favoriteIds),
    activeFilter,
    favoriteIds,
    setActiveFilter,
    toggleFavorite,
    retry: load,
  };
}
