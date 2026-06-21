import { useState, useEffect, useCallback } from "react";
import {
  fetchAdminStoreList,
  fetchAdminStoreDetail,
  adminLoadingState,
} from "./store-admin.api";
import {
  toAdminKpiSummary,
  applyAdminFilters,
  ADMIN_FILTERS_EMPTY,
  type DshStoreAdminListState,
  type DshStoreAdminDetailState,
  type DshStoreAdminFilters,
  type DshStoreAdminKpiSummary,
  type DshStoreAdminTableRow,
} from "./store-admin.view-model";

const PAGE_LIMIT = 20;

export type StoreAdminController = {
  readonly listState: DshStoreAdminListState;
  readonly detailState: DshStoreAdminDetailState | null;
  readonly selectedStoreId: string | null;
  readonly filters: DshStoreAdminFilters;
  readonly offset: number;
  readonly visibleRows: readonly DshStoreAdminTableRow[];
  readonly kpi: DshStoreAdminKpiSummary | null;
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly paginationLabel: string;
  readonly isNonSuccess: boolean;
  readonly selectStore: (id: string | null) => void;
  readonly setFilters: (next: DshStoreAdminFilters) => void;
  readonly nextPage: () => void;
  readonly prevPage: () => void;
  readonly retry: () => void;
};

export function useStoreAdminController(): StoreAdminController {
  const [listState, setListState] = useState<DshStoreAdminListState>(adminLoadingState());
  const [detailState, setDetailState] = useState<DshStoreAdminDetailState | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DshStoreAdminFilters>(ADMIN_FILTERS_EMPTY);
  const [offset, setOffset] = useState(0);

  const loadStores = useCallback(async (currentOffset: number) => {
    setListState(adminLoadingState());
    const next = await fetchAdminStoreList({ limit: PAGE_LIMIT, offset: currentOffset });
    setListState(next);
  }, []);

  useEffect(() => {
    void loadStores(offset);
  }, [loadStores, offset]);

  useEffect(() => {
    if (!selectedStoreId) {
      setDetailState(null);
      return;
    }
    setDetailState({ kind: "loading" });
    void fetchAdminStoreDetail(selectedStoreId).then(setDetailState);
  }, [selectedStoreId]);

  const retry = useCallback(() => { void loadStores(offset); }, [loadStores, offset]);
  const selectStore = useCallback((id: string | null) => setSelectedStoreId(id), []);
  const nextPage = useCallback(() => setOffset((o) => o + PAGE_LIMIT), []);
  const prevPage = useCallback(() => setOffset((o) => Math.max(0, o - PAGE_LIMIT)), []);

  const visibleRows = listState.kind === "success"
    ? applyAdminFilters(listState.rows, filters)
    : [];
  const kpi = listState.kind === "success"
    ? toAdminKpiSummary(listState.rows, listState.total)
    : null;
  const total = listState.kind === "success" ? listState.total : 0;
  const hasNextPage = listState.kind === "success" && offset + PAGE_LIMIT < total;
  const hasPrevPage = offset > 0;
  const isNonSuccess = listState.kind !== "success";
  const paginationLabel = listState.kind === "success"
    ? `${total} متجر — يعرض ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)}`
    : "";

  return {
    listState,
    detailState,
    selectedStoreId,
    filters,
    offset,
    visibleRows,
    kpi,
    total,
    hasNextPage,
    hasPrevPage,
    paginationLabel,
    isNonSuccess,
    selectStore,
    setFilters,
    nextPage,
    prevPage,
    retry,
  };
}
