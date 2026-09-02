"use client";

import { useState } from "react";
import { Card, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import { CpBadge, CpButton, CpTextInput } from "@bthwani/control-panel/components";
import {
  useRefundsByOrderQuery,
  useRefundAuditQuery,
  useCreateRefundMutation,
  useApproveRefundMutation,
  useRejectRefundMutation,
  useCompleteRefundMutation,
  useReconcileRefundMutation,
  WltRefundResponse,
  WltRefundAuditResponse,
} from '@bthwani/dsh/wlt-boundary';

function refundTone(refund: WltRefundResponse): CpBadgeTone {
  switch (refund.status) {
    case "completed": return "success";
    case "approved":
    case "processing":
    case "provider_unknown": return "warning";
    case "rejected":
    case "reversed": return "danger"; // danger maps to error tone
    default: return "neutral";
  }
}

function refundLabel(status: string): string {
  switch (status) {
    case "requested": return "بانتظار المراجعة";
    case "approved": return "معتمد";
    case "processing": return "قيد التنفيذ لدى المزود";
    case "provider_unknown": return "نتيجة المزود غير محسومة";
    case "completed": return "مسترد";
    case "rejected": return "مرفوض";
    case "reversed": return "معكوس";
    default: return status;
  }
}

export function RefundsCommandPanel({ canManage }: { readonly canManage: boolean }) {
  const [orderId, setOrderId] = useState("");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [amountMinorUnits, setAmountMinorUnits] = useState("0");
  const [reason, setReason] = useState("");
  const [eligibilityReference, setEligibilityReference] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [providerReference, setProviderReference] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  const refundsQuery = useRefundsByOrderQuery(orderId.trim(), false);
  const auditQuery = useRefundAuditQuery(selectedRefundId || "", !!selectedRefundId);

  const createMutation = useCreateRefundMutation();
  const approveMutation = useApproveRefundMutation();
  const rejectMutation = useRejectRefundMutation();
  const completeMutation = useCompleteRefundMutation();
  const reconcileMutation = useReconcileRefundMutation();

  const refunds = refundsQuery.data ?? [];
  const selected = refunds.find((r: WltRefundResponse) => r.id === selectedRefundId)
    ?? createMutation.data
    ?? approveMutation.data
    ?? rejectMutation.data
    ?? completeMutation.data
    ?? reconcileMutation.data
    ?? null;

  async function search() {
    if (orderId.trim()) {
      await refundsQuery.refetch();
    }
  }

  async function createRefund() {
    if (!canManage) return;
    await createMutation.mutateAsync({
      paymentSessionId: paymentSessionId.trim(),
      orderId: orderId.trim(),
      clientId: clientId.trim(),
      amountMinorUnits: Number(amountMinorUnits),
      reason: reason.trim(),
      eligibilityReference: eligibilityReference.trim(),
    });
    await search();
  }

  async function decide(action: "approve" | "reject") {
    if (!canManage || !selected || !decisionReason.trim()) return;
    if (action === "approve") {
      await approveMutation.mutateAsync({ refundId: selected.id, reason: decisionReason.trim() });
    } else {
      await rejectMutation.mutateAsync({ refundId: selected.id, reason: decisionReason.trim() });
    }
    setDecisionReason("");
    await search();
  }

  async function execute() {
    if (!canManage || !selected) return;
    await completeMutation.mutateAsync(selected.id);
    await search();
  }

  async function reconcile(resolutionAction: string) {
    if (!canManage || !selected || !evidenceNote.trim()) return;
    await reconcileMutation.mutateAsync({
      refundId: selected.id,
      resolutionAction,
      evidenceNote: evidenceNote.trim(),
      ...(providerReference.trim() ? { providerReference: providerReference.trim() } : {}),
    });
    setEvidenceNote("");
    setProviderReference("");
    await search();
  }

  const isMutating = createMutation.isPending || approveMutation.isPending || rejectMutation.isPending || completeMutation.isPending || reconcileMutation.isPending;
  const busy = isMutating || refundsQuery.isFetching;

  return (
    <div dir="rtl" aria-busy={busy} style={{ display: "grid", gap: "1rem" }}>
      <Card style={{ padding: "1.25rem", display: "grid", gap: "0.8rem" }}>
        <Text role="titleMd">بحث طلب وإنشاء استرداد</Text>
        <Text role="body" tone="muted">
          المبلغ صفر يعني استرداد كامل المبلغ المتبقي. لا يعتمد النجاح إلا بعد تأكيد WLT والمزود ودفتر الأستاذ.
        </Text>
        {!canManage ? <Text role="body" tone="warning">قراءة فقط — تنفيذ الاسترداد يتطلب finance.manage.</Text> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.7rem" }}>
          <CpTextInput aria-label="رقم الطلب" placeholder="رقم الطلب" value={orderId} onChange={setOrderId} />
          {canManage ? <>
            <CpTextInput aria-label="جلسة الدفع" placeholder="معرّف جلسة الدفع" value={paymentSessionId} onChange={setPaymentSessionId} />
            <CpTextInput aria-label="العميل" placeholder="معرّف العميل" value={clientId} onChange={setClientId} />
            <CpTextInput aria-label="المبلغ" placeholder="المبلغ بالوحدة الصغرى" value={amountMinorUnits} onChange={setAmountMinorUnits} />
            <CpTextInput aria-label="سبب الاسترداد" placeholder="سبب الاسترداد" value={reason} onChange={setReason} />
            <CpTextInput aria-label="مرجع أهلية DSH" placeholder="مرجع أهلية DSH" value={eligibilityReference} onChange={setEligibilityReference} />
          </> : null}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <CpButton variant="secondary" disabled={busy || !orderId.trim()} onClick={() => void search()}>تحميل الاستردادات</CpButton>
          {canManage ? <CpButton
            variant="primary"
            disabled={busy || !paymentSessionId.trim() || !clientId.trim() || !reason.trim() || !eligibilityReference.trim()}
            onClick={() => void createRefund()}
          >
            إنشاء طلب استرداد
          </CpButton> : null}
        </div>
        {busy ? (
          <div role="status" aria-live="polite">
            <Text role="body" tone="muted">جارٍ تنفيذ العملية المالية والتحقق من أحدث حالة…</Text>
          </div>
        ) : null}
      </Card>

      {createMutation.isError || approveMutation.isError || rejectMutation.isError || completeMutation.isError || reconcileMutation.isError ? (
        <div role="alert" aria-live="assertive">
          <Card style={{ padding: "1rem" }}>
            <Text role="body">حدث خطأ أثناء تنفيذ العملية المالية.</Text>
          </Card>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "1rem" }}>
        <Card style={{ padding: "1rem", display: "grid", gap: "0.7rem", alignContent: "start" }}>
          <Text role="titleMd">الاستردادات المرتبطة بالطلب</Text>
          {refundsQuery.isError ? (
            <div role="alert" aria-live="assertive">
              <Text role="body">حدث خطأ أثناء تحميل الاستردادات.</Text>
            </div>
          ) : null}
          {refundsQuery.isSuccess && refunds.length === 0 ? <Text role="body" tone="muted">لا توجد استردادات محمّلة.</Text> : refunds.map((refund: WltRefundResponse) => (
            <button
              key={refund.id}
              type="button"
              aria-pressed={selected?.id === refund.id}
              aria-label={`اختيار الاسترداد ${refund.id}، ${refund.amountMinorUnits} ${refund.currency}، ${refundLabel(refund.status)}`}
              onClick={() => setSelectedRefundId(refund.id)}
              style={{ textAlign: "start", borderRadius: "0.6rem", padding: "0.8rem", background: "transparent", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <strong>{refund.amountMinorUnits} {refund.currency}</strong>
                <CpBadge tone={refundTone(refund)}>{refundLabel(refund.status)}</CpBadge>
              </div>
              <small>{refund.id}</small>
            </button>
          ))}
        </Card>

        <Card style={{ padding: "1rem", display: "grid", gap: "0.8rem", alignContent: "start" }}>
          <Text role="titleMd">المراجعة والتنفيذ والمصالحة</Text>
          {!selected ? <Text role="body" tone="muted">اختر استردادًا لعرض الإجراءات.</Text> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <Text role="body">{selected.id}</Text>
                <CpBadge tone={refundTone(selected)}>{refundLabel(selected.status)}</CpBadge>
              </div>
              <Text role="body" tone="muted">{selected.amountMinorUnits} {selected.currency} · {selected.reason ?? "بدون سبب ظاهر"}</Text>
              {canManage ? <CpTextInput aria-label="سبب القرار" placeholder="سبب الاعتماد أو الرفض" value={decisionReason} onChange={setDecisionReason} /> : null}
              {canManage ? <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <CpButton variant="primary" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("approve")}>اعتماد مستقل</CpButton>
                <CpButton variant="danger" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("reject")}>رفض</CpButton>
                <CpButton variant="secondary" disabled={busy || selected.status !== "approved"} onClick={() => void execute()}>تنفيذ لدى المزود</CpButton>
              </div> : <Text role="body" tone="muted">قراءة فقط — لا تملك هذه الجلسة finance.manage لتنفيذ قرار الاسترداد.</Text>}
              {selected.status === "provider_unknown" ? (
                <div role="region" aria-label="مصالحة النتيجة غير المحسومة" style={{ display: "grid", gap: "0.6rem", paddingTop: "0.5rem" }}>
                  <Text role="titleSm">مصالحة النتيجة غير المحسومة</Text>
                  {canManage ? <CpTextInput aria-label="مرجع المزود" placeholder="مرجع المزود عند تأكيد النجاح" value={providerReference} onChange={setProviderReference} /> : null}
                  <textarea
                    aria-label="دليل المصالحة"
                    placeholder="ملخص الدليل الخارجي"
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    disabled={!canManage}
                    className="ui-resize-none"
                    style={{ minHeight: "5rem", borderRadius: "0.5rem", padding: "0.7rem", width: "100%" }}
                  />
                  {canManage ? <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <CpButton variant="primary" disabled={busy || !providerReference.trim() || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_success")}>تأكيد نجاح موثق</CpButton>
                    <CpButton variant="danger" disabled={busy || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_failed")}>تأكيد فشل موثق</CpButton>
                  </div> : null}
                </div>
              ) : null}
              <div role="region" aria-label="سجل تدقيق الاسترداد" style={{ display: "grid", gap: "0.35rem", paddingTop: "0.5rem" }}>
                <Text role="titleSm">سجل التدقيق</Text>
                {auditQuery.isFetching ? (
                  <div role="status" aria-live="polite"><Text role="body">جارٍ تحميل سجل التدقيق...</Text></div>
                ) : null}
                {auditQuery.isError ? (
                  <div role="alert" aria-live="assertive"><Text role="body">حدث خطأ أثناء تحميل سجل التدقيق.</Text></div>
                ) : null}
                {auditQuery.isSuccess && auditQuery.data?.length === 0 ? <Text role="body" tone="muted">لا توجد أحداث.</Text> : null}
                {auditQuery.isSuccess ? auditQuery.data?.map((event: WltRefundAuditResponse) => (
                  <Card key={event.id} style={{ padding: "0.5rem" }}>
                    <Text role="body">{event.eventType}: {event.fromStatus ?? "—"} ← {event.toStatus}</Text>
                    <Text role="caption" tone="muted">{event.actorType} · {event.createdAt} · {event.reason ?? "بدون ملاحظة"}</Text>
                  </Card>
                )) : null}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
