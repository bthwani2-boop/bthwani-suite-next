"use client";

import { CpPageHeader } from "@bthwani/control-panel/components";
import { DataTablePageFrame, PaginationToolbar } from "@bthwani/control-panel/shell";
import { useStoreAdminController } from "../../../shared/store";
import { StoreAdminKpiStrip } from "./StoreAdminKpiStrip";
import { StoreAdminFilters } from "./StoreAdminFilters";
import { StoreAdminTable } from "./StoreAdminTable";
import { StoreDetailAdminPanel } from "./StoreDetailAdminPanel";
import { StoreAdminStateView } from "./StoreAdminStateView";
import { StoreGovernanceActions } from "./StoreGovernanceActions";

export function StoreManagementScreen() {
  const c = useStoreAdminController("authenticated");
  const selectedDetail =
    c.detailState?.kind === "success" ? c.detailState.detail : null;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="إدارة المتاجر">
          {c.kpi !== null && <StoreAdminKpiStrip kpi={c.kpi} />}
        </CpPageHeader>
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
      sidePanel={
        c.selectedStoreId !== null && c.detailState !== null
          ? <StoreDetailAdminPanel state={c.detailState} onClose={() => c.selectStore(null)} />
          : undefined
      }
    >
      <>
        {selectedDetail !== null && (
          <StoreGovernanceActions
            store={selectedDetail}
            actionState={c.actionState}
            onSubmit={(input) => c.govern(selectedDetail.id, input)}
          />
        )}
        <StoreAdminTable
          rows={c.visibleRows}
          selectedStoreId={c.selectedStoreId}
          onSelectStore={c.selectStore}
        />
      </>
    </DataTablePageFrame>
  );
}
