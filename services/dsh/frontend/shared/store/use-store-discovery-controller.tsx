import { useState, useEffect, useCallback } from "react";
import { fetchStoreList } from "./store-discovery.api";
import {
  loadStoreDiscovery,
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
  readonly setActiveFilter: (filter: DiscoveryFilter) => void;
  readonly retry: () => void;
};

export function useStoreDiscoveryController(): StoreDiscoveryController {
  const [state, setState] = useState<DshStoreListState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>("all");

  const load = useCallback(async () => {
    await loadStoreDiscovery(fetchStoreList, setState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleState = withClientEligibilityFilter(state);

  return {
    state,
    visibleState: withStoreDiscoveryFilter(eligibleState, activeFilter),
    activeFilter,
    setActiveFilter,
    retry: load,
  };
}
