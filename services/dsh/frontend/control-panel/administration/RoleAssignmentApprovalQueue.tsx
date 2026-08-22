"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import {
  useRoleAssignmentApprovalController,
  useStaffController,
} from "../../shared/administration";
import { useIdentitySession } from "@bthwani/core-identity";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

function actionLabel(actionType: "staff_role_assignment" | "staff_role_revocation"): string {
  return actionType === "staff_role_revocation" ? "سحب الدور" : "إسناد الدور";
}

export function RoleAssignmentApprovalQueue() {
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRequest = hasServiceControlPanelPermission(identity, "dsh", "administration.staff.request");
  const canReview = hasServiceControlPanelPermission(identity, "dsh", "administration.staff.approve");
  const approvals = useRoleAssignmentApprovalController("authenticated", "pending", canReview);
  const staff = useStaffController("authenticated", canRequest);
  const [targetActorId, setTargetActorId] = useState("");
  const [roleName, setRoleName] = useState("");
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
        await staff.requestRoleRevocation(targetActorId.trim(), roleName.trim(), reason.trim());
      } else {
        await staff.requestRoleAssignment(targetActorId.trim(), roleName.trim(), reason.trim());
      }
      setTargetActorId("");
      setRoleName("");
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
    || roleName.trim().length < 2
    || reason.trim().length < 5;

  return (
    <QueuePageFrame
      dir="rtl"
      header={<CpPageHeader title="تغييرات أدوار الموظفين — Maker / Checker" />}
      stateView={
        approvals.state.kind === "loading" ? <CpStateView kind="loading" title="جارٍ تحميل طلبات الاعتماد…" />
          : approvals.state.kind === "error" ? <CpStateView kind="error" title={approvals.state.message} />
          : undefined
      }
    >
      {!canRequest && !canReview ? (
        <CpStatePanel role="alert" title="صلاحية إسناد أدوار الموظفين مطلوبة" description="لا يتم تحميل طوابير أو إرسال طلبات دون الصلاحية الدقيقة." />
      ) : null}
      {canRequest ? <section aria-label="إنشاء طلب تغيير دور">
        <strong>إنشاء طلب تغيير دور</strong>
        <CpTextInput
          value={targetActorId}
          onChange={setTargetActorId}
          placeholder="معرّف الموظف المستفيد"
          aria-label="معرّف الموظف المستفيد"
        />
        <CpTextInput
          value={roleName}
          onChange={setRoleName}
          placeholder="اسم الدور المعياري"
          aria-label="اسم الدور"
        />
        <CpTextInput
          value={reason}
          onChange={setReason}
          placeholder="سبب التغيير — خمسة أحرف على الأقل"
          aria-label="سبب طلب تغيير الدور"
        />
        <CpButton variant="primary" disabled={formInvalid} onClick={() => void requestChange("staff_role_assignment")}>
          إرسال طلب إسناد
        </CpButton>{" "}
        <CpButton variant="secondary" disabled={formInvalid} onClick={() => void requestChange("staff_role_revocation")}>
          إرسال طلب سحب
        </CpButton>
      </section> : null}

      {actionError ? <CpStateView kind="error" title={actionError} /> : null}

      {canReview && approvals.state.kind === "success" && approvals.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تغيير أدوار معلقة." />
      ) : null}

      {canReview && approvals.state.kind === "success" && approvals.state.data.length > 0 ? (
        <CpTable aria-label="طلبات تغيير الأدوار المعلقة">
          <thead>
            <tr>
              <CpTableHeaderCell>الطلب</CpTableHeaderCell>
              <CpTableHeaderCell>المنشئ</CpTableHeaderCell>
              <CpTableHeaderCell>السبب</CpTableHeaderCell>
              <CpTableHeaderCell>النسخة</CpTableHeaderCell>
              <CpTableHeaderCell>ملاحظة المراجع</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {approvals.state.data.map((approval) => (
              <tr key={approval.id}>
                <CpTableCell>{actionLabel(approval.actionType)}: {approval.targetActorId} ← {approval.roleName}</CpTableCell>
                <CpTableCell>{approval.requestedBy}</CpTableCell>
                <CpTableCell>{approval.reason}</CpTableCell>
                <CpTableCell>{approval.version}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={reviewNotes[approval.id] ?? ""}
                    onChange={(value) => setReviewNotes((current) => ({ ...current, [approval.id]: value }))}
                    placeholder="ملاحظة المراجع — إلزامية عند الرفض"
                    aria-label={`ملاحظة مراجعة ${approval.targetActorId}`}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton variant="brand" disabled={submitting} onClick={() => void review(approval.id, approval.version, "approved")}>
                    اعتماد من مراجع مستقل
                  </CpButton>{" "}
                  <CpButton
                    variant="danger"
                    disabled={submitting || (reviewNotes[approval.id] ?? "").trim().length < 5}
                    onClick={() => void review(approval.id, approval.version, "rejected")}
                  >
                    رفض
                  </CpButton>
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </QueuePageFrame>
  );
}
