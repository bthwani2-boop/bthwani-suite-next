/**
 * Home Discovery — Domain Types
 * Derived from generated DSH types. Publication-governance metadata is owned by
 * the active dsh.home-marketing-governance.openapi.yaml contract shard until it
 * is folded into the parent generated client.
 */

import type { paths } from '../../../clients/generated/dsh-api';

export type DshHomeDiscoveryResponseDto =
  paths['/dsh/home-discovery']['get']['responses']['200']['content']['application/json'];

export type DshHomeBannerDto = DshHomeDiscoveryResponseDto['banners'][number];
export type DshHomePromoDto = DshHomeDiscoveryResponseDto['promos'][number];
export type DshHomeFilterDto = DshHomeDiscoveryResponseDto['filters'][number];
export type DshHomeCategoryDto = DshHomeDiscoveryResponseDto['categories'][number];
export type DshHomeStoreDto = DshHomeDiscoveryResponseDto['stores'][number];
export type DshHomePaginationDto = DshHomeDiscoveryResponseDto['pagination'];

export type DiscoveryFilterKind = DshHomeFilterDto['kind'];
export type DshHomeAudienceSegment = 'guest' | 'authenticated';

export type DshHomeDiscoveryParams =
  paths['/dsh/home-discovery']['get']['parameters']['query'] & {
    readonly audienceSegment?: DshHomeAudienceSegment;
  };

export type DshHomeAdminKind =
  paths['/dsh/operator/home-discovery/{kind}']['get']['parameters']['path']['kind'];

type GeneratedHomeAdminContentItem =
  paths['/dsh/operator/home-discovery/{kind}']['get']['responses']['200']['content']['application/json']['items'][number];

type GeneratedHomeAdminContentInput =
  paths['/dsh/operator/home-discovery/{kind}']['post']['requestBody']['content']['application/json'];

export type DshHomePublicationStatus = 'draft' | 'published' | 'paused' | 'archived';

export type DshHomeAdminContentItem = GeneratedHomeAdminContentItem & {
  readonly publicationStatus: DshHomePublicationStatus;
  readonly publishFrom?: string;
  readonly publishUntil?: string;
  readonly createdByActorId: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly version: number;
};

export type DshHomeAdminContentInput = GeneratedHomeAdminContentInput & {
  readonly publicationStatus: DshHomePublicationStatus;
  readonly publishFrom?: string;
  readonly publishUntil?: string;
  readonly expectedVersion?: number;
};
