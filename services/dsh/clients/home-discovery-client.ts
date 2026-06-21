/**
 * DSH-002 Home Discovery Client
 * Typed client for GET /dsh/home-discovery
 * Uses fetch with timeout — DB-backed runtime data only.
 */

export type DshHomeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionType: 'store' | 'category' | 'external' | 'none';
  actionTarget: string;
};

export type DshHomePromo = {
  id: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  imageUrl: string;
  actionType: 'store' | 'category' | 'external' | 'none';
  actionTarget: string;
};

export type DshHomeFilter = {
  id: string;
  label: string;
  kind: 'all' | 'favorites' | 'nearest' | 'new' | 'offers';
  isActive: boolean;
};

export type DshHomeCategory = {
  id: string;
  label: string;
  iconUrl?: string;
  sortOrder: number;
};

export type DshHomeStore = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  serviceability: { status: string };
  ratingAverage?: number;
  ratingCount: number;
  deliveryEtaMin?: number;
  deliveryEtaMax?: number;
  heroImageUrl?: string;
  logoUrl?: string;
  category: string;
  categoryLabel: string;
  isFreeDelivery: boolean;
  hasProBadge: boolean;
  hasCouponBadge: boolean;
  isPopular: boolean;
  followerCount: number;
  pointsMultiplier?: number;
  cityCode: string;
  serviceAreaCode: string;
  isVisible: boolean;
  deliveryModes: string[];
  distanceKm?: number;
};

export type DshHomePagination = {
  limit: number;
  offset: number;
  total: number;
};

export type DshHomeDiscoveryResponse = {
  banners: DshHomeBanner[];
  promos: DshHomePromo[];
  filters: DshHomeFilter[];
  categories: DshHomeCategory[];
  stores: DshHomeStore[];
  pagination: DshHomePagination;
  generatedAt: string;
};

export type DshHomeDiscoveryParams = {
  cityCode?: string;
  serviceAreaCode?: string;
  limit?: number;
};

export type DshHomeDiscoveryClientError =
  | { kind: 'http'; status: number; body: unknown }
  | { kind: 'network'; message: string }
  | { kind: 'invalid_response'; message: string };

export interface DshHomeDiscoveryClient {
  getHomeDiscovery(params?: DshHomeDiscoveryParams): Promise<DshHomeDiscoveryResponse>;
}

export function createDshHomeDiscoveryClient(baseUrl: string): DshHomeDiscoveryClient {
  return {
    async getHomeDiscovery(params: DshHomeDiscoveryParams = {}): Promise<DshHomeDiscoveryResponse> {
      const url = new URL('/dsh/home-discovery', baseUrl);
      if (params.cityCode) url.searchParams.set('cityCode', params.cityCode);
      if (params.serviceAreaCode) url.searchParams.set('serviceAreaCode', params.serviceAreaCode);
      if (params.limit != null) url.searchParams.set('limit', String(params.limit));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      let res: Response;
      try {
        res = await fetch(url.toString(), { signal: controller.signal });
      } catch (err: unknown) {
        const error: DshHomeDiscoveryClientError = {
          kind: 'network',
          message: err instanceof Error ? err.message : 'network error',
        };
        throw error;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const error: DshHomeDiscoveryClientError = { kind: 'http', status: res.status, body };
        throw error;
      }

      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !Array.isArray((data as Record<string, unknown>)['banners']) ||
        !Array.isArray((data as Record<string, unknown>)['stores'])
      ) {
        const error: DshHomeDiscoveryClientError = {
          kind: 'invalid_response',
          message: 'response missing required fields: banners, stores',
        };
        throw error;
      }

      return data as DshHomeDiscoveryResponse;
    },
  };
}
