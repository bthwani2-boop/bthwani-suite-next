"use client";

import { CpPageHeader, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useOperatorCheckoutController } from "../../shared/checkout";
import type { DshCheckoutIntent, DshFulfillmentMode, DshIntentState } from "../../shared/checkout";

const FULFILLMENT_LABELS: Record<DshFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

const STATE_LABELS: Record<DshIntentState, string> = {
  pending: "قيد الانتظار",
  wlt_handoff_failed: "فشل تحويل الدفع إلى WLT",
  wlt_outcome_unknown: "نتيجة WLT غير معروفة",
  payment_pending: "في انتظار الدفع",
  payment_confirmed: "تم تأكيد الدفع",
  payment_failed: "فشل الدفع",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  expired: "منتهي",
};

const STATE_STYLES: Record<DshIntentState, { readonly background: string; readonly color: string }> = {
  pending: { background: "color-mix(in srgb, CanvasText 8%, transparent)", color: "CanvasText" },
  wlt_handoff_failed: { background: "color-mix(in srgb, Mark 16%, transparent)", color: "CanvasText" },
  wlt_outcome_unknown: { background: "color-mix(in srgb, Highlight 22%, transparent)", color: "CanvasText" },
  payment_pending: { background: "color-mix(in srgb, Highlight 16%, transparent)", color: "CanvasText" },
  payment_confirmed: { background: "color-mix(in srgb, ActiveText 16%, transparent)", color: "CanvasText" },
  payment_failed: { background: "color-mix(in srgb, Mark 16%, transparent)", color: "CanvasText" },
  confirmed: { background: "color-mix(in srgb, ActiveText 16%, transparent)", color: "CanvasText" },
  cancelled: { background: "color-mix(in srgb, Mark 16%, transparent)", color: "CanvasText" },
  expired: { background: "color-mix(in srgb, CanvasText 8%, transparent)", color: "CanvasText" },
};

export function CheckoutActivityScreen() {
  const controller = useOperatorCheckoutController("authenticated");

  const stateView = controller.loadState === "loading"
    ? <StatePanel title="جاري تحميل نشاط checkout" description="يتم تحميل نوايا الدفع ومرجع WLT من DSH." />
    : controller.loadState === "empty"
      ? <StatePanel title="لا توجد نوايا checkout" description="ستظهر هنا أي نية دفع تنشأ من DSH." />
      : controller.loadState === "error"
        ? <StatePanel title="تعذر تحميل نشاط checkout" description="تحقق من صلاحيات operator واتصال DSH API." />
        : undefined;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="نشاط checkout ومرجع WLT" />}
      toolbar={
        <section style={TOOLBAR_STYLE}>
          <strong>حدود الخدمة والرحلة التشغيلية</strong>
          <p style={{ margin: "0.35rem 0 0", opacity: 0.75 }}>
            هذه الشاشة مراقبة تشغيلية فقط: DSH يعرض نية checkout، و WLT يملك مرجع جلسة الدفع. لا توجد أزرار خصم أو استرداد أو تسوية هنا.
          </p>
        </section>
      }
      stateView={stateView}
    >
      {controller.loadState === "success" && (
        <CpTable aria-label="نشاط checkout">
          <thead>
            <tr>
              <CpTableHeaderCell>معرف العميل</CpTableHeaderCell>
              <CpTableHeaderCell>معرف المتجر</CpTableHeaderCell>
              <CpTableHeaderCell>طريقة التوصيل</CpTableHeaderCell>
              <CpTableHeaderCell>طريقة الدفع</CpTableHeaderCell>
              <CpTableHeaderCell>مرجع WLT</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>المصالحة</CpTableHeaderCell>
              <CpTableHeaderCell>آخر تحديث</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {controller.intents.map((intent) => (
              <CheckoutIntentRow key={intent.id} intent={intent} onReconcile={controller.reconcile} />
            ))}
          </tbody>
        </CpTable>
      )}
    </DataTablePageFrame>
  );
}

function CheckoutIntentRow({
  intent,
  onReconcile,
}: {
  readonly intent: DshCheckoutIntent;
  readonly onReconcile: (intentId: string) => Promise<void>;
}) {
  return (
    <tr>
      <CpTableCell>{intent.clientId}</CpTableCell>
      <CpTableCell>{intent.storeId}</CpTableCell>
      <CpTableCell>{FULFILLMENT_LABELS[intent.fulfillmentMode] ?? intent.fulfillmentMode}</CpTableCell>
      <CpTableCell>{intent.paymentMethod}</CpTableCell>
      <CpTableCell>{intent.wltPaymentSessionId || "غير متوفر"}</CpTableCell>
      <CpTableCell><StatusBadge state={intent.state} /></CpTableCell>
      <CpTableCell>
        {intent.reconciliationRequired ? (
          <button type="button" onClick={() => void onReconcile(intent.id)}>
            إعادة المصالحة ({Math.max(0, intent.reconciliationAgeSeconds ?? 0)}ث)
          </button>
        ) : "لا يلزم"}
      </CpTableCell>
      <CpTableCell>{new Date(intent.updatedAt).toLocaleString("ar-SA")}</CpTableCell>
    </tr>
  );
}

function StatusBadge({ state }: { readonly state: DshIntentState }) {
  const style = STATE_STYLES[state] ?? STATE_STYLES.pending;
  return (
    <span style={{ ...BADGE_STYLE, ...style }}>
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

function StatePanel({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <section dir="rtl" style={STATE_PANEL_STYLE}>
      <h2 style={STATE_TITLE_STYLE}>{title}</h2>
      <p style={STATE_BODY_STYLE}>{description}</p>
    </section>
  );
}

const TOOLBAR_STYLE = {
  margin: "0 1rem 1rem",
  padding: "1rem",
  border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
  borderRadius: "0.75rem",
  background: "Canvas",
} as const;

const STATE_PANEL_STYLE = {
  margin: "1rem",
  padding: "1.25rem",
  border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
  borderRadius: "0.75rem",
  background: "Canvas",
} as const;

const STATE_TITLE_STYLE = { margin: 0, fontSize: "1.1rem", fontWeight: 700 } as const;
const STATE_BODY_STYLE = { margin: "0.4rem 0 0", opacity: 0.72 } as const;
const BADGE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "1.7rem",
  padding: "0.15rem 0.6rem",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;
