import { useCallback, useEffect, useState } from "react";
import { fetchHomeDiscovery } from "./home-discovery.api";
import {
  HOME_DISCOVERY_INITIAL_FILTER,
  loadHomeDiscovery,
} from "./home-discovery.controller-core";
import { loadingState, type HomeDiscoveryState } from "./home-discovery.states";
import type { DiscoveryFilterKind } from "./home-discovery.types";

export type HomeDiscoveryScope = {
  readonly cityCode?: string;
  readonly serviceAreaCode?: string;
  readonly enabled?: boolean;
};

export type HomeDiscoveryController = {
  readonly state: HomeDiscoveryState;
  readonly activeFilter: DiscoveryFilterKind;
  readonly setActiveFilter: (filter: DiscoveryFilterKind) => void;
  readonly retry: () => void;
};

export function useHomeDiscoveryController(
  scope: HomeDiscoveryScope = {},
): HomeDiscoveryController {
  const [state, setState] = useState<HomeDiscoveryState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilterKind>(
    HOME_DISCOVERY_INITIAL_FILTER,
  );
  const enabled = scope.enabled ?? true;
  const cityCode = scope.cityCode?.trim() || undefined;
  const serviceAreaCode = scope.serviceAreaCode?.trim() || undefined;

  const load = useCallback(async () => {
    if (!enabled) {
      setState(loadingState());
      return;
    }
    await loadHomeDiscovery(
      () => fetchHomeDiscovery({ cityCode, serviceAreaCode, limit: 20 }),
      setState,
    );
  }, [cityCode, enabled, serviceAreaCode]);

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
