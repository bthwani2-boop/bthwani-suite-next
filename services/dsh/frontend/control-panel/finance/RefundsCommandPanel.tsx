"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import { CpBadge, CpButton, CpTextInput } from "@bthwani/control-panel/components";
import {
  useWltRefundAuditController,
  useWltRefundController,
  useWltRefundsByOrderController,
} from "../../shared/finance-wlt-link/wlt-refund/use-wlt-refund-controller";
import type { DshWltRefundView } from "../../shared/finance-wlt-link/wlt-refund/wlt-refund.types";

function refundTone(refund: DshWltRefundView): CpBadgeTone {
  if (refund.statusBadge === "error") return "danger";
  return refund.statusBadge;
}

export function RefundsCommandPanel() {
  const refundsController = useWltRefundsByOrderController("control-panel");
  const command = useWltRefundController();
  const audit = useWltRefundAuditController();
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

  const refunds = refundsController.state.kind === "loaded" ? refundsController.state.refunds : [];
  const selected = useMemo(
    () => refunds.find((refund) => refund.id === selectedRefundId) ?? (command.state.kind === "loaded" ? command.state.refund : null),
    [command.state, refunds, selectedRefundId],
  );

  useEffect(() => {
    if (selected?.id) void audit.load(selected.id);
  }, [audit.load, selected?.id]);

  async function search() {
    const value = orderId.trim();
    if (value) await refundsController.loadByOrder(value);
  }

  async function createRefund() {
    const created = await command.create({
      paymentSessionId: paymentSessionId.trim(),
      orderId: orderId.trim(),
      clientId: clientId.trim(),
      amountMinorUnits: Number(amountMinorUnits),
      reason: reason.trim(),
      eligibilityReference: eligibilityReference.trim(),
    });
    if (created) await search();
  }

  async function decide(action: "approve" | "reject") {
    if (!selected || !decisionReason.trim()) return;
    const ok = action === "approve"
      ? await command.approve(selected.id, { reason: decisionReason.trim() })
      : await command.reject(selected.id, { reason: decisionReason.trim() });
    if (ok) {
      setDecisionReason("");
      await search();
      await audit.load(selected.id);
    }
  }

  async function execute() {
    if (!selected) return;
    await command.complete(selected.id);
    await search();
    await audit.load(selected.id);
  }

  async function reconcile(resolutionAction: "confirmed_success" | "confirmed_failed") {
    if (!selected || !evidenceNote.trim()) return;
    await command.reconcile(selected.id, {
      resolutionAction,
      evidenceNote: evidenceNote.trim(),
      ...(providerReference.trim() ? { providerReference: providerReference.trim() } : {}),
    });
    await search();
    await audit.load(selected.id);
  }

  const busy = command.state.kind === "mutating" || refundsController.state.kind === "loading";

  return (
    <div dir="rtl" aria-busy={busy} style={{ display: "grid", gap: "1rem" }}>
      <Card style={{ padding: "1.25rem", display: "grid", gap: "0.8rem" }}>
        <Text role="titleMd">بحث طلب وإنشاء استرداد</Text>
        <Text role="body" tone="muted">
          المبلغ صفر يعني استرداد كامل المبلغ المتبقي. لا يعتمد النجاح إلا بعد تأكيد WLT والمزود ودفتر الأستاذ.
        </Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.7rem" }}>
          <CpTextInput aria-label="رقم الطلب" placeholder="رقم الطلب" value={orderId} onChange={setOrderId} />
          <CpTextInput aria-label="جلسة الدفع" placeholder="معرّف جلسة الدفع" value={paymentSessionId} onChange={setPaymentSessionId} />
          <CpTextInput aria-label="العميل" placeholder="معرّف العميل" value={clientId} onChange={setClientId} />
          <CpTextInput aria-label="المبلغ" placeholder="المبلغ بالوحدة الصغرى" value={amountMinorUnits} onChange={setAmountMinorUnits} />
          <CpTextInput aria-label="سبب الاسترداد" placeholder="سبب الاسترداد" value={reason} onChange={setReason} />
          <CpTextInput aria-label="مرجع الأهلية" placeholder="مرجع أهلية DSH" value={eligibilityReference} onChange={setEligibilityReference} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <CpButton variant="secondary" disabled={busy || !orderId.trim()} onClick={() => void search()}>تحميل الاستردادات</CpButton>
          <CpButton
            variant="primary"
            disabled={busy || !paymentSessionId.trim() || !clientId.trim() || !reason.trim() || !eligibilityReference.trim()}
            onClick={() => void createRefund()}
          >
            إنشاء طلب استرداد
          </CpButton>
        </div>
        {busy ? (
          <div role="status" aria-live="polite">
            <Text role="body" tone="muted">جارٍ تنفيذ العملية المالية والتحقق من أحدث حالة…</Text>
          </div>
        ) : null}
      </Card>

      {command.state.kind === "error" ? (
        <div role="alert" aria-live="assertive">
          <Card style={{ padding: "1rem" }}>
            <Text role="body">{command.state.message}</Text>
          </Card>
        </div>
      ) : null}
      {command.state.kind === "provider_unknown" ? (
        <div role="alert" aria-live="assertive">
          <Card style={{ padding: "1rem" }}>
            <Text role="titleSm">نتيجة المزود غير محسومة</Text>
            <Text role="body" tone="muted">{command.state.message} لا تعِد التنفيذ؛ استخدم المصالحة أدناه بعد الحصول على دليل المزود.</Text>
          </Card>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "1rem" }}>
        <Card style={{ padding: "1rem", display: "grid", gap: "0.7rem", alignContent: "start" }}>
          <Text role="titleMd">الاستردادات المرتبطة بالطلب</Text>
          {refundsController.state.kind === "error" ? (
            <div role="alert" aria-live="assertive">
              <Text role="body">{refundsController.state.message}</Text>
            </div>
          ) : null}
          {refunds.length === 0 ? <Text role="body" tone="muted">لا توجد استردادات محمّلة.</Text> : refunds.map((refund) => (
            <button
              key={refund.id}
              type="button"
              aria-pressed={selected?.id === refund.id}
              aria-label={`اختيار الاسترداد ${refund.id}، ${refund.amountLabel} ${refund.currency}، ${refund.statusLabel}`}
              onClick={() => setSelectedRefundId(refund.id)}
              style={{ textAlign: "start", borderRadius: "0.6rem", padding: "0.8rem", background: "transparent", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <strong>{refund.amountLabel} {refund.currency}</strong>
                <CpBadge tone={refundTone(refund)}>{refund.statusLabel}</CpBadge>
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
                <CpBadge tone={refundTone(selected)}>{selected.statusLabel}</CpBadge>
              </div>
              <Text role="body" tone="muted">{selected.amountLabel} {selected.currency} · {selected.reason ?? "بدون سبب ظاهر"}</Text>
              <CpTextInput aria-label="سبب القرار" placeholder="سبب الاعتماد أو الرفض" value={decisionReason} onChange={setDecisionReason} />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <CpButton variant="primary" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("approve")}>اعتماد مستقل</CpButton>
                <CpButton variant="danger" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("reject")}>رفض</CpButton>
                <CpButton variant="secondary" disabled={busy || selected.status !== "approved"} onClick={() => void execute()}>تنفيذ لدى المزود</CpButton>
              </div>
              {selected.status === "provider_unknown" ? (
                <div role="region" aria-label="مصالحة النتيجة غير المحسومة" style={{ display: "grid", gap: "0.6rem", paddingTop: "0.5rem" }}>
                  <Text role="titleSm">مصالحة النتيجة غير المحسومة</Text>
                  <CpTextInput aria-label="مرجع المزود" placeholder="مرجع المزود عند تأكيد النجاح" value={providerReference} onChange={setProviderReference} />
                  <textarea
                    aria-label="دليل المصالحة"
                    placeholder="ملخص الدليل الخارجي"
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    style={{ minHeight: "5rem", borderRadius: "0.5rem", padding: "0.7rem", width: "100%" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <CpButton variant="primary" disabled={busy || !providerReference.trim() || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_success")}>تأكيد نجاح موثق</CpButton>
                    <CpButton variant="danger" disabled={busy || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_failed")}>تأكيد فشل موثق</CpButton>
                  </div>
                </div>
              ) : null}
              <div role="region" aria-label="سجل تدقيق الاسترداد" style={{ display: "grid", gap: "0.35rem", paddingTop: "0.5rem" }}>
                <Text role="titleSm">سجل التدقيق</Text>
                {audit.state.kind === "loading" ? (
                  <div role="status" aria-live="polite"><Text role="body">جارٍ تحميل سجل التدقيق...</Text></div>
                ) : null}
                {audit.state.kind === "error" ? (
                  <div role="alert" aria-live="assertive"><Text role="body">{audit.state.message}</Text></div>
                ) : null}
                {audit.state.kind === "loaded" && audit.state.events.length === 0 ? <Text role="body" tone="muted">لا توجد أحداث.</Text> : null}
                {audit.state.kind === "loaded" ? audit.state.events.map((event) => (
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
