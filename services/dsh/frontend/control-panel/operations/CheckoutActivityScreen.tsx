"use client";

import {
  CpPageHeader,
  DataTablePageFrame,
  useIdentitySession,
} from "@bthwani/app-shell";
import { DataTable, Text } from "@bthwani/ui-kit";
import { useOperatorCheckoutController } from "../../shared/checkout";
import type { DshCheckoutIntent, DshFulfillmentMode, DshIntentState } from "../../shared/checkout";

const FULFILLMENT_LABELS: Record<DshFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

const STATE_LABELS: Record<DshIntentState, string> = {
  pending: "قيد الانتظار",
  payment_pending: "في انتظار الدفع",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  expired: "منتهي",
};

const INTENT_COLUMNS = [
  { key: "clientId", header: "معرف العميل", render: (i: DshCheckoutIntent) => <Text role="body">{i.clientId}</Text> },
  { key: "storeId", header: "معرف المتجر", render: (i: DshCheckoutIntent) => <Text role="body">{i.storeId}</Text> },
  { key: "fulfillmentMode", header: "طريقة التوصيل", render: (i: DshCheckoutIntent) => <Text role="body">{FULFILLMENT_LABELS[i.fulfillmentMode] ?? i.fulfillmentMode}</Text> },
  { key: "paymentMethod", header: "طريقة الدفع", render: (i: DshCheckoutIntent) => <Text role="body">{i.paymentMethod}</Text> },
  { key: "state", header: "الحالة", render: (i: DshCheckoutIntent) => <Text role="body">{STATE_LABELS[i.state] ?? i.state}</Text> },
  { key: "updatedAt", header: "آخر تحديث", render: (i: DshCheckoutIntent) => <Text role="body">{new Date(i.updatedAt).toLocaleString("ar-SA")}</Text> },
] as const;

export function CheckoutActivityScreen() {
  const identity = useIdentitySession();
  const controller = useOperatorCheckoutController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <Text role="body" dir="rtl">سجّل الدخول بحساب operator لمتابعة نشاط الطلبات.</Text>;
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="نشاط طلبات الدفع" />}
      stateView={
        controller.loadState === "loading" ? <Text role="body">جاري تحميل الطلبات…</Text>
          : controller.loadState === "empty" ? <Text role="body">لا توجد طلبات في هذه الحالة.</Text>
          : controller.loadState === "error" ? <Text role="body">تعذر تحميل الطلبات. تحقق من الصلاحيات.</Text>
          : undefined
      }
    >
      {controller.loadState === "success" && (
        <DataTable
          columns={INTENT_COLUMNS}
          rows={controller.intents}
          getRowKey={(i) => i.id}
          emptyTitle="لا توجد طلبات"
        />
      )}
    </DataTablePageFrame>
  );
}
