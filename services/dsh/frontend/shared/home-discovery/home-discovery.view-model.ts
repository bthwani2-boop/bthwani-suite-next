/**
 * DSH-002 Home Discovery — View Model
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

export type FilterViewModel = {
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

function resolveMediaUrl(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim() === '' || !raw.startsWith('http')) return null;
  let url = raw;
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const apiBaseURL = process.env.EXPO_PUBLIC_DSH_API_BASE_URL;
    if (apiBaseURL) {
      try {
        const api = new URL(apiBaseURL);
        const media = new URL(url);
        media.hostname = api.hostname;
        url = media.toString();
      } catch {
        return null;
      }
    }
  }
  return url;
}

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
    imageUrl: resolveMediaUrl(dto.imageUrl) ?? '',
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
    imageUrl: resolveMediaUrl(dto.imageUrl) ?? '',
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
    heroImageUrl: resolveMediaUrl(dto.heroImageUrl),
    logoUrl: resolveMediaUrl(dto.logoUrl),
    categoryLabel: dto.categoryLabel,
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
