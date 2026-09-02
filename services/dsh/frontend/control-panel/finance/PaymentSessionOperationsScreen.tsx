"use client";

import { useMemo, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { Button, Card, StateView, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import { CpBadge, CpMutedInline, CpPageHeader, CpTextInput } from "@bthwani/control-panel/components";
import { FinanceReadOnlyFrame } from "@bthwani/control-panel/shell";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";
import {
  presentWltPaymentSessionStatus,
  requiresWltPaymentReconciliation,
  type WltPaymentSessionTimeline } from '@bthwani/dsh/wlt-boundary';
import { formatWltMoney } from '@bthwani/dsh/finance';
import {
  loadPaymentSessionTimeline,
  refreshPaymentSessionProviderStatus,
  type PaymentSessionRuntimeError } from '@bthwani/dsh/wlt-boundary';

type ScreenState = "idle" | "loading" | "ready" | "refreshing" | "offline" | "forbidden" | "not_found" | "conflict" | "error";

function errorState(error: PaymentSessionRuntimeError): ScreenState {
  return error.state;
}

function toBadgeTone(tone: "action" | "success" | "warning" | "danger" | "info"): CpBadgeTone {
  return tone === "action" ? "brand" : tone;
}

export function PaymentSessionOperationsScreen() {
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canManageFinance = hasServiceControlPanelPermission(identity, "dsh", "finance.manage");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [state, setState] = useState<ScreenState>("idle");
  const [timeline, setTimeline] = useState<WltPaymentSessionTimeline | null>(null);
  const [error, setError] = useState<PaymentSessionRuntimeError | null>(null);

  const presentation = useMemo(
    () => (timeline ? presentWltPaymentSessionStatus(timeline.paymentSession.status) : null),
    [timeline],
  );

  const canSubmit = paymentSessionId.trim().length > 0 && state !== "loading" && state !== "refreshing";

  const readTimeline = async () => {
    if (!canSubmit) return;
    setState("loading");
    setError(null);
    const result = await loadPaymentSessionTimeline(paymentSessionId.trim());
    if (!result.ok) {
      setTimeline(null);
      setError(result.error);
      setState(errorState(result.error));
      return;
    }
    setTimeline(result.data.paymentTimeline);
    setState("ready");
  };

  const refreshProvider = async () => {
    if (!canManageFinance || !canSubmit || !timeline) return;
    setState("refreshing");
    setError(null);
    const result = await refreshPaymentSessionProviderStatus(paymentSessionId.trim());
    if (!result.ok) {
      setError(result.error);
      setState(errorState(result.error));
      return;
    }
    await readTimeline();
  };

  const renderState = () => {
    if (state === "idle") {
      return (
        <StateView
          title="ابحث عن جلسة دفع"
          description="أدخل معرف الجلسة؛ يستمد DSH سياق المنصة من جلسة المشغل الموثوقة."
        />
      );
    }
    if (state === "loading") {
      return <StateView title="جارٍ تحميل الخط الزمني" description="تتم القراءة من WLT دون إنشاء نسخة مالية محلية." />;
    }
    if (state !== "ready" && state !== "refreshing") {
      return (
        <StateView
          title={state === "offline" ? "الاتصال غير متاح" : state === "forbidden" ? "الوصول مرفوض" : state === "not_found" ? "الجلسة غير موجودة" : state === "conflict" ? "تعارض مالي" : "تعذر تحميل الجلسة"}
          description={error?.message ?? "تعذر إكمال القراءة."}
          actionLabel="إعادة المحاولة"
          onActionPress={readTimeline}
        />
      );
    }
    if (!timeline || !presentation) return null;

    const capabilities = timeline.paymentSession.capabilities;
    const reconciliationRequired = requiresWltPaymentReconciliation(capabilities);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <Text role="titleMd">{presentation.label}</Text>
              <Text role="body" tone="muted" style={{ marginTop: "0.35rem" }}>{presentation.description}</Text>
            </div>
            <CpBadge tone={toBadgeTone(presentation.tone)}>{timeline.paymentSession.status}</CpBadge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            <div><Text role="caption" tone="muted">المبلغ</Text><Text role="body">{formatWltMoney(timeline.paymentSession.amountMinorUnits, timeline.paymentSession.currency)}</Text></div>
            <div><Text role="caption" tone="muted">وسيلة الدفع</Text><Text role="body">{timeline.paymentSession.paymentMethod}</Text></div>
            <div><Text role="caption" tone="muted">مرجع المزود</Text><Text role="body">{timeline.paymentSession.providerReference || "—"}</Text></div>
            <div><Text role="caption" tone="muted">قيد التحصيل</Text><Text role="body">{timeline.captureLedgerTransactionId || "غير موجود"}</Text></div>
          </div>
          {reconciliationRequired ? (
            <Card style={{ padding: "1rem", marginTop: "1rem" }}>
              <Text role="body">ممنوع إعادة التفويض أو التحصيل. استخدم تحديث حالة المزود، ثم عالج حالة المطابقة المفتوحة بناءً على دليل مزود موثوق.</Text>
            </Card>
          ) : null}
          {canManageFinance ? <div style={{ marginTop: "1rem" }}>
            <Button
              variant="secondary"
              onClick={refreshProvider}
              disabled={state === "refreshing" || capabilities.terminal || capabilities.operationInProgress}
            >
              {state === "refreshing" ? "جارٍ الاستعلام من المزود..." : "تحديث حالة المزود"}
            </Button>
          </div> : <Text role="body" tone="warning" style={{ marginTop: "1rem" }}>قراءة فقط — تحديث حالة المزود يتطلب finance.manage.</Text>}
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">إيصالات العمليات ({timeline.operationReceipts.length})</Text>
          {timeline.operationReceipts.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد عمليات authorize/capture مسجلة.</Text> : timeline.operationReceipts.map((receipt) => (
            <div key={receipt.id} style={{ padding: "0.75rem 0" }}>
              <Text role="body">{receipt.operation} · {receipt.state}</Text>
              <CpMutedInline tight>{receipt.correlationId || "بدون correlation"} · {receipt.responseStatus || "—"}</CpMutedInline>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">أحداث المزود الموقعة ({timeline.providerEvents.length})</Text>
          {timeline.providerEvents.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد أحداث مزود مستلمة.</Text> : timeline.providerEvents.map((event) => (
            <div key={event.providerEventId} style={{ padding: "0.75rem 0" }}>
              <Text role="body">{event.eventType} · {event.processingState}</Text>
              <CpMutedInline tight>{event.providerEventId} · {event.providerStatus}</CpMutedInline>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">المطابقة والتسوية ({timeline.reconciliationCases.length})</Text>
          {timeline.reconciliationCases.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد حالة مطابقة مرتبطة.</Text> : timeline.reconciliationCases.map((item) => (
            <div key={item.id} style={{ padding: "0.75rem 0" }}>
              <Text role="body">{item.operation} · {item.status}</Text>
              <CpMutedInline tight>{item.triggerReason}{item.resolutionAction ? ` · ${item.resolutionAction}` : ""}</CpMutedInline>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <FinanceReadOnlyFrame
      header={
        <CpPageHeader title="عمليات جلسات الدفع">
          <CpMutedInline tight>خط زمني موحد لإيصالات العمليات، أحداث المزود، قيد Ledger وحالات المطابقة.</CpMutedInline>
        </CpPageHeader>
      }
      summary={
        <Card style={{ padding: "1.25rem" }}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void readTimeline();
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <Text role="caption">معرف جلسة الدفع</Text>
                <CpTextInput aria-label="معرف جلسة الدفع" value={paymentSessionId} onChange={setPaymentSessionId} placeholder="payment-session-id" />
              </label>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Button type="submit" variant="primary" disabled={!canSubmit}>تحميل الخط الزمني</Button>
            </div>
          </form>
        </Card>
      }
    >
      {renderState()}
    </FinanceReadOnlyFrame>
  );
}
