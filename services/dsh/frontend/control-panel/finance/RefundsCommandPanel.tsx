"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import {
  useWltRefundAuditController,
  useWltRefundController,
  useWltRefundsByOrderController,
} from "../../shared/finance-wlt-link/wlt-refund/use-wlt-refund-controller";
import type { DshWltRefundView } from "../../shared/finance-wlt-link/wlt-refund/wlt-refund.types";

const inputStyle = {
  width: "100%",
  border: `1px solid ${lightThemeColors.borderColor}`,
  borderRadius: "0.5rem",
  padding: "0.7rem",
  background: lightThemeColors.backgroundAlt,
  color: lightThemeColors.color,
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: "0.5rem",
  padding: "0.65rem 0.9rem",
  cursor: "pointer",
  fontWeight: 700,
} as const;

function refundTone(refund: DshWltRefundView): "success" | "warning" | "danger" | "neutral" {
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
          <input aria-label="رقم الطلب" placeholder="رقم الطلب" value={orderId} onChange={(event) => setOrderId(event.target.value)} style={inputStyle} />
          <input aria-label="جلسة الدفع" placeholder="معرّف جلسة الدفع" value={paymentSessionId} onChange={(event) => setPaymentSessionId(event.target.value)} style={inputStyle} />
          <input aria-label="العميل" placeholder="معرّف العميل" value={clientId} onChange={(event) => setClientId(event.target.value)} style={inputStyle} />
          <input aria-label="المبلغ" type="number" min={0} placeholder="المبلغ بالوحدة الصغرى" value={amountMinorUnits} onChange={(event) => setAmountMinorUnits(event.target.value)} style={inputStyle} />
          <input aria-label="سبب الاسترداد" placeholder="سبب الاسترداد" value={reason} onChange={(event) => setReason(event.target.value)} style={inputStyle} />
          <input aria-label="مرجع الأهلية" placeholder="مرجع أهلية DSH" value={eligibilityReference} onChange={(event) => setEligibilityReference(event.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" disabled={busy || !orderId.trim()} onClick={() => void search()} style={{ ...buttonStyle, background: lightThemeColors.info, color: "white" }}>تحميل الاستردادات</button>
          <button type="button" disabled={busy || !paymentSessionId.trim() || !clientId.trim() || !reason.trim() || !eligibilityReference.trim()} onClick={() => void createRefund()} style={{ ...buttonStyle, background: lightThemeColors.success, color: "white" }}>إنشاء طلب استرداد</button>
        </div>
        {busy ? (
          <div role="status" aria-live="polite">
            <Text role="body" tone="muted">جارٍ تنفيذ العملية المالية والتحقق من أحدث حالة…</Text>
          </div>
        ) : null}
      </Card>

      {command.state.kind === "error" ? (
        <div role="alert" aria-live="assertive">
          <Card style={{ padding: "1rem", borderInlineStart: `4px solid ${lightThemeColors.danger}` }}>
            <Text role="body">{command.state.message}</Text>
          </Card>
        </div>
      ) : null}
      {command.state.kind === "provider_unknown" ? (
        <div role="alert" aria-live="assertive">
          <Card style={{ padding: "1rem", borderInlineStart: `4px solid ${lightThemeColors.warning}` }}>
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
              style={{ textAlign: "start", border: `1px solid ${selected?.id === refund.id ? lightThemeColors.info : lightThemeColors.borderColor}`, borderRadius: "0.6rem", padding: "0.8rem", background: "transparent", color: "inherit", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <strong>{refund.amountLabel} {refund.currency}</strong>
                <Badge label={refund.statusLabel} tone={refundTone(refund)} />
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
                <Badge label={selected.statusLabel} tone={refundTone(selected)} />
              </div>
              <Text role="body" tone="muted">{selected.amountLabel} {selected.currency} · {selected.reason ?? "بدون سبب ظاهر"}</Text>
              <input aria-label="سبب القرار" placeholder="سبب الاعتماد أو الرفض" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} style={inputStyle} />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("approve")} style={{ ...buttonStyle, background: lightThemeColors.success, color: "white" }}>اعتماد مستقل</button>
                <button type="button" disabled={busy || selected.status !== "requested" || !decisionReason.trim()} onClick={() => void decide("reject")} style={{ ...buttonStyle, background: lightThemeColors.danger, color: "white" }}>رفض</button>
                <button type="button" disabled={busy || selected.status !== "approved"} onClick={() => void execute()} style={{ ...buttonStyle, background: lightThemeColors.info, color: "white" }}>تنفيذ لدى المزود</button>
              </div>
              {selected.status === "provider_unknown" ? (
                <div role="region" aria-label="مصالحة النتيجة غير المحسومة" style={{ display: "grid", gap: "0.6rem", paddingTop: "0.5rem", borderTop: `1px solid ${lightThemeColors.borderColor}` }}>
                  <Text role="titleSm">مصالحة النتيجة غير المحسومة</Text>
                  <input aria-label="مرجع المزود" placeholder="مرجع المزود عند تأكيد النجاح" value={providerReference} onChange={(event) => setProviderReference(event.target.value)} style={inputStyle} />
                  <textarea aria-label="دليل المصالحة" placeholder="ملخص الدليل الخارجي" value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} style={{ ...inputStyle, minHeight: "5rem" }} />
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" disabled={busy || !providerReference.trim() || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_success")} style={{ ...buttonStyle, background: lightThemeColors.success, color: "white" }}>تأكيد نجاح موثق</button>
                    <button type="button" disabled={busy || !evidenceNote.trim()} onClick={() => void reconcile("confirmed_failed")} style={{ ...buttonStyle, background: lightThemeColors.danger, color: "white" }}>تأكيد فشل موثق</button>
                  </div>
                </div>
              ) : null}
              <div role="region" aria-label="سجل تدقيق الاسترداد" style={{ display: "grid", gap: "0.35rem", paddingTop: "0.5rem", borderTop: `1px solid ${lightThemeColors.borderColor}` }}>
                <Text role="titleSm">سجل التدقيق</Text>
                {audit.state.kind === "loading" ? (
                  <div role="status" aria-live="polite"><Text role="body">جارٍ تحميل سجل التدقيق...</Text></div>
                ) : null}
                {audit.state.kind === "error" ? (
                  <div role="alert" aria-live="assertive"><Text role="body">{audit.state.message}</Text></div>
                ) : null}
                {audit.state.kind === "loaded" && audit.state.events.length === 0 ? <Text role="body" tone="muted">لا توجد أحداث.</Text> : null}
                {audit.state.kind === "loaded" ? audit.state.events.map((event) => (
                  <div key={event.id} style={{ padding: "0.5rem", borderRadius: "0.4rem", background: lightThemeColors.surfaceInset }}>
                    <Text role="body">{event.eventType}: {event.fromStatus ?? "—"} ← {event.toStatus}</Text>
                    <Text role="caption" tone="muted">{event.actorType} · {event.createdAt} · {event.reason ?? "بدون ملاحظة"}</Text>
                  </div>
                )) : null}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
