/**
 * Home Discovery Home Discovery — Policy
 * Access gates, capability checks, and client-side filter behavior.
 * Lives in shared so any surface can reuse filter logic without re-implementing it.
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
 * Applies a client-side discovery filter to a list of store view-models.
 *
 * - `all`       → original order (no mutation)
 * - `nearest`   → sort by distance ascending; stores without distance go last
 * - `offers`    → keep only stores with coupon badge or free delivery
 * - `favorites` → empty (requires user auth + server-side favorites endpoint, not yet available)
 * - `new`       → original order (backend already seeds newest first; no client sort needed)
 */
export function applyDiscoveryFilter(
  stores: readonly HomeStoreCardViewModel[],
  filter: DiscoveryFilterKind,
): HomeStoreCardViewModel[] {
  switch (filter) {
    case 'favorites':
      return [];

    case 'nearest':
      return [...stores].sort((a, b) => {
        if (a.distanceDisplay == null && b.distanceDisplay == null) return 0;
        if (a.distanceDisplay == null) return 1;
        if (b.distanceDisplay == null) return -1;
        return 0;
      });

    case 'offers':
      return stores.filter((s) => s.hasCouponBadge || s.isFreeDelivery);

    case 'new':
    case 'all':
    default:
      return [...stores];
  }
}
