import { loadingState, type HomeDiscoveryState } from "./home-discovery.states";
import type { DiscoveryFilterKind } from "./home-discovery.types";

export type HomeDiscoveryControllerModel = {
  readonly state: HomeDiscoveryState;
  readonly activeFilter: DiscoveryFilterKind;
};

export const HOME_DISCOVERY_INITIAL_FILTER: DiscoveryFilterKind = "all";

export async function loadHomeDiscovery(
  fetcher: () => Promise<HomeDiscoveryState>,
  publish: (state: HomeDiscoveryState) => void,
): Promise<void> {
  publish(loadingState());
  publish(await fetcher());
}
