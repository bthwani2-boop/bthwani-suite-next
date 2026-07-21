import { getIdentityAccessToken } from '@bthwani/core-identity';
import { createDshFlexibleHttpClient } from '../_kernel/dsh-http-request';
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
import type { DshHomeDiscoveryParams, DshHomeDiscoveryResponseDto } from './home-discovery.types';
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from '../_kernel/dsh-api-base-url';

export { loadingState };

export async function fetchHomeDiscovery(params?: DshHomeDiscoveryParams): Promise<HomeDiscoveryState> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!validateDshApiBaseUrl(baseUrl)) {
    return errorState(`DSH_API_BASE_URL_INVALID: "${baseUrl}" is not a valid URL`);
  }

  const httpClient = createDshFlexibleHttpClient(baseUrl);
  const audienceSegment = params?.audienceSegment
    ?? (getIdentityAccessToken() === null ? 'guest' : 'authenticated');

  try {
    const dto = await httpClient.request<DshHomeDiscoveryResponseDto>('/dsh/home-discovery', {
      query: {
        cityCode: params?.cityCode,
        serviceAreaCode: params?.serviceAreaCode,
        audienceSegment,
        limit: params?.limit != null ? String(params.limit) : undefined,
      },
    });

    if (
      !dto ||
      typeof dto !== 'object' ||
      !Array.isArray((dto as Record<string, unknown>)['banners']) ||
      !Array.isArray((dto as Record<string, unknown>)['stores'])
    ) {
      return errorState('DSH_INVALID_RESPONSE: response missing required fields: banners, stores');
    }

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
    }
    return errorState('DSH_UNKNOWN_ERROR: unexpected error fetching home discovery');
  }
}
