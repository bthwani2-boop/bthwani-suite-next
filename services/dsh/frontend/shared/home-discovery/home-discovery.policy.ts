/**
 * Home Discovery — shared policy.
 * Access gates, capability checks, and client-side filter behavior.
 */

import type { DiscoveryFilterKind } from './home-discovery.types';
import type { HomeStoreCardViewModel } from './home-discovery.view-model';

export type DshClientContext = {
  isAuthenticated?: boolean;
};

/** Home discovery is publicly accessible — no auth required for browsing. */
export function canViewHomeDiscovery(_ctx: DshClientContext): boolean {
  return true;
}

/**
 * A filter is operational only when its result can be derived from governed
 * runtime truth. Favorites remain hidden until DSH exposes an authenticated,
 * persistent favorites contract with readback.
 */
export function isDiscoveryFilterOperational(filter: DiscoveryFilterKind): boolean {
  return filter !== 'favorites';
}

function hasDistance(store: HomeStoreCardViewModel): boolean {
  return store.distanceKm != null || store.distanceDisplay != null;
}

/**
 * Applies an operational client-side discovery filter.
 * Unsupported filters fail safe by preserving the governed store feed instead
 * of presenting an empty result that implies persisted user state exists.
 */
export function applyDiscoveryFilter(
  stores: readonly HomeStoreCardViewModel[],
  filter: DiscoveryFilterKind,
): HomeStoreCardViewModel[] {
  switch (filter) {
    case 'nearest':
      return [...stores].sort((a, b) => {
        const aHasDistance = hasDistance(a);
        const bHasDistance = hasDistance(b);
        if (!aHasDistance && !bHasDistance) return 0;
        if (!aHasDistance) return 1;
        if (!bHasDistance) return -1;
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      });

    case 'offers':
      return stores.filter((store) => store.hasCouponBadge || store.isFreeDelivery);

    case 'favorites':
    case 'new':
    case 'all':
    default:
      return [...stores];
  }
}
