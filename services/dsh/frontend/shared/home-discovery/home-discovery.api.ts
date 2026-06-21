/**
 * DSH-002 Home Discovery — API Adapter
 * Reads EXPO_PUBLIC_DSH_API_BASE_URL from env.
 * DB-backed runtime data only — no static fallback.
 */

import { createDshHomeDiscoveryClient } from '../../../clients/home-discovery-client';
import {
  toBannerViewModel,
  toPromoViewModel,
  toCategoryViewModel,
  toHomeStoreCardViewModel,
} from './home-discovery.view-model';
import {
  loadingState,
  successState,
  errorState,
  serviceUnavailableState,
  emptyState,
  type HomeDiscoveryState,
} from './home-discovery.states';
import type { DshHomeDiscoveryParams } from '../../../clients/home-discovery-client';

export { loadingState };

export async function fetchHomeDiscovery(params?: DshHomeDiscoveryParams): Promise<HomeDiscoveryState> {
  const baseUrl = process.env['EXPO_PUBLIC_DSH_API_BASE_URL'];
  if (!baseUrl) {
    return errorState('DSH_API_BASE_URL_NOT_SET: EXPO_PUBLIC_DSH_API_BASE_URL is not configured');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
    void parsedUrl;
  } catch {
    return errorState(`DSH_API_BASE_URL_INVALID: "${baseUrl}" is not a valid URL`);
  }

  const client = createDshHomeDiscoveryClient(baseUrl);

  try {
    const dto = await client.getHomeDiscovery(params);

    const banners = dto.banners.map(toBannerViewModel);
    const promos = dto.promos.map(toPromoViewModel);
    const categories = dto.categories.map(toCategoryViewModel);
    const stores = dto.stores.map(toHomeStoreCardViewModel);

    if (stores.length === 0 && banners.length === 0) {
      return emptyState();
    }

    return successState({
      banners,
      promos,
      filters: dto.filters,
      categories,
      stores,
      pagination: dto.pagination,
      generatedAt: dto.generatedAt,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'kind' in err) {
      const clientErr = err as { kind: string; status?: number; message?: string };
      if (clientErr.kind === 'http' && clientErr.status === 503) {
        return serviceUnavailableState();
      }
      if (clientErr.kind === 'http' && clientErr.status === 400) {
        return errorState('DSH_BAD_REQUEST: invalid parameters');
      }
      if (clientErr.kind === 'network') {
        return serviceUnavailableState();
      }
      if (clientErr.kind === 'invalid_response') {
        return errorState(`DSH_INVALID_RESPONSE: ${clientErr.message ?? 'unexpected response shape'}`);
      }
    }
    return errorState('DSH_UNKNOWN_ERROR: unexpected error fetching home discovery');
  }
}
