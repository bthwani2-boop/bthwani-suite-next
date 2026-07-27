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
  DshHomeCategoryDestinationType,
  DshHomeStoreDto,
} from './home-discovery.types';
import { resolveDshMediaUrl } from '../_kernel/dsh-media-url';
import {
  toCardViewModel,
  type DshStoreCardViewModel,
} from '../store';

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
  destinationType: DshHomeCategoryDestinationType;
  destinationTarget: string;
};

export type HomeStoreCardViewModel = DshStoreCardViewModel & {
  readonly slug: string;
  readonly serviceabilityStatus: string;
  readonly storeStatus: string;
  readonly ratingDisplay: string;
  readonly followerCountDisplay: string;
  readonly etaDisplay: string;
  readonly heroImageUrl: string | null;
  readonly logoUrl: string | null;
  readonly categoryLabel: string;
  readonly categoryId: string;
  readonly distanceDisplay: string | null;
  readonly openStatusRole: 'storeOpen' | 'storeClosed' | 'storeTemporaryClosed' | 'storeUnavailable';
};

function resolveOpenStatusRole(
  status: string,
  serviceabilityStatus: string,
): HomeStoreCardViewModel['openStatusRole'] {
  if (status === 'temporarily_closed') return 'storeTemporaryClosed';
  if (
    status === 'unavailable' ||
    serviceabilityStatus === 'unavailable' ||
    serviceabilityStatus === 'out_of_area'
  ) {
    return 'storeUnavailable';
  }
  if (status === 'active') return 'storeOpen';
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
    actionType: dto.actionType ?? 'none',
    actionTarget: dto.actionTarget ?? '',
  };
}

export function toCategoryViewModel(dto: DshHomeCategoryDto): CategoryViewModel {
  return {
    id: dto.id,
    label: dto.label,
    iconUrl: resolveDshMediaUrl(dto.iconUrl) ?? dto.iconUrl ?? '',
    sortOrder: dto.sortOrder,
    destinationType: dto.destinationType,
    destinationTarget: dto.destinationTarget,
  };
}

export function toHomeStoreCardViewModel(dto: DshHomeStoreDto): HomeStoreCardViewModel {
  const shared = toCardViewModel(dto);

  return {
    ...shared,
    slug: dto.slug,
    serviceabilityStatus: dto.serviceability.status,
    storeStatus: dto.status,
    ratingDisplay: shared.ratingAverage == null ? '—' : shared.ratingAverage.toFixed(1),
    followerCountDisplay: shared.followerCountLabel ?? '0',
    etaDisplay: shared.etaLabel ?? '—',
    heroImageUrl: shared.heroImageSource?.uri ?? null,
    logoUrl: shared.logoImageSource?.uri ?? null,
    categoryLabel: dto.categoryLabel,
    categoryId: dto.category,
    distanceDisplay: shared.distanceLabel,
    openStatusRole: resolveOpenStatusRole(dto.status, dto.serviceability.status),
  };
}

/**
 * Home discovery and store discovery share one canonical store-card contract.
 * This adapter remains only as a compatibility boundary for app-client callers.
 */
export function toSharedStoreCardViewModel(
  vm: HomeStoreCardViewModel,
): DshStoreCardViewModel {
  return vm;
}
