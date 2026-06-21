"use client";

import { DataTablePageFrame } from "@bthwani/app-shell";
import { useStoreAdminController } from "../../../shared/store/use-store-admin-controller";
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
        <PaginationBar
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

function PaginationBar({
  label, hasPrev, hasNext, onPrev, onNext, onRetry,
}: {
  label: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  return (
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
      <span>{label}</span>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {hasPrev && <PagBtn label="السابق" onClick={onPrev} />}
        {hasNext && <PagBtn label="التالي" onClick={onNext} />}
        <PagBtn label="تحديث" onClick={onRetry} />
      </div>
    </div>
  );
}

function PagBtn({ label, onClick }: { label: string; onClick: () => void }) {
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
