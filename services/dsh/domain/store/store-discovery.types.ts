export const DSH_STORE_STATUSES = [
  "active",
  "inactive",
  "temporarily_closed",
  "unavailable",
] as const;

export type DshStoreStatus = (typeof DSH_STORE_STATUSES)[number];

export const DSH_SERVICEABILITY_STATUSES = [
  "serviceable",
  "limited",
  "out_of_area",
  "unavailable",
] as const;

export type DshServiceabilityStatus =
  (typeof DSH_SERVICEABILITY_STATUSES)[number];

export type DshStoreRow = {
  readonly id: string;
  readonly slug: string;
  readonly display_name: string;
  readonly status: DshStoreStatus;
  readonly city_code: string;
  readonly service_area_code: string;
  readonly serviceability_status: DshServiceabilityStatus;
  readonly rating_average: number | null;
  readonly rating_count: number;
  readonly delivery_eta_min: number | null;
  readonly delivery_eta_max: number | null;
  readonly is_visible: boolean;
  readonly hero_image_url: string | null;
  readonly logo_url: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

export type DshStoreSummary = {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly status: DshStoreStatus;
  readonly cityCode: string;
  readonly serviceAreaCode: string;
  readonly serviceability: { readonly status: DshServiceabilityStatus };
  readonly ratingAverage: number | null;
  readonly ratingCount: number;
  readonly deliveryEtaMin: number | null;
  readonly deliveryEtaMax: number | null;
  readonly isVisible: boolean;
  readonly heroImageUrl: string | null;
  readonly logoUrl: string | null;
};

export type DshStoreDetail = DshStoreSummary & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshStoreListQuery = {
  readonly cityCode?: string;
  readonly serviceAreaCode?: string;
  readonly status?: DshStoreStatus;
  readonly isVisible?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type DshPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

type DshStoreListResult = {
  readonly stores: readonly DshStoreSummary[];
  readonly pagination: DshPagination;
};
