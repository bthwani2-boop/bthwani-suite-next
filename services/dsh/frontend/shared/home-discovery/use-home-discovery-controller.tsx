import { useCallback, useEffect, useState } from "react";
import { fetchHomeDiscovery } from "./home-discovery.api";
import {
  HOME_DISCOVERY_INITIAL_FILTER,
  loadHomeDiscovery,
} from "./home-discovery.controller-core";
import { loadingState, type HomeDiscoveryState } from "./home-discovery.states";
import type { DiscoveryFilterKind } from "./home-discovery.types";

export type HomeDiscoveryController = {
  readonly state: HomeDiscoveryState;
  readonly activeFilter: DiscoveryFilterKind;
  readonly setActiveFilter: (filter: DiscoveryFilterKind) => void;
  readonly retry: () => void;
};

export function useHomeDiscoveryController(): HomeDiscoveryController {
  const [state, setState] = useState<HomeDiscoveryState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilterKind>(
    HOME_DISCOVERY_INITIAL_FILTER,
  );

  const load = useCallback(async () => {
    await loadHomeDiscovery(
      () => fetchHomeDiscovery({ limit: 20 }),
      setState,
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    state,
    activeFilter,
    setActiveFilter,
    retry: () => {
      void load();
    },
  };
}
