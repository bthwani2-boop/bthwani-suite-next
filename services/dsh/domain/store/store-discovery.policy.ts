import type {
  DshStoreRow,
  DshStoreSummary,
  DshStoreDetail,
  DshStoreStatus,
  DshStoreListQuery,
} from "./store-discovery.types";

export function isStoreVisibleToClient(row: DshStoreRow): boolean {
  return row.is_visible && row.status === "active";
}

export function applyClientVisibilityFilter(
  rows: readonly DshStoreRow[],
): readonly DshStoreRow[] {
  return rows.filter(isStoreVisibleToClient);
}

export function validateListQuery(query: DshStoreListQuery): string | null {
  if (query.limit < 1 || query.limit > 100) {
    return "limit must be between 1 and 100";
  }
  if (query.offset < 0) {
    return "offset must be >= 0";
  }
  if (query.status !== undefined && !isValidStatus(query.status)) {
    return `invalid status: ${query.status}`;
  }
  return null;
}

function isValidStatus(s: string): s is DshStoreStatus {
  return ["active", "inactive", "temporarily_closed", "unavailable"].includes(
    s,
  );
}

export function rowToSummary(row: DshStoreRow): DshStoreSummary {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    status: row.status,
    cityCode: row.city_code,
    serviceAreaCode: row.service_area_code,
    serviceability: { status: row.serviceability_status },
    ratingAverage: row.rating_average,
    ratingCount: row.rating_count,
    deliveryEtaMin: row.delivery_eta_min,
    deliveryEtaMax: row.delivery_eta_max,
    isVisible: row.is_visible,
    heroImageUrl: row.hero_image_url,
    logoUrl: row.logo_url,
  };
}

export function rowToDetail(row: DshStoreRow): DshStoreDetail {
  return {
    ...rowToSummary(row),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
