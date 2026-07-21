"use client";

import React, { useState, type CSSProperties } from "react";
import {
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  useRoleAssignmentApprovalController,
  useStaffController,
} from "../../shared/administration";

const contentStyle: CSSProperties = { display: "grid", gap: "1rem" };
const cardStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "1rem",
};
const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
  gap: "0.75rem",
};
const actionRowStyle: CSSProperties = { display: "flex", gap: "0.75rem", flexWrap: "wrap" };
const metadataStyle: CSSProperties = { display: "grid", gap: "0.25rem", fontSize: "0.875rem" };

export function RoleAssignmentApprovalQueue() {
  const approvals = useRoleAssignmentApprovalController("authenticated", "pending");
  const staff = useStaffController("authenticated");
  const [targetActorId, setTargetActorId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestAssignment = async () => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await staff.requestRoleAssignment(targetActorId.trim(), roleId.trim(), reason.trim());
      setTargetActorId("");
      setRoleId("");
      setReason("");
      await approvals.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر إنشاء طلب إسناد الدور.");
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (approvalId: string, version: number, decision: "approved" | "rejected") => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await approvals.review(approvalId, decision, version, (reviewNotes[approvalId] ?? "").trim());
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر اعتماد الطلب.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="طلبات إسناد الأدوار — Maker / Checker" />}
      stateView={
        approvals.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل طلبات الاعتماد…" />
          : approvals.state.kind === "error" ? <CpStatePanel role="alert" title={approvals.state.message} />
          : undefined
      }
    >
      <section style={contentStyle}>
        <article style={cardStyle}>
          <strong>إنشاء طلب إسناد دور</strong>
          <div style={formGridStyle}>
            <CpTextInput
              value={targetActorId}
              onChange={setTargetActorId}
              placeholder="معرّف الموظف المستفيد"
              aria-label="معرّف الموظف المستفيد"
            />
            <CpTextInput
              value={roleId}
              onChange={setRoleId}
              placeholder="معرّف الدور"
              aria-label="معرّف الدور"
            />
            <CpTextInput
              value={reason}
              onChange={setReason}
              placeholder="سبب الإسناد — خمسة أحرف على الأقل"
              aria-label="سبب طلب إسناد الدور"
            />
          </div>
          <CpButton
            disabled={submitting || targetActorId.trim().length < 2 || roleId.trim().length < 2 || reason.trim().length < 5}
            onClick={() => void requestAssignment()}
          >
            إرسال للمراجعة
          </CpButton>
        </article>

        {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}

        {approvals.state.kind === "success" && approvals.state.data.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد طلبات إسناد أدوار معلقة." />
        ) : null}

        {approvals.state.kind === "success" ? approvals.state.data.map((approval) => (
          <article key={approval.id} style={cardStyle}>
            <strong>{approval.targetActorId} ← {approval.roleName}</strong>
            <div style={metadataStyle}>
              <span>المنشئ: {approval.requestedBy}</span>
              <span>السبب: {approval.reason}</span>
              <span>النسخة: {approval.version}</span>
            </div>
            <CpTextInput
              value={reviewNotes[approval.id] ?? ""}
              onChange={(value) => setReviewNotes((current) => ({ ...current, [approval.id]: value }))}
              placeholder="ملاحظة المراجع — إلزامية عند الرفض"
              aria-label={`ملاحظة مراجعة ${approval.targetActorId}`}
            />
            <div style={actionRowStyle}>
              <CpButton disabled={submitting} onClick={() => void review(approval.id, approval.version, "approved")}>
                اعتماد من مراجع مستقل
              </CpButton>
              <CpButton
                disabled={submitting || (reviewNotes[approval.id] ?? "").trim().length < 5}
                onClick={() => void review(approval.id, approval.version, "rejected")}
              >
                رفض
              </CpButton>
            </div>
          </article>
        )) : null}
      </section>
    </DataTablePageFrame>
  );
}
