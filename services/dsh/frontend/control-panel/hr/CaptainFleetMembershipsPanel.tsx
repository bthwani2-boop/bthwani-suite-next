"use client";

import React, { useEffect, useState } from "react";
import { CpStatePanel, CpStateView, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";
import { fetchOperatorCaptainFleetMemberships, type DshCaptainFleetMembership } from "../../shared/partner/partner-fleet.api";

type State =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly memberships: readonly DshCaptainFleetMembership[] };

export function CaptainFleetMembershipsPanel({ actorId }: { readonly actorId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    fetchOperatorCaptainFleetMemberships(actorId)
      .then((res) => {
        if (active) setState({ kind: "ready", memberships: res.memberships });
      })
      .catch((err) => {
        if (active) setState({ kind: "error", message: err instanceof Error ? err.message : "فشل تحميل العضويات" });
      });
    return () => {
      active = false;
    };
  }, [actorId]);

  if (state.kind === "loading") {
    return <CpStateView kind="loading" title="جارٍ تحميل عضويات أسطول الشريك…" />;
  }

  if (state.kind === "error") {
    return <CpStatePanel role="alert" title="خطأ في تحميل العضويات" code={state.message} />;
  }

  if (state.memberships.length === 0) {
    return <CpStatePanel role="status" title="لا توجد عضويات أسطول شريك نشطة أو معلقة لهذا الكابتن." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CpTable aria-label="عضويات أسطول الشريك">
        <thead>
          <tr>
            <CpTableHeaderCell>المتجر</CpTableHeaderCell>
            <CpTableHeaderCell>الموصل</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            <CpTableHeaderCell>الفرع</CpTableHeaderCell>
            <CpTableHeaderCell>نطاق التكليف</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {state.memberships.map((m) => (
            <tr key={m.teamMemberId}>
              <CpTableCell>{m.storeName || m.storeId}</CpTableCell>
              <CpTableCell>{m.courierName}</CpTableCell>
              <CpTableCell>{m.status}</CpTableCell>
              <CpTableCell>{m.branchAssignment || "—"}</CpTableCell>
              <CpTableCell>{m.deliveryAssignment || "—"}</CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </div>
  );
}
