/**
 * DSH-002 Home Discovery — Domain Types
 * Derived from OpenAPI-generated types; DB-backed runtime data only.
 */

export type DshHomeBannerDto = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionType: 'store' | 'category' | 'external' | 'none';
  actionTarget: string;
};

export type DshHomePromoDto = {
  id: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  imageUrl: string;
  actionType: 'store' | 'category' | 'external' | 'none';
  actionTarget: string;
};

export type DshHomeFilterDto = {
  id: string;
  label: string;
  kind: 'all' | 'favorites' | 'nearest' | 'new' | 'offers';
  isActive: boolean;
};

export type DshHomeCategoryDto = {
  id: string;
  label: string;
  iconUrl?: string;
  sortOrder: number;
};

export type DshHomeStoreDto = {
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

export type DshHomePaginationDto = {
  limit: number;
  offset: number;
  total: number;
};

export type DshHomeDiscoveryDto = {
  banners: DshHomeBannerDto[];
  promos: DshHomePromoDto[];
  filters: DshHomeFilterDto[];
  categories: DshHomeCategoryDto[];
  stores: DshHomeStoreDto[];
  pagination: DshHomePaginationDto;
  generatedAt: string;
};

export type DiscoveryFilterKind = DshHomeFilterDto['kind'];
