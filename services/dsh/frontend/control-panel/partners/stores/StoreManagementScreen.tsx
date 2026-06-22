"use client";

import { useState } from "react";
import {
  CpButton,
  CpPageHeader,
  CpTextInput,
  DataTablePageFrame,
  PaginationToolbar,
  useIdentitySession,
} from "@bthwani/app-shell";
import { useStoreAdminController } from "../../../shared/store";
import { StoreAdminKpiStrip } from "./StoreAdminKpiStrip";
import { StoreAdminFilters } from "./StoreAdminFilters";
import { StoreAdminTable } from "./StoreAdminTable";
import { StoreDetailAdminPanel } from "./StoreDetailAdminPanel";
import { StoreAdminStateView } from "./StoreAdminStateView";
import { StoreGovernanceActions } from "./StoreGovernanceActions";

export function StoreManagementScreen() {
  const identity = useIdentitySession();
  const c = useStoreAdminController(identity.state.kind);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>دخول مشغل شبكة المتاجر</h1>
          <p style={{ opacity: 0.7 }}>الحوكمة متاحة فقط لحساب operator مصرح.</p>
        </div>
        <CpTextInput
          value={username}
          onChange={setUsername}
          placeholder="اسم المستخدم"
          aria-label="اسم المستخدم"
        />
        <CpTextInput
          value={password}
          onChange={setPassword}
          placeholder="كلمة المرور"
          type="password"
          aria-label="كلمة المرور"
        />
        <CpButton
          disabled={username.trim().length === 0 || password.length < 12 || identity.state.kind === "authenticating"}
          onClick={() => void identity.login(username.trim(), password)}
        >
          {identity.state.kind === "authenticating" ? "جاري التحقق…" : "تسجيل الدخول"}
        </CpButton>
        {identity.state.kind === "error" && <p role="alert">{identity.state.message}</p>}
      </section>
    );
  }
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
