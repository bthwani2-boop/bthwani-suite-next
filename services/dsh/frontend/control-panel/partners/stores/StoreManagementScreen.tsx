"use client";

import { DataTablePageFrame, PaginationToolbar } from "@bthwani/app-shell";
import { useStoreAdminController } from "../../../shared/store";
import { StoreAdminKpiStrip } from "./StoreAdminKpiStrip";
import { StoreAdminFilters } from "./StoreAdminFilters";
import { StoreAdminTable } from "./StoreAdminTable";
import { StoreDetailAdminPanel } from "./StoreDetailAdminPanel";
import { StoreAdminStateView } from "./StoreAdminStateView";

export function StoreManagementScreen() {
  const c = useStoreAdminController();

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <div style={{ padding: "1rem 1rem 0" }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
            إدارة المتاجر
          </h1>
          {c.kpi !== null && <StoreAdminKpiStrip kpi={c.kpi} />}
        </div>
      }
      filters={<StoreAdminFilters filters={c.filters} onChange={c.setFilters} />}
      toolbar={
        <PaginationToolbar
          label={c.paginationLabel}
          hasPrev={c.hasPrevPage}
          hasNext={c.hasNextPage}
          onPrev={c.prevPage}
          onNext={c.nextPage}
          onRetry={c.retry}
        />
      }
      stateView={
        c.isNonSuccess
          ? <StoreAdminStateView state={c.listState} onRetry={c.retry} />
          : undefined
      }
    >
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <StoreAdminTable
            rows={c.visibleRows}
            selectedStoreId={c.selectedStoreId}
            onSelectStore={c.selectStore}
          />
        </div>
        {c.selectedStoreId !== null && c.detailState !== null && (
          <aside
            style={{
              width: "22rem",
              flexShrink: 0,
              borderInlineStart: "1px solid rgba(0, 0, 0, 0.1)",
              overflowY: "auto",
            }}
          >
            <StoreDetailAdminPanel
              state={c.detailState}
              onClose={() => c.selectStore(null)}
            />
          </aside>
        )}
      </div>
    </DataTablePageFrame>
  );
}
