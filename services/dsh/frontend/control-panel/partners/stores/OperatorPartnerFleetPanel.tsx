"use client";

import React from "react";
import {
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import {
  fetchOperatorPartnerFleetSnapshot,
  type DshOperatorPartnerFleetSnapshot,
} from "../../../shared/partner";

export type OperatorPartnerFleetPanelProps = {
  readonly storeId: string;
};

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly snapshot: DshOperatorPartnerFleetSnapshot };

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "تعذر تحميل ربط أسطول المتجر.";
}

export function OperatorPartnerFleetPanel({ storeId }: OperatorPartnerFleetPanelProps) {
  const [state, setState] = React.useState<PanelState>({ kind: "loading" });

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const snapshot = await fetchOperatorPartnerFleetSnapshot(storeId);
      setState({ kind: "ready", snapshot });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, [storeId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return <CpStatePanel role="status" title="جاري تحميل أسطول المتجر وربط الكباتن…" />;
  }

  if (state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل أسطول المتجر" code={state.message}>
        <CpRetryButton onClick={() => void load()}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    );
  }

  const activeMembers = state.snapshot.members.filter((member) => member.status === "active");
  const pendingCodes = state.snapshot.connections.filter((connection) => connection.status === "pending");

  return (
    <section dir="rtl" style={{ display: "grid", gap: 16 }} aria-label="ربط أسطول الشريك والكباتن">
      <div>
        <h2 style={{ margin: 0 }}>ربط أسطول الشريك والكباتن</h2>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.68 }}>
          قراءة تشغيلية محكومة من DSH. لا تظهر الرموز الكاملة أو بصماتها، وتبقى إجراءات الإصدار والسحب بيد الشريك أو صاحب العضوية.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <strong>أعضاء الأسطول: {state.snapshot.members.length}</strong>
        <strong>العضويات النشطة: {activeMembers.length}</strong>
        <strong>الرموز المعلقة: {pendingCodes.length}</strong>
      </div>

      {state.snapshot.members.length === 0 ? (
        <CpStatePanel role="status" title="لا يوجد موصلون مسجلون لهذا المتجر." />
      ) : (
        <CpTable aria-label="أعضاء أسطول المتجر">
          <thead>
            <tr>
              <CpTableHeaderCell>الموصل</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>هوية الكابتن</CpTableHeaderCell>
              <CpTableHeaderCell>الفرع</CpTableHeaderCell>
              <CpTableHeaderCell>نطاق التكليف</CpTableHeaderCell>
              <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {state.snapshot.members.map((member) => (
              <tr key={member.teamMemberId}>
                <CpTableCell>{member.courierName}</CpTableCell>
                <CpTableCell>{member.status}</CpTableCell>
                <CpTableCell>{member.captainActorId || "غير مربوط"}</CpTableCell>
                <CpTableCell>{member.branchAssignment || "—"}</CpTableCell>
                <CpTableCell>{member.deliveryAssignment || "—"}</CpTableCell>
                <CpTableCell>{member.version}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      {state.snapshot.connections.length === 0 ? (
        <CpStatePanel role="status" title="لا يوجد سجل رموز ربط لهذا المتجر." />
      ) : (
        <CpTable aria-label="سجل رموز ربط الأسطول">
          <thead>
            <tr>
              <CpTableHeaderCell>عضو الفريق</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>آخر أربعة</CpTableHeaderCell>
              <CpTableHeaderCell>الانتهاء</CpTableHeaderCell>
              <CpTableHeaderCell>الكابتن المستهلك</CpTableHeaderCell>
              <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {state.snapshot.connections.map((connection) => (
              <tr key={connection.id}>
                <CpTableCell>{connection.teamMemberId}</CpTableCell>
                <CpTableCell>{connection.status}</CpTableCell>
                <CpTableCell>••••{connection.codeLast4}</CpTableCell>
                <CpTableCell>{new Date(connection.expiresAt).toLocaleString("ar-SA")}</CpTableCell>
                <CpTableCell>{connection.redeemedByCaptainActorId || "—"}</CpTableCell>
                <CpTableCell>{connection.version}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}
    </section>
  );
}

export default OperatorPartnerFleetPanel;
