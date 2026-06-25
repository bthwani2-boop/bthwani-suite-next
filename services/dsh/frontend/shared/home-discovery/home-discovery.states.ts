/**
 * DSH-002 Home Discovery — UI States
 * Discriminated union for all screen states.
 * DB-backed runtime data in success state only.
 */

import type {
  BannerViewModel,
  PromoViewModel,
  CategoryViewModel,
  HomeStoreCardViewModel,
} from './home-discovery.view-model';
import type { DshHomeFilterDto, DshHomePaginationDto } from './home-discovery.types';

export type HomeDiscoverySuccessPayload = {
  banners: BannerViewModel[];
  promos: PromoViewModel[];
  filters: DshHomeFilterDto[];
  categories: CategoryViewModel[];
  stores: HomeStoreCardViewModel[];
  pagination: DshHomePaginationDto;
  generatedAt: string;
};

export type HomeDiscoveryState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'service_unavailable' }
  | { kind: 'success'; data: HomeDiscoverySuccessPayload };

export function loadingState(): HomeDiscoveryState {
  return { kind: 'loading' };
}

export function emptyState(): HomeDiscoveryState {
  return { kind: 'empty' };
}

export function errorState(message: string): HomeDiscoveryState {
  return { kind: 'error', message };
}

export function serviceUnavailableState(): HomeDiscoveryState {
  return { kind: 'service_unavailable' };
}

export function successState(data: HomeDiscoverySuccessPayload): HomeDiscoveryState {
  return { kind: 'success', data };
}
