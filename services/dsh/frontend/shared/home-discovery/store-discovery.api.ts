import { createDshFlexibleHttpClient } from '../_kernel/dsh-http-request';
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import type { DshHomeStoreDto } from './home-discovery.types';
import { toHomeStoreCardViewModel, type HomeStoreCardViewModel } from './home-discovery.view-model';

export interface DiscoveryStoreSearchParams {
  readonly cityCode?: string;
  readonly serviceAreaCode?: string;
  readonly search?: string;
  readonly category?: string;
  readonly sort?: string;
  readonly isFreeDelivery?: boolean;
  readonly hasProBadge?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

export async function fetchDiscoveryStores(params: DiscoveryStoreSearchParams): Promise<readonly HomeStoreCardViewModel[]> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!validateDshApiBaseUrl(baseUrl)) {
    throw new Error(`DSH_API_BASE_URL_INVALID: "${baseUrl}" is not a valid URL`);
  }

  const httpClient = createDshFlexibleHttpClient(baseUrl);

  const query: Record<string, string | undefined> = {
    cityCode: params.cityCode,
    serviceAreaCode: params.serviceAreaCode,
    search: params.search,
    category: params.category,
    sort: params.sort,
    limit: params.limit?.toString(),
    offset: params.offset?.toString(),
  };

  if (params.isFreeDelivery !== undefined) {
    query.isFreeDelivery = params.isFreeDelivery.toString();
  }
  if (params.hasProBadge !== undefined) {
    query.hasProBadge = params.hasProBadge.toString();
  }

  const dto = await httpClient.request<{ readonly stores: readonly DshHomeStoreDto[] }>('/dsh/stores', {
    query,
  });

  if (!dto || !Array.isArray(dto.stores)) {
    throw new Error('DSH_INVALID_RESPONSE: response missing stores collection');
  }

  return dto.stores.map(toHomeStoreCardViewModel);
}
