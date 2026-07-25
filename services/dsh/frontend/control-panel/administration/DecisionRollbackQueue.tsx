"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import {
  useAdministrationRollbackController,
  useRoleAssignmentApprovalController,
} from "../../shared/administration";

export function DecisionRollbackQueue() {
  const approvals = useRoleAssignmentApprovalController("authenticated", "approved");
  const rollbacks = useAdministrationRollbackController("authenticated", "pending");
  const [sourceApprovalId, setSourceApprovalId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestRollback = async () => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await approvals.requestRollback(sourceApprovalId.trim(), reason.trim());
      setSourceApprovalId("");
      setReason("");
      await rollbacks.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر إنشاء طلب التراجع.");
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (requestId: string, version: number, decision: "approved" | "rejected") => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await rollbacks.review(requestId, decision, version, (reviewNotes[requestId] ?? "").trim());
      await approvals.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر مراجعة طلب التراجع.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QueuePageFrame
      dir="rtl"
      header={<CpPageHeader title="التراجع عن القرارات القابلة للعكس" />}
      stateView={
        rollbacks.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل طلبات التراجع…" />
          : rollbacks.state.kind === "error" ? <CpStatePanel role="alert" title={rollbacks.state.message} />
          : undefined
      }
    >
      <CpStatePanel
        role="status"
        title="التراجع قرار جديد وليس حذفًا للسجل"
        description="ينشئ النظام الإجراء العكسي داخل معاملة مستقلة، ويمنع المنشئ والمستفيد والمعتمد السابق من اعتماد التراجع."
      />
      <section aria-label="إنشاء طلب تراجع">
        <strong>إنشاء طلب تراجع</strong>
        <CpTextInput
          value={sourceApprovalId}
          onChange={setSourceApprovalId}
          placeholder="معرّف قرار إسناد أو سحب معتمد"
          aria-label="معرّف القرار الأصلي"
        />
        <CpTextInput
          value={reason}
          onChange={setReason}
          placeholder="سبب التراجع — خمسة أحرف على الأقل"
          aria-label="سبب طلب التراجع"
        />
        <CpButton
          variant="primary"
          disabled={submitting || sourceApprovalId.trim().length < 2 || reason.trim().length < 5}
          onClick={() => void requestRollback()}
        >
          إرسال طلب التراجع
        </CpButton>
      </section>

      {approvals.state.kind === "success" && approvals.state.data.length > 0 ? (
        <section aria-label="قرارات معتمدة قابلة لطلب التراجع">
          <strong>قرارات معتمدة قابلة لطلب التراجع</strong>
          {approvals.state.data.map((approval) => (
            <CpButton key={approval.id} variant="ghost" onClick={() => setSourceApprovalId(approval.id)}>
              {approval.targetActorId} — {approval.roleName} — {approval.actionType}
            </CpButton>
          ))}
        </section>
      ) : null}

      {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}
      {rollbacks.state.kind === "success" && rollbacks.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تراجع معلقة." />
      ) : null}
      {rollbacks.state.kind === "success" && rollbacks.state.data.length > 0 ? (
        <CpTable aria-label="طلبات التراجع المعلقة">
          <thead>
            <tr>
              <CpTableHeaderCell>الهدف</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراء الأصلي/العكسي</CpTableHeaderCell>
              <CpTableHeaderCell>المنشئ / المعتمد الأصلي</CpTableHeaderCell>
              <CpTableHeaderCell>السبب</CpTableHeaderCell>
              <CpTableHeaderCell>ملاحظة المراجع</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rollbacks.state.data.map((request) => (
              <tr key={request.id}>
                <CpTableCell>{request.targetActorId} ← {request.roleName}</CpTableCell>
                <CpTableCell>
                  {request.sourceActionType}
                  <br />
                  <CpMutedInline tight>{request.inverseActionType}</CpMutedInline>
                </CpTableCell>
                <CpTableCell>
                  {request.requestedBy}
                  <br />
                  <CpMutedInline tight>{request.sourceApprovedBy}</CpMutedInline>
                </CpTableCell>
                <CpTableCell>{request.reason}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
                    placeholder="ملاحظة المراجع — إلزامية عند الرفض"
                    aria-label={`ملاحظة مراجعة التراجع ${request.id}`}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton variant="brand" disabled={submitting} onClick={() => void review(request.id, request.version, "approved")}>
                    اعتماد التراجع
                  </CpButton>{" "}
                  <CpButton
                    variant="danger"
                    disabled={submitting || (reviewNotes[request.id] ?? "").trim().length < 5}
                    onClick={() => void review(request.id, request.version, "rejected")}
                  >
                    رفض التراجع
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
