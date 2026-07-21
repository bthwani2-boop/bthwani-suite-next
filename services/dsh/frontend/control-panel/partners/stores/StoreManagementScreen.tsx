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
  const controller = useStoreAdminController("authenticated");
  const selectedDetail =
    controller.detailState?.kind === "success" ? controller.detailState.detail : null;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="إدارة المتاجر">
          {controller.kpi !== null && <StoreAdminKpiStrip kpi={controller.kpi} />}
        </CpPageHeader>
      }
      filters={<StoreAdminFilters filters={controller.filters} onChange={controller.setFilters} />}
      toolbar={
        <PaginationToolbar
          label={controller.paginationLabel}
          hasPrev={controller.hasPrevPage}
          hasNext={controller.hasNextPage}
          onPrev={controller.prevPage}
          onNext={controller.nextPage}
          onRetry={controller.retry}
        />
      }
      stateView={
        controller.isNonSuccess
          ? <StoreAdminStateView state={controller.listState} onRetry={controller.retry} />
          : undefined
      }
      sidePanel={
        controller.selectedStoreId !== null && controller.detailState !== null
          ? (
              <StoreDetailAdminPanel
                state={controller.detailState}
                diagnosticsState={controller.diagnosticsState}
                auditState={controller.auditState}
                onClose={() => controller.selectStore(null)}
              />
            )
          : undefined
      }
    >
      <>
        {selectedDetail !== null && (
          <StoreGovernanceActions
            store={selectedDetail}
            actionState={controller.actionState}
            onSubmit={(input) => controller.govern(selectedDetail.id, input)}
          />
        )}
        <StoreAdminTable
          rows={controller.visibleRows}
          selectedStoreId={controller.selectedStoreId}
          onSelectStore={controller.selectStore}
        />
      </>
    </DataTablePageFrame>
  );
}
