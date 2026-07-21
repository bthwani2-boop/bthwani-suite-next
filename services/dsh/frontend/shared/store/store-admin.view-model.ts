import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types";

export type DshStoreAdminTableRow = {
  readonly id: string;
  readonly displayName: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly status: "active" | "inactive" | "temporarily_closed" | "unavailable";
  readonly isVisible: boolean;
  readonly cityCode: string;
  readonly serviceAreaCode: string;
  readonly serviceabilityStatus: "serviceable" | "limited" | "out_of_area" | "unavailable";
  readonly deliveryModes: readonly ("delivery" | "pickup" | "express")[];
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly ratingAverage: number | null;
  readonly ratingCount: number;
  readonly heroImageUrl: string | null;
  readonly hasProBadge: boolean;
  readonly hasCouponBadge: boolean;
  readonly partnerReadiness: "pending" | "ready" | "blocked";
  readonly catalogApprovalStatus: "draft" | "submitted" | "approved" | "rejected";
  readonly marketingVisibility: "hidden" | "visible";
  readonly publicationEligible: boolean;
};

export type DshStoreAdminDetail = DshStoreAdminTableRow & {
  readonly logoUrl: string | null;
  readonly deliveryEtaMin: number | null;
  readonly deliveryEtaMax: number | null;
  readonly isFreeDelivery: boolean;
  readonly isPopular: boolean;
  readonly pointsMultiplier: number | null;
  readonly addressLine: string;
  readonly coverageSummary: string;
  readonly operatingHours: string;
  readonly deliveryReadiness: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
};

export type DshStoreAuditEvent = {
  readonly id: string;
  readonly actorId: string;
  readonly actorRole: string;
  readonly storeId: string;
  readonly action: string;
  readonly fromState: Readonly<Record<string, unknown>>;
  readonly toState: Readonly<Record<string, unknown>>;
  readonly reason: string;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshStoreAdminListState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "service_unavailable" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | {
      readonly kind: "success";
      readonly rows: readonly DshStoreAdminTableRow[];
      readonly total: number;
      readonly limit: number;
      readonly offset: number;
    };

export type DshStoreAdminDetailState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | { readonly kind: "success"; readonly detail: DshStoreAdminDetail };

export type DshStorePublicationDiagnosticsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | {
      readonly kind: "success";
      readonly isReady: boolean;
      readonly blockers: readonly string[];
    };

export type DshStoreAuditState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | { readonly kind: "success"; readonly events: readonly DshStoreAuditEvent[] };

export type DshStoreAdminKpiSummary = {
  readonly total: number;
  readonly visible: number;
  readonly open: number;
  readonly categoryCount: number;
};

export type DshStoreAdminFilters = {
  readonly status: string | null;
  readonly isVisible: boolean | null;
  readonly category: string | null;
  readonly search: string | null;
};

export const ADMIN_FILTERS_EMPTY: DshStoreAdminFilters = {
  status: null,
  isVisible: null,
  category: null,
  search: null,
};

export function adminLoadingState(): DshStoreAdminListState {
  return { kind: "loading" };
}

export function adminEmptyState(): DshStoreAdminListState {
  return { kind: "empty" };
}

export function adminErrorState(message: string): DshStoreAdminListState {
  return { kind: "error", message };
}

export function adminServiceUnavailableState(): DshStoreAdminListState {
  return { kind: "service_unavailable" };
}

export function adminPermissionDeniedState(statusCode: 401 | 403): DshStoreAdminListState {
  return { kind: "permission_denied", statusCode };
}

export function adminSuccessState(
  rows: readonly DshStoreAdminTableRow[],
  total: number,
  limit: number,
  offset: number,
): DshStoreAdminListState {
  if (rows.length === 0 && offset === 0) return adminEmptyState();
  return { kind: "success", rows, total, limit, offset };
}

export function toAdminTableRow(dto: DshStoreSummaryDto): DshStoreAdminTableRow {
  return {
    id: dto.id,
    displayName: dto.displayName,
    category: dto.category,
    categoryLabel: dto.categoryLabel,
    status: dto.status,
    isVisible: dto.isVisible,
    cityCode: dto.cityCode,
    serviceAreaCode: dto.serviceAreaCode,
    serviceabilityStatus: dto.serviceability.status,
    deliveryModes: [...dto.deliveryModes],
    isOpen: dto.status === "active",
    isServiceable:
      dto.serviceability.status === "serviceable" ||
      dto.serviceability.status === "limited",
    ratingAverage: dto.ratingAverage ?? null,
    ratingCount: dto.ratingCount ?? 0,
    heroImageUrl: dto.heroImageUrl ?? null,
    hasProBadge: dto.hasProBadge,
    hasCouponBadge: dto.hasCouponBadge,
    partnerReadiness: dto.partnerReadiness,
    catalogApprovalStatus: dto.catalogApprovalStatus,
    marketingVisibility: dto.marketingVisibility,
    publicationEligible: dto.publicationEligible,
  };
}

export function toAdminDetail(dto: DshStoreDetailDto): DshStoreAdminDetail {
  return {
    ...toAdminTableRow(dto),
    logoUrl: dto.logoUrl ?? null,
    deliveryEtaMin: dto.deliveryEtaMin ?? null,
    deliveryEtaMax: dto.deliveryEtaMax ?? null,
    isFreeDelivery: dto.isFreeDelivery,
    isPopular: dto.isPopular,
    pointsMultiplier: dto.pointsMultiplier ?? null,
    addressLine: dto.addressLine.trim(),
    coverageSummary: dto.coverageSummary.trim(),
    operatingHours: dto.operatingHours.trim(),
    deliveryReadiness: dto.deliveryReadiness.trim(),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}

export function toAdminKpiSummary(
  rows: readonly DshStoreAdminTableRow[],
  total: number,
): DshStoreAdminKpiSummary {
  const visible = rows.filter((row) => row.isVisible).length;
  const open = rows.filter((row) => row.isOpen).length;
  const categoryCount = new Set(rows.map((row) => row.category)).size;
  return { total, visible, open, categoryCount };
}

export function applyAdminFilters(
  rows: readonly DshStoreAdminTableRow[],
  filters: DshStoreAdminFilters,
): readonly DshStoreAdminTableRow[] {
  return rows.filter((row) => {
    if (filters.status !== null && row.status !== filters.status) return false;
    if (filters.isVisible !== null && row.isVisible !== filters.isVisible) return false;
    if (filters.category !== null && row.category !== filters.category) return false;
    if (filters.search !== null && filters.search.trim().length > 0) {
      const query = filters.search.trim().toLowerCase();
      return (
        row.displayName.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query) ||
        row.cityCode.toLowerCase().includes(query) ||
        row.serviceAreaCode.toLowerCase().includes(query)
      );
    }
    return true;
  });
}
