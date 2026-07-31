"use client";

import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
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
      header={(
        <CpPageHeader title="نشاط checkout ومرجع WLT">
          <div style={styles.boundaryNote}>
            <CpMutedInline tight>
              حدود الخدمة والرحلة التشغيلية: هذه الشاشة مراقبة تشغيلية فقط، DSH يعرض نية checkout وWLT يملك مرجع جلسة الدفع. لا توجد أزرار خصم أو استرداد أو تسوية هنا.
            </CpMutedInline>
          </div>
        </CpPageHeader>
      )}
      filters={(
        <CpFilterBar label="مرشحات حالة checkout">
          <CpButton onClick={() => controller.reload()}>كل الحالات</CpButton>
          <CpButton onClick={() => controller.reload("wlt_outcome_unknown")}>تحتاج مصالحة</CpButton>
          <CpButton onClick={() => controller.reload("wlt_handoff_failed")}>فشل التسليم إلى WLT</CpButton>
          <CpButton onClick={() => controller.reload("payment_pending")}>في انتظار نتيجة الدفع</CpButton>
        </CpFilterBar>
      )}
      stateView={stateView}
    >
      {controller.reconcileError ? (
        <CpStatePanel role="alert" title="تعذر تنفيذ المصالحة" description={controller.reconcileError}>
          <CpButton onClick={controller.clearReconcileError} variant="ghost">إغلاق الرسالة</CpButton>
        </CpStatePanel>
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
      <CpTableCell>{intent.operatorContextId || "غير متاح"}</CpTableCell>
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
  return <CpBadge tone={STATUS_TONE[state] ?? "neutral"}>{STATE_LABELS[state] ?? state}</CpBadge>;
}

const STATUS_TONE: Record<DshIntentState, CpBadgeTone> = {
  pending: "neutral",
  wlt_handoff_failed: "danger",
  wlt_outcome_unknown: "warning",
  payment_pending: "info",
  payment_confirmed: "success",
  payment_failed: "danger",
  confirmed: "success",
  cancelled: "danger",
  expired: "neutral",
};

const styles = WebStyleSheet.create({
  boundaryNote: {
    maxWidth: "72rem",
  },
});
