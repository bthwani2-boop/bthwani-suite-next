import {
  ADMIN_FILTERS_EMPTY,
  adminLoadingState,
  applyAdminFilters,
  toAdminKpiSummary,
  type DshStoreAdminDetailState,
  type DshStoreAdminFilters,
  type DshStoreAdminKpiSummary,
  type DshStoreAdminListState,
  type DshStoreAdminTableRow,
} from "./store-admin.view-model";

export const STORE_ADMIN_PAGE_LIMIT = 20;

export type StoreAdminDerivedView = {
  readonly visibleRows: readonly DshStoreAdminTableRow[];
  readonly kpi: DshStoreAdminKpiSummary | null;
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly paginationLabel: string;
  readonly isNonSuccess: boolean;
};

export function createStoreAdminInitialFilters(): DshStoreAdminFilters {
  return { ...ADMIN_FILTERS_EMPTY };
}

export function nextStoreAdminOffset(offset: number): number {
  return offset + STORE_ADMIN_PAGE_LIMIT;
}

export function previousStoreAdminOffset(offset: number): number {
  return Math.max(0, offset - STORE_ADMIN_PAGE_LIMIT);
}

export function deriveStoreAdminView(
  listState: DshStoreAdminListState,
  filters: DshStoreAdminFilters,
  offset: number,
): StoreAdminDerivedView {
  const visibleRows =
    listState.kind === "success" ? applyAdminFilters(listState.rows, filters) : [];
  const kpi =
    listState.kind === "success"
      ? toAdminKpiSummary(listState.rows, listState.total)
      : null;
  const total = listState.kind === "success" ? listState.total : 0;

  return {
    visibleRows,
    kpi,
    total,
    hasNextPage:
      listState.kind === "success" &&
      offset + STORE_ADMIN_PAGE_LIMIT < listState.total,
    hasPrevPage: offset > 0,
    paginationLabel:
      listState.kind === "success"
        ? `${listState.total} متجر — يعرض ${offset + 1}–${Math.min(offset + STORE_ADMIN_PAGE_LIMIT, listState.total)}`
        : "",
    isNonSuccess: listState.kind !== "success",
  };
}

export async function loadStoreAdminList(
  offset: number,
  fetcher: (params: {
    readonly limit: number;
    readonly offset: number;
  }) => Promise<DshStoreAdminListState>,
  publish: (state: DshStoreAdminListState) => void,
): Promise<void> {
  publish(adminLoadingState());
  publish(await fetcher({ limit: STORE_ADMIN_PAGE_LIMIT, offset }));
}

export async function loadStoreAdminDetail(
  storeId: string | null,
  fetcher: (storeId: string) => Promise<DshStoreAdminDetailState>,
  publish: (state: DshStoreAdminDetailState | null) => void,
): Promise<void> {
  if (storeId === null) {
    publish(null);
    return;
  }
  publish({ kind: "loading" });
  publish(await fetcher(storeId));
}
