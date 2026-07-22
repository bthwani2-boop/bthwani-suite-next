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
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="التراجع عن القرارات القابلة للعكس" />}
      stateView={
        rollbacks.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل طلبات التراجع…" />
          : rollbacks.state.kind === "error" ? <CpStatePanel role="alert" title={rollbacks.state.message} />
          : undefined
      }
    >
      <section style={styles.content}>
        <CpStatePanel
          role="status"
          title="التراجع قرار جديد وليس حذفًا للسجل"
          description="ينشئ النظام الإجراء العكسي داخل معاملة مستقلة، ويمنع المنشئ والمستفيد والمعتمد السابق من اعتماد التراجع."
        />
        <article style={styles.card}>
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
            disabled={submitting || sourceApprovalId.trim().length < 2 || reason.trim().length < 5}
            onClick={() => void requestRollback()}
          >
            إرسال طلب التراجع
          </CpButton>
        </article>

        {approvals.state.kind === "success" && approvals.state.data.length > 0 ? (
          <article style={styles.card}>
            <strong>قرارات معتمدة قابلة لطلب التراجع</strong>
            {approvals.state.data.map((approval) => (
              <CpButton key={approval.id} onClick={() => setSourceApprovalId(approval.id)}>
                {approval.targetActorId} — {approval.roleName} — {approval.actionType}
              </CpButton>
            ))}
          </article>
        ) : null}

        {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}
        {rollbacks.state.kind === "success" && rollbacks.state.data.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد طلبات تراجع معلقة." />
        ) : null}
        {rollbacks.state.kind === "success" ? rollbacks.state.data.map((request) => (
          <article key={request.id} style={styles.card}>
            <strong>{request.targetActorId} ← {request.roleName}</strong>
            <span>الإجراء الأصلي: {request.sourceActionType}</span>
            <span>الإجراء العكسي: {request.inverseActionType}</span>
            <span>المنشئ: {request.requestedBy}</span>
            <span>السبب: {request.reason}</span>
            <CpTextInput
              value={reviewNotes[request.id] ?? ""}
              onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
              placeholder="ملاحظة المراجع — إلزامية عند الرفض"
              aria-label={`ملاحظة مراجعة التراجع ${request.id}`}
            />
            <div style={styles.actions}>
              <CpButton disabled={submitting} onClick={() => void review(request.id, request.version, "approved")}>
                اعتماد التراجع
              </CpButton>
              <CpButton
                disabled={submitting || (reviewNotes[request.id] ?? "").trim().length < 5}
                onClick={() => void review(request.id, request.version, "rejected")}
              >
                رفض التراجع
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
  actions: { display: "flex", flexWrap: "wrap", gap: "0.75rem" },
});
