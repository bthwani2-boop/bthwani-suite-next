import { useState, useEffect, useCallback } from "react";
import {
  fetchAdminStoreList,
  fetchAdminStoreDetail,
  adminLoadingState,
} from "./store-admin.api";
import {
  type DshStoreAdminListState,
  type DshStoreAdminDetailState,
  type DshStoreAdminFilters,
  type DshStoreAdminKpiSummary,
  type DshStoreAdminTableRow,
} from "./store-admin.view-model";
import {
  createStoreAdminInitialFilters,
  deriveStoreAdminView,
  loadStoreAdminDetail,
  loadStoreAdminList,
  nextStoreAdminOffset,
  previousStoreAdminOffset,
} from "./store-admin.controller-core";

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
  const [filters, setFilters] = useState<DshStoreAdminFilters>(
    createStoreAdminInitialFilters,
  );
  const [offset, setOffset] = useState(0);

  const loadStores = useCallback(async (currentOffset: number) => {
    await loadStoreAdminList(currentOffset, fetchAdminStoreList, setListState);
  }, []);

  useEffect(() => {
    void loadStores(offset);
  }, [loadStores, offset]);

  useEffect(() => {
    void loadStoreAdminDetail(
      selectedStoreId,
      fetchAdminStoreDetail,
      setDetailState,
    );
  }, [selectedStoreId]);

  const retry = useCallback(() => { void loadStores(offset); }, [loadStores, offset]);
  const selectStore = useCallback((id: string | null) => setSelectedStoreId(id), []);
  const nextPage = useCallback(() => setOffset(nextStoreAdminOffset), []);
  const prevPage = useCallback(() => setOffset(previousStoreAdminOffset), []);
  const derived = deriveStoreAdminView(listState, filters, offset);

  return {
    listState,
    detailState,
    selectedStoreId,
    filters,
    offset,
    ...derived,
    selectStore,
    setFilters,
    nextPage,
    prevPage,
    retry,
  };
}
