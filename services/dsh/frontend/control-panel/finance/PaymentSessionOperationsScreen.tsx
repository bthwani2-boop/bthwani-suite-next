"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
} from "@bthwani/ui-kit";
import {
  presentWltPaymentSessionStatus,
  requiresWltPaymentReconciliation,
  type WltPaymentSessionTimeline,
} from "@bthwani/wlt";
import {
  loadPaymentSessionTimeline,
  refreshPaymentSessionProviderStatus,
  type PaymentSessionRuntimeError,
} from "../../shared/finance-wlt-link/payment/payment-session-runtime.api";

type ScreenState = "idle" | "loading" | "ready" | "refreshing" | "offline" | "forbidden" | "not_found" | "conflict" | "error";

const inputStyle = {
  width: "100%",
  border: `1px solid ${lightThemeColors.borderColor}`,
  borderRadius: "10px",
  padding: "0.75rem",
  background: lightThemeColors.surface,
  color: lightThemeColors.color,
  direction: "ltr" as const,
};

function formatAmount(minorUnits: number, currency: string): string {
  return `${new Intl.NumberFormat("ar-YE").format(minorUnits)} ${currency === "YER" ? "ر.ي" : currency}`;
}

function errorState(error: PaymentSessionRuntimeError): ScreenState {
  return error.state;
}

export function PaymentSessionOperationsScreen() {
  const [tenantId, setTenantId] = useState("");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [state, setState] = useState<ScreenState>("idle");
  const [timeline, setTimeline] = useState<WltPaymentSessionTimeline | null>(null);
  const [error, setError] = useState<PaymentSessionRuntimeError | null>(null);

  const presentation = useMemo(
    () => (timeline ? presentWltPaymentSessionStatus(timeline.paymentSession.status) : null),
    [timeline],
  );

  const canSubmit = tenantId.trim().length > 0 && paymentSessionId.trim().length > 0 && state !== "loading" && state !== "refreshing";

  const readTimeline = async () => {
    if (!canSubmit) return;
    setState("loading");
    setError(null);
    const result = await loadPaymentSessionTimeline(paymentSessionId.trim(), tenantId.trim());
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
    if (!canSubmit || !timeline) return;
    setState("refreshing");
    setError(null);
    const result = await refreshPaymentSessionProviderStatus(paymentSessionId.trim(), tenantId.trim());
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
          description="أدخل معرف المستأجر ومعرف الجلسة لقراءة الحقيقة من WLT عبر وكيل DSH المحكوم."
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

    const unknown = requiresWltPaymentReconciliation(timeline.paymentSession.status);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Card style={{ padding: "1.25rem", borderRight: `4px solid ${unknown ? lightThemeColors.danger : lightThemeColors.success}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <Text role="titleMd">{presentation.label}</Text>
              <Text role="body" tone="muted" style={{ marginTop: "0.35rem" }}>{presentation.description}</Text>
            </div>
            <Badge label={timeline.paymentSession.status} tone={presentation.tone} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            <div><Text role="caption" tone="muted">المبلغ</Text><Text role="body">{formatAmount(timeline.paymentSession.amountMinorUnits, timeline.paymentSession.currency)}</Text></div>
            <div><Text role="caption" tone="muted">وسيلة الدفع</Text><Text role="body">{timeline.paymentSession.paymentMethod}</Text></div>
            <div><Text role="caption" tone="muted">مرجع المزود</Text><Text role="body">{timeline.paymentSession.providerReference || "—"}</Text></div>
            <div><Text role="caption" tone="muted">قيد التحصيل</Text><Text role="body">{timeline.captureLedgerTransactionId || "غير موجود"}</Text></div>
          </div>
          {unknown ? (
            <Card style={{ padding: "1rem", marginTop: "1rem", background: lightThemeColors.dangerSurface }}>
              <Text role="body">ممنوع إعادة التفويض أو التحصيل. استخدم تحديث حالة المزود، ثم عالج حالة المطابقة المفتوحة بناءً على دليل مزود موثوق.</Text>
            </Card>
          ) : null}
          <div style={{ marginTop: "1rem" }}>
            <Button
              label={state === "refreshing" ? "جارٍ الاستعلام من المزود..." : "تحديث حالة المزود"}
              tone="secondary"
              onPress={refreshProvider}
              disabled={state === "refreshing" || presentation.terminal}
            />
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">إيصالات العمليات ({timeline.operationReceipts.length})</Text>
          {timeline.operationReceipts.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد عمليات authorize/capture مسجلة.</Text> : timeline.operationReceipts.map((receipt) => (
            <div key={receipt.id} style={{ borderTop: `1px solid ${lightThemeColors.borderColor}`, padding: "0.75rem 0" }}>
              <Text role="body">{receipt.operation} · {receipt.state}</Text>
              <Text role="caption" tone="muted">{receipt.correlationId || "بدون correlation"} · {receipt.responseStatus || "—"}</Text>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">أحداث المزود الموقعة ({timeline.providerEvents.length})</Text>
          {timeline.providerEvents.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد أحداث مزود مستلمة.</Text> : timeline.providerEvents.map((event) => (
            <div key={event.providerEventId} style={{ borderTop: `1px solid ${lightThemeColors.borderColor}`, padding: "0.75rem 0" }}>
              <Text role="body">{event.eventType} · {event.processingState}</Text>
              <Text role="caption" tone="muted">{event.providerEventId} · {event.providerStatus}</Text>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <Text role="titleMd">المطابقة والتسوية ({timeline.reconciliationCases.length})</Text>
          {timeline.reconciliationCases.length === 0 ? <Text role="body" tone="muted" style={{ marginTop: "0.75rem" }}>لا توجد حالة مطابقة مرتبطة.</Text> : timeline.reconciliationCases.map((item) => (
            <div key={item.id} style={{ borderTop: `1px solid ${lightThemeColors.borderColor}`, padding: "0.75rem 0" }}>
              <Text role="body">{item.operation} · {item.status}</Text>
              <Text role="caption" tone="muted">{item.triggerReason}{item.resolutionAction ? ` · ${item.resolutionAction}` : ""}</Text>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <ScrollScreen>
      <div dir="rtl" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <Text role="titleLg">عمليات جلسات الدفع</Text>
          <Text role="body" tone="muted">خط زمني موحد لإيصالات العمليات، أحداث المزود، قيد Ledger وحالات المطابقة.</Text>
        </div>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <label><Text role="caption">معرف المستأجر</Text><input aria-label="معرف المستأجر" value={tenantId} onChange={(event) => setTenantId(event.target.value)} style={inputStyle} placeholder="tenant-main" /></label>
            <label><Text role="caption">معرف جلسة الدفع</Text><input aria-label="معرف جلسة الدفع" value={paymentSessionId} onChange={(event) => setPaymentSessionId(event.target.value)} style={inputStyle} placeholder="payment-session-id" /></label>
          </div>
          <div style={{ marginTop: "1rem" }}><Button label="تحميل الخط الزمني" tone="primary" onPress={readTimeline} disabled={!canSubmit} /></div>
        </Card>
        {renderState()}
      </div>
    </ScrollScreen>
  );
}
