"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTablePageFrame } from "@bthwani/app-shell";
import { StoreAdminKpiStrip } from "./StoreAdminKpiStrip";
import { StoreAdminFilters } from "./StoreAdminFilters";
import { StoreAdminTable } from "./StoreAdminTable";
import { StoreDetailAdminPanel } from "./StoreDetailAdminPanel";
import { StoreAdminStateView } from "./StoreAdminStateView";
import {
  fetchAdminStoreList,
  fetchAdminStoreDetail,
  adminLoadingState,
} from "../../../shared/store/store-admin.api";
import {
  toAdminKpiSummary,
  applyAdminFilters,
  ADMIN_FILTERS_EMPTY,
  type DshStoreAdminListState,
  type DshStoreAdminDetailState,
  type DshStoreAdminFilters,
} from "../../../shared/store/store-admin.view-model";

const PAGE_LIMIT = 20;

export function StoreManagementScreen() {
  const [listState, setListState] = useState<DshStoreAdminListState>(adminLoadingState());
  const [detailState, setDetailState] = useState<DshStoreAdminDetailState | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DshStoreAdminFilters>(ADMIN_FILTERS_EMPTY);
  const [offset, setOffset] = useState(0);

  const loadStores = useCallback(async (currentOffset: number) => {
    setListState(adminLoadingState());
    const state = await fetchAdminStoreList({ limit: PAGE_LIMIT, offset: currentOffset });
    setListState(state);
  }, []);

  useEffect(() => {
    loadStores(offset);
  }, [loadStores, offset]);

  useEffect(() => {
    if (!selectedStoreId) {
      setDetailState(null);
      return;
    }
    setDetailState({ kind: "loading" });
    fetchAdminStoreDetail(selectedStoreId).then(setDetailState);
  }, [selectedStoreId]);

  const handleRetry = useCallback(() => {
    loadStores(offset);
  }, [loadStores, offset]);

  const handleSelectStore = useCallback((id: string | null) => {
    setSelectedStoreId(id);
  }, []);

  const visibleRows =
    listState.kind === "success"
      ? applyAdminFilters(listState.rows, filters)
      : [];

  const kpi =
    listState.kind === "success"
      ? toAdminKpiSummary(listState.rows, listState.total)
      : null;

  const isNonSuccess = listState.kind !== "success";
  const total = listState.kind === "success" ? listState.total : 0;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <div style={{ padding: "1rem 1rem 0" }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
            إدارة المتاجر — DSH-001
          </h1>
          {kpi !== null && <StoreAdminKpiStrip kpi={kpi} />}
        </div>
      }
      filters={<StoreAdminFilters filters={filters} onChange={setFilters} />}
      toolbar={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            opacity: 0.75,
          }}
        >
          <span>
            {listState.kind === "success"
              ? `${total} متجر إجمالاً — يعرض ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)}`
              : ""}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {offset > 0 && (
              <NavButton
                label="السابق"
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_LIMIT))}
              />
            )}
            {listState.kind === "success" && offset + PAGE_LIMIT < total && (
              <NavButton
                label="التالي"
                onClick={() => setOffset((o) => o + PAGE_LIMIT)}
              />
            )}
            <NavButton label="تحديث" onClick={handleRetry} />
          </div>
        </div>
      }
      stateView={isNonSuccess ? <StoreAdminStateView state={listState} onRetry={handleRetry} /> : undefined}
    >
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <StoreAdminTable
            rows={visibleRows}
            selectedStoreId={selectedStoreId}
            onSelectStore={handleSelectStore}
          />
        </div>
        {selectedStoreId !== null && detailState !== null && (
          <aside
            style={{
              width: "22rem",
              flexShrink: 0,
              borderInlineStart: "1px solid rgba(0, 0, 0, 0.1)",
              overflowY: "auto",
            }}
          >
            <StoreDetailAdminPanel
              state={detailState}
              onClose={() => handleSelectStore(null)}
            />
          </aside>
        )}
      </div>
    </DataTablePageFrame>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "1px solid currentColor",
        borderRadius: "0.25rem",
        padding: "0.25rem 0.75rem",
        cursor: "pointer",
        fontSize: "0.8rem",
      }}
    >
      {label}
    </button>
  );
}
