/**
 * Home Discovery — Domain Types
 * Derived from OpenAPI-generated types; DB-backed runtime data only.
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

export type DshHomeDiscoveryParams =
  paths['/dsh/home-discovery']['get']['parameters']['query'];

export type DshHomeAdminKind =
  paths['/dsh/operator/home-discovery/{kind}']['get']['parameters']['path']['kind'];

export type DshHomeAdminContentItem =
  paths['/dsh/operator/home-discovery/{kind}']['get']['responses']['200']['content']['application/json']['items'][number];

export type DshHomeAdminContentInput =
  paths['/dsh/operator/home-discovery/{kind}']['post']['requestBody']['content']['application/json'];
