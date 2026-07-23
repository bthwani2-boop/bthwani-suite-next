import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@bthwani/data-runtime";
import { fetchHomeDiscovery } from "./home-discovery.api";
import { HOME_DISCOVERY_INITIAL_FILTER } from "./home-discovery.controller-core";
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
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilterKind>(
    HOME_DISCOVERY_INITIAL_FILTER,
  );
  const enabled = scope.enabled ?? true;
  const cityCode = scope.cityCode?.trim() || undefined;
  const serviceAreaCode = scope.serviceAreaCode?.trim() || undefined;

  // fetchHomeDiscovery never throws — network/HTTP failures resolve to
  // errorState()/serviceUnavailableState() instead. useQuery here therefore
  // provides caching, dedup, and refetch-on-reconnect only; its own
  // throw-based retry/error path is structurally unreachable for this query.
  const query = useQuery({
    queryKey: queryKeys.dshHomeDiscovery({ cityCode, serviceAreaCode }),
    queryFn: () =>
      fetchHomeDiscovery({
        ...(cityCode !== undefined ? { cityCode } : {}),
        ...(serviceAreaCode !== undefined ? { serviceAreaCode } : {}),
        limit: 20,
      }),
    enabled,
  });

  return {
    state: query.isPending ? loadingState() : (query.data ?? loadingState()),
    activeFilter,
    setActiveFilter,
    retry: () => {
      void query.refetch();
    },
  };
}
