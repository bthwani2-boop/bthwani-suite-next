/**
 * Home Discovery — View Model
 * Maps DTOs to screen-safe view models.
 * Returns semantic roles, never raw hex.
 * DB-backed runtime data only.
 */

import type {
  DshHomeBannerDto,
  DshHomePromoDto,
  DshHomeCategoryDto,
  DshHomeStoreDto,
} from './home-discovery.types';
import { resolveDshMediaUrl } from '../_kernel/dsh-media-url';
import type { DshStoreCardViewModel } from '../store';

export type BannerViewModel = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionType: string;
  actionTarget: string;
};

export type PromoViewModel = {
  id: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  imageUrl: string;
  actionType: string;
  actionTarget: string;
};

export type CategoryViewModel = {
  id: string;
  label: string;
  iconUrl: string;
  sortOrder: number;
};

type FilterViewModel = {
  id: string;
  label: string;
  kind: string;
  isActive: boolean;
};

export type HomeStoreCardViewModel = {
  id: string;
  slug: string;
  displayName: string;
  serviceabilityStatus: string;
  storeStatus: string;
  ratingDisplay: string;
  followerCountDisplay: string;
  etaDisplay: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  categoryLabel: string;
  categoryId: string;
  isFreeDelivery: boolean;
  hasProBadge: boolean;
  hasCouponBadge: boolean;
  isPopular: boolean;
  pointsMultiplier: number | null;
  distanceDisplay: string | null;
  /** Human-readable delivery mode labels e.g. ["⚡ ثواني", "توصيل", "استلم"] */
  deliveryModeLabels: readonly string[];
  /** Semantic role for open/closed indicator, resolved by UI via ui-kit tokens */
  openStatusRole: 'storeOpen' | 'storeClosed' | 'storeTemporaryClosed' | 'storeUnavailable';
};

const DELIVERY_MODE_LABELS: Record<string, string> = {
  delivery: 'توصيل',
  pickup:   'استلام',
  express:  '⚡ ثواني',
};

function formatFollowerCount(count: number): string {
  if (count >= 1000) {
    return new Intl.NumberFormat('ar', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
  }
  return String(count);
}

function formatRating(avg?: number): string {
  if (avg == null) return '—';
  return avg.toFixed(1);
}

function formatEta(min?: number, max?: number): string {
  if (min == null || max == null) return '—';
  return `${min}–${max} د`;
}

function resolveOpenStatusRole(status: string, serviceabilityStatus: string): HomeStoreCardViewModel['openStatusRole'] {
  if (status === 'active' && serviceabilityStatus === 'serviceable') return 'storeOpen';
  if (status === 'temporarily_closed') return 'storeTemporaryClosed';
  if (serviceabilityStatus === 'unavailable' || serviceabilityStatus === 'out_of_area') return 'storeUnavailable';
  return 'storeClosed';
}

export function toBannerViewModel(dto: DshHomeBannerDto): BannerViewModel {
  return {
    id: dto.id,
    title: dto.title,
    subtitle: dto.subtitle ?? '',
    imageUrl: resolveDshMediaUrl(dto.imageUrl) ?? '',
    actionType: dto.actionType,
    actionTarget: dto.actionTarget,
  };
}

export function toPromoViewModel(dto: DshHomePromoDto): PromoViewModel {
  return {
    id: dto.id,
    title: dto.title,
    subtitle: dto.subtitle ?? '',
    badgeLabel: dto.badgeLabel ?? '',
    imageUrl: resolveDshMediaUrl(dto.imageUrl) ?? '',
    actionType: dto.actionType,
    actionTarget: dto.actionTarget,
  };
}

export function toCategoryViewModel(dto: DshHomeCategoryDto): CategoryViewModel {
  return {
    id: dto.id,
    label: dto.label,
    iconUrl: dto.iconUrl ?? '',
    sortOrder: dto.sortOrder,
  };
}

export function toHomeStoreCardViewModel(dto: DshHomeStoreDto): HomeStoreCardViewModel {
  return {
    id: dto.id,
    slug: dto.slug,
    displayName: dto.displayName,
    serviceabilityStatus: dto.serviceability.status,
    storeStatus: dto.status,
    ratingDisplay: formatRating(dto.ratingAverage),
    followerCountDisplay: formatFollowerCount(dto.followerCount),
    etaDisplay: formatEta(dto.deliveryEtaMin, dto.deliveryEtaMax),
    heroImageUrl: resolveDshMediaUrl(dto.heroImageUrl),
    logoUrl: resolveDshMediaUrl(dto.logoUrl),
    categoryLabel: dto.categoryLabel,
    categoryId: dto.category,
    isFreeDelivery: dto.isFreeDelivery,
    hasProBadge: dto.hasProBadge,
    hasCouponBadge: dto.hasCouponBadge,
    isPopular: dto.isPopular,
    pointsMultiplier: dto.pointsMultiplier ?? null,
    distanceDisplay: dto.distanceKm != null ? `${dto.distanceKm.toFixed(1)} كم` : null,
    deliveryModeLabels: (dto.deliveryModes ?? []).map((m) => DELIVERY_MODE_LABELS[m] ?? m),
    openStatusRole: resolveOpenStatusRole(dto.status, dto.serviceability.status),
  };
}

export function toSharedStoreCardViewModel(
  vm: HomeStoreCardViewModel,
): DshStoreCardViewModel {
  return {
    id: vm.id,
    displayName: vm.displayName,
    cityCode: "",
    serviceAreaCode: "",
    locationLabel: vm.categoryLabel,
    isOpen: vm.openStatusRole === "storeOpen",
    isServiceable: vm.serviceabilityStatus === "serviceable",
    ratingLabel: vm.ratingDisplay === "—" ? null : vm.ratingDisplay,
    ratingAverage: vm.ratingDisplay === "—" ? null : Number(vm.ratingDisplay),
    etaLabel: vm.etaDisplay === "—" ? null : vm.etaDisplay,
    heroImageSource: vm.heroImageUrl === null ? null : { uri: vm.heroImageUrl },
    logoImageSource: vm.logoUrl === null ? null : { uri: vm.logoUrl },
    statusBadge:
      vm.storeStatus === "temporarily_closed" ? "مغلق مؤقتًا" : null,
    isFreeDelivery: vm.isFreeDelivery,
    placeholderEmoji: "🏪",
    placeholderTone: "brandAction",
    deliveryModeLabels: vm.deliveryModeLabels,
    distanceLabel: vm.distanceDisplay,
    distanceKm: null,
    followerCountLabel: vm.followerCountDisplay,
    hasProBadge: vm.hasProBadge,
    hasCouponBadge: vm.hasCouponBadge,
    pointsMultiplier: vm.pointsMultiplier,
    isPopular: vm.isPopular,
    isClientEligible: true,
  };
}
