"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import {
  useRoleAssignmentApprovalController,
  useStaffController,
} from "../../shared/administration";

function actionLabel(actionType: "staff_role_assignment" | "staff_role_revocation"): string {
  return actionType === "staff_role_revocation" ? "سحب الدور" : "إسناد الدور";
}

export function RoleAssignmentApprovalQueue() {
  const approvals = useRoleAssignmentApprovalController("authenticated", "pending");
  const staff = useStaffController("authenticated");
  const [targetActorId, setTargetActorId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestChange = async (actionType: "staff_role_assignment" | "staff_role_revocation") => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      if (actionType === "staff_role_revocation") {
        await staff.requestRoleRevocation(targetActorId.trim(), roleId.trim(), reason.trim());
      } else {
        await staff.requestRoleAssignment(targetActorId.trim(), roleId.trim(), reason.trim());
      }
      setTargetActorId("");
      setRoleId("");
      setReason("");
      await approvals.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر إنشاء طلب تغيير الدور.");
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

  const formInvalid = submitting
    || targetActorId.trim().length < 2
    || roleId.trim().length < 2
    || reason.trim().length < 5;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="تغييرات أدوار الموظفين — Maker / Checker" />}
      stateView={
        approvals.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل طلبات الاعتماد…" />
          : approvals.state.kind === "error" ? <CpStatePanel role="alert" title={approvals.state.message} />
          : undefined
      }
    >
      <section style={styles.content}>
        <article style={styles.card}>
          <strong>إنشاء طلب تغيير دور</strong>
          <div style={styles.formGrid}>
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
              placeholder="سبب التغيير — خمسة أحرف على الأقل"
              aria-label="سبب طلب تغيير الدور"
            />
          </div>
          <div style={styles.actions}>
            <CpButton disabled={formInvalid} onClick={() => void requestChange("staff_role_assignment")}>
              إرسال طلب إسناد
            </CpButton>
            <CpButton disabled={formInvalid} onClick={() => void requestChange("staff_role_revocation")}>
              إرسال طلب سحب
            </CpButton>
          </div>
        </article>

        {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}

        {approvals.state.kind === "success" && approvals.state.data.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد طلبات تغيير أدوار معلقة." />
        ) : null}

        {approvals.state.kind === "success" ? approvals.state.data.map((approval) => (
          <article key={approval.id} style={styles.card}>
            <strong>{actionLabel(approval.actionType)}: {approval.targetActorId} ← {approval.roleName}</strong>
            <div style={styles.metadata}>
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
            <div style={styles.actions}>
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

const styles = WebStyleSheet.create({
  content: { display: "grid", gap: "1rem" },
  card: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
    border: "1px solid var(--card-border, currentColor)",
    borderRadius: "1rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.75rem",
  },
  actions: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  metadata: { display: "grid", gap: "0.25rem", fontSize: "0.875rem" },
});
