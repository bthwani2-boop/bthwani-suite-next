"use client";

import {
  CpButton,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
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

export function CheckoutActivityScreen() {
  const controller = useOperatorCheckoutController("authenticated");

  const stateView = controller.loadState === "loading"
    ? <CpStatePanel role="status" title="جاري تحميل نشاط checkout" description="يتم تحميل نوايا الدفع ومرجع WLT من DSH." />
    : controller.loadState === "empty"
      ? <CpStatePanel role="status" title="لا توجد نوايا checkout" description="لا توجد سجلات مطابقة للمرشح الحالي." />
      : controller.loadState === "error"
        ? (
          <CpStatePanel role="alert" title="تعذر تحميل نشاط checkout" description="تحقق من صلاحيات operator واتصال DSH API.">
            <CpRetryButton onClick={controller.reload}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        )
        : undefined;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="نشاط checkout ومرجع WLT" />}
      toolbar={(
        <section style={styles.toolbar}>
          <strong>حدود الخدمة والرحلة التشغيلية</strong>
          <p style={styles.toolbarDescription}>
            هذه الشاشة مراقبة تشغيلية فقط: DSH يعرض نية checkout، وWLT يملك مرجع جلسة الدفع. لا توجد أزرار خصم أو استرداد أو تسوية هنا.
          </p>
          <div style={styles.filters} aria-label="مرشحات حالة checkout">
            <CpButton onClick={() => controller.reload()}>كل الحالات</CpButton>
            <CpButton onClick={() => controller.reload("wlt_outcome_unknown")}>تحتاج مصالحة</CpButton>
            <CpButton onClick={() => controller.reload("wlt_handoff_failed")}>فشل التسليم إلى WLT</CpButton>
            <CpButton onClick={() => controller.reload("payment_pending")}>في انتظار نتيجة الدفع</CpButton>
          </div>
        </section>
      )}
      stateView={stateView}
    >
      {controller.reconcileError ? (
        <div style={styles.alertWrap}>
          <CpStatePanel role="alert" title="تعذر تنفيذ المصالحة" description={controller.reconcileError}>
            <CpButton onClick={controller.clearReconcileError} style={styles.dismissButton}>إغلاق الرسالة</CpButton>
          </CpStatePanel>
        </div>
      ) : null}

      {controller.loadState === "success" && (
        <CpTable aria-label="نشاط checkout">
          <thead>
            <tr>
              <CpTableHeaderCell>المستأجر</CpTableHeaderCell>
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
              <CheckoutIntentRow
                key={intent.id}
                intent={intent}
                reconcilingIntentId={controller.reconcilingIntentId}
                onReconcile={controller.reconcile}
              />
            ))}
          </tbody>
        </CpTable>
      )}
    </DataTablePageFrame>
  );
}

function CheckoutIntentRow({
  intent,
  reconcilingIntentId,
  onReconcile,
}: {
  readonly intent: DshCheckoutIntent;
  readonly reconcilingIntentId: string | null;
  readonly onReconcile: (intentId: string) => Promise<boolean>;
}) {
  const isReconciling = reconcilingIntentId === intent.id;
  const reconciliationLocked = reconcilingIntentId !== null;

  return (
    <tr>
      <CpTableCell>{intent.tenantId || "غير متاح"}</CpTableCell>
      <CpTableCell>{intent.clientId}</CpTableCell>
      <CpTableCell>{intent.storeId}</CpTableCell>
      <CpTableCell>{FULFILLMENT_LABELS[intent.fulfillmentMode] ?? intent.fulfillmentMode}</CpTableCell>
      <CpTableCell>{intent.paymentMethod}</CpTableCell>
      <CpTableCell>{intent.wltPaymentSessionId || "غير متوفر"}</CpTableCell>
      <CpTableCell><StatusBadge state={intent.state} /></CpTableCell>
      <CpTableCell>
        {intent.reconciliationRequired ? (
          <CpButton
            onClick={() => void onReconcile(intent.id)}
            disabled={reconciliationLocked}
            aria-label={`إعادة مصالحة checkout ${intent.id}`}
            style={styles.reconcileButton}
          >
            {isReconciling
              ? "جاري تنفيذ المصالحة…"
              : `إعادة المصالحة (${Math.max(0, intent.reconciliationAgeSeconds ?? 0)}ث)`}
          </CpButton>
        ) : "لا يلزم"}
      </CpTableCell>
      <CpTableCell>{new Date(intent.updatedAt).toLocaleString("ar-SA")}</CpTableCell>
    </tr>
  );
}

function StatusBadge({ state }: { readonly state: DshIntentState }) {
  const style = {
    ...styles.badge,
    ...(STATUS_TONE_STYLES[state] ?? styles.statusNeutral),
  };
  return <span style={style}>{STATE_LABELS[state] ?? state}</span>;
}

const styles = WebStyleSheet.create({
  toolbar: {
    margin: "0 1rem 1rem",
    padding: "1rem",
    border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
    borderRadius: "0.75rem",
    background: "Canvas",
  },
  toolbarDescription: {
    margin: "0.35rem 0 0",
    opacity: 0.75,
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "0.85rem",
  },
  alertWrap: {
    margin: "0 1rem 1rem",
  },
  reconcileButton: {
    minHeight: "2.25rem",
    padding: "0.45rem 0.75rem",
    border: "1px solid currentColor",
    borderRadius: "0.55rem",
    background: "Canvas",
    color: "CanvasText",
    cursor: "pointer",
    fontWeight: 700,
  },
  dismissButton: {
    marginTop: "0.75rem",
    minHeight: "2.1rem",
    padding: "0.4rem 0.7rem",
    border: "1px solid currentColor",
    borderRadius: "0.5rem",
    background: "Canvas",
    color: "CanvasText",
    cursor: "pointer",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "1.7rem",
    padding: "0.15rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    color: "CanvasText",
  },
  statusNeutral: {
    background: "color-mix(in srgb, CanvasText 8%, transparent)",
  },
  statusDanger: {
    background: "color-mix(in srgb, Mark 16%, transparent)",
  },
  statusWarning: {
    background: "color-mix(in srgb, Highlight 22%, transparent)",
  },
  statusInfo: {
    background: "color-mix(in srgb, Highlight 16%, transparent)",
  },
  statusSuccess: {
    background: "color-mix(in srgb, ActiveText 16%, transparent)",
  },
});

const STATUS_TONE_STYLES: Record<DshIntentState, typeof styles.statusNeutral> = {
  pending: styles.statusNeutral,
  wlt_handoff_failed: styles.statusDanger,
  wlt_outcome_unknown: styles.statusWarning,
  payment_pending: styles.statusInfo,
  payment_confirmed: styles.statusSuccess,
  payment_failed: styles.statusDanger,
  confirmed: styles.statusSuccess,
  cancelled: styles.statusDanger,
  expired: styles.statusNeutral,
};
