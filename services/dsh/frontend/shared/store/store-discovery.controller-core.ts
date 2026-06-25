import type { DshStoreCardViewModel } from "./store-discovery.view-model";
import { loadingState, type DshStoreListState } from "./store-discovery.states";

export type DiscoveryFilter = "all" | "favorites" | "nearest";

export function toggleFavoriteIds(
  current: ReadonlySet<string>,
  storeId: string,
): ReadonlySet<string> {
  const next = new Set(current);
  if (next.has(storeId)) next.delete(storeId);
  else next.add(storeId);
  return next;
}

export function applyStoreDiscoveryFilter(
  stores: readonly DshStoreCardViewModel[],
  filter: DiscoveryFilter,
  favoriteIds: ReadonlySet<string>,
): readonly DshStoreCardViewModel[] {
  switch (filter) {
    case "favorites":
      return stores.filter((store) => favoriteIds.has(store.id));
    case "nearest":
      return [...stores].sort(
        (a, b) =>
          (a.distanceKm ?? Number.POSITIVE_INFINITY) -
          (b.distanceKm ?? Number.POSITIVE_INFINITY),
      );
    case "all":
    default:
      return stores;
  }
}

export function withStoreDiscoveryFilter(
  state: DshStoreListState,
  filter: DiscoveryFilter,
  favoriteIds: ReadonlySet<string>,
): DshStoreListState {
  if (state.kind !== "success") return state;
  return {
    ...state,
    stores: applyStoreDiscoveryFilter(state.stores, filter, favoriteIds),
  };
}

export async function loadStoreDiscovery(
  fetcher: () => Promise<DshStoreListState>,
  publish: (state: DshStoreListState) => void,
): Promise<void> {
  publish(loadingState());
  publish(await fetcher());
}
