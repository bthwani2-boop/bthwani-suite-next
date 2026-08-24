"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpMutedInline,
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
  useAdministrationRollbackController,
  useRoleAssignmentApprovalController,
} from "../../shared/administration";
import { administrationExecutionStatusLabel } from "../../shared/administration/administration-registry";
import { useIdentitySession } from "@bthwani/core-identity";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

export function DecisionRollbackQueue() {
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRequest = hasServiceControlPanelPermission(identity, "dsh", "administration.rollback.request");
  const canReadApproved = hasServiceControlPanelPermission(identity, "dsh", "administration.staff.approve");
  const canReview = hasServiceControlPanelPermission(identity, "dsh", "administration.rollback.approve");
  const approvals = useRoleAssignmentApprovalController("authenticated", "approved", canReadApproved);
  const rollbacks = useAdministrationRollbackController("authenticated", "pending", canReview);
  const [sourceApprovalId, setSourceApprovalId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [replacementReasonCodes, setReplacementReasonCodes] = useState<Record<string, string>>({});
  const [replacementReasons, setReplacementReasons] = useState<Record<string, string>>({});
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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر مراجعة طلب التراجع.");
    } finally {
      setSubmitting(false);
    }
  };

  const replaceTerminalFailure = async (requestId: string, version: number) => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await rollbacks.replaceTerminalFailure(
        requestId,
        version,
        (replacementReasonCodes[requestId] ?? "").trim(),
        (replacementReasons[requestId] ?? "").trim(),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر استبدال طلب التراجع ذي الفشل النهائي.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QueuePageFrame
      dir="rtl"
      header={<CpPageHeader title="التراجع عن القرارات القابلة للعكس" />}
      stateView={
        rollbacks.state.kind === "loading" ? <CpStateView kind="loading" title="جارٍ تحميل طلبات التراجع…" />
          : rollbacks.state.kind === "error" ? <CpStateView kind="error" title={rollbacks.state.message} />
          : undefined
      }
    >
      {!canRequest && !canReview ? (
        <CpStatePanel role="alert" title="صلاحية التراجع الإداري مطلوبة" description="لا يتم تحميل أو إرسال أي طلب قبل تحقق الصلاحية الدقيقة." />
      ) : null}
      <CpStatePanel
        role="status"
        title="التراجع قرار جديد وليس حذفًا للسجل"
        description="ينشئ النظام الإجراء العكسي داخل معاملة مستقلة، ويمنع المنشئ والمستفيد والمعتمد السابق من اعتماد التراجع."
      />
      {canRequest ? <section aria-label="إنشاء طلب تراجع">
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
      </section> : null}

      {canRequest && canReadApproved && approvals.state.kind === "success" && approvals.state.data.length > 0 ? (
        <section aria-label="قرارات معتمدة قابلة لطلب التراجع">
          <strong>قرارات معتمدة قابلة لطلب التراجع</strong>
          {approvals.state.data.map((approval) => (
            <CpButton key={approval.id} variant="ghost" onClick={() => setSourceApprovalId(approval.id)}>
              {approval.targetActorId} — {approval.roleName} — {approval.actionType}
            </CpButton>
          ))}
        </section>
      ) : null}

      {actionError ? <CpStateView kind="error" title={actionError} /> : null}
      {canReview && rollbacks.state.kind === "success" && rollbacks.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تراجع معلقة." />
      ) : null}
      {canReview && rollbacks.state.kind === "success" && rollbacks.state.data.length > 0 ? (
        <CpTable aria-label="طلبات التراجع المعلقة">
          <thead>
            <tr>
              <CpTableHeaderCell>الهدف</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراء الأصلي/العكسي</CpTableHeaderCell>
              <CpTableHeaderCell>المنشئ / المعتمد الأصلي</CpTableHeaderCell>
              <CpTableHeaderCell>السبب</CpTableHeaderCell>
              <CpTableHeaderCell>حالة التنفيذ المعياري</CpTableHeaderCell>
              <CpTableHeaderCell>ملاحظة المراجع</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rollbacks.state.data.map((request) => {
              const reviewable = request.status === "pending" && request.executionStatus !== "failed_terminal";
              const replacementCode = replacementReasonCodes[request.id] ?? "";
              const replacementReason = replacementReasons[request.id] ?? "";
              return <tr key={request.id}>
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
                <CpTableCell>{administrationExecutionStatusLabel(request.executionStatus)}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
                    placeholder="ملاحظة المراجع — إلزامية عند الرفض"
                    aria-label={`ملاحظة مراجعة التراجع ${request.id}`}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton variant="brand" disabled={submitting || !reviewable} onClick={() => void review(request.id, request.version, "approved")}>
                    اعتماد التراجع
                  </CpButton>{" "}
                  <CpButton
                    variant="danger"
                    disabled={submitting || !reviewable || (reviewNotes[request.id] ?? "").trim().length < 5}
                    onClick={() => void review(request.id, request.version, "rejected")}
                  >
                    رفض التراجع
                  </CpButton>
                  {request.executionStatus === "failed_terminal" && canRequest ? <>
                    <CpTextInput
                      value={replacementCode}
                      onChange={(value) => setReplacementReasonCodes((current) => ({ ...current, [request.id]: value }))}
                      placeholder="رمز السبب مثل canonical_state_changed"
                      aria-label={`رمز سبب استبدال التراجع ${request.id}`}
                    />
                    <CpTextInput
                      value={replacementReason}
                      onChange={(value) => setReplacementReasons((current) => ({ ...current, [request.id]: value }))}
                      placeholder="سبب الطلب البديل — خمسة أحرف على الأقل"
                      aria-label={`سبب طلب التراجع البديل ${request.id}`}
                    />
                    <CpButton
                      variant="primary"
                      disabled={submitting || !/^[a-z][a-z0-9_]{2,63}$/.test(replacementCode.trim()) || replacementReason.trim().length < 5}
                      onClick={() => void replaceTerminalFailure(request.id, request.version)}
                    >
                      تثبيت الفشل وإنشاء طلب بديل
                    </CpButton>
                  </> : null}
                </CpTableCell>
              </tr>
            })}
          </tbody>
        </CpTable>
      ) : null}
    </QueuePageFrame>
  );
}
