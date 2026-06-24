"use client";

import { CpPageHeader, DataTablePageFrame } from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/app-shell";
import { DataTable, Text } from "@bthwani/ui-kit";
import { useOperatorCartsController } from "../../shared/cart";
import type { DshCart, DshFulfillmentMode } from "../../shared/cart";

const FULFILLMENT_LABELS: Record<DshFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

const STATE_LABELS: Record<string, string> = {
  active: "نشطة",
  checked_out: "تمت العملية",
  abandoned: "متروكة",
};

const CART_COLUMNS = [
  { key: "clientId", header: "معرف العميل", render: (c: DshCart) => <Text role="body">{c.clientId}</Text> },
  { key: "storeId", header: "معرف المتجر", render: (c: DshCart) => <Text role="body">{c.storeId}</Text> },
  { key: "fulfillmentMode", header: "طريقة التوصيل", render: (c: DshCart) => <Text role="body">{FULFILLMENT_LABELS[c.fulfillmentMode] ?? c.fulfillmentMode}</Text> },
  { key: "state", header: "الحالة", render: (c: DshCart) => <Text role="body">{STATE_LABELS[c.state] ?? c.state}</Text> },
  { key: "items", header: "المنتجات", render: (c: DshCart) => <Text role="body">{String(c.items.length)}</Text> },
  { key: "updatedAt", header: "آخر تحديث", render: (c: DshCart) => <Text role="body">{new Date(c.updatedAt).toLocaleString("ar-SA")}</Text> },
] as const;

export function CartActivityScreen() {
  const identity = useIdentitySession();
  const controller = useOperatorCartsController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <Text role="body" dir="rtl">سجّل الدخول بحساب operator لمتابعة نشاط السلال.</Text>;
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="نشاط سلال التسوق" />}
      stateView={
        controller.loadState === "loading" ? <Text role="body">جاري تحميل السلال…</Text>
          : controller.loadState === "empty" ? <Text role="body">لا توجد سلال في هذه الحالة.</Text>
          : controller.loadState === "error" ? <Text role="body">تعذر تحميل السلال. تحقق من الصلاحيات.</Text>
          : undefined
      }
    >
      {controller.loadState === "success" && (
        <DataTable
          columns={CART_COLUMNS}
          rows={controller.carts}
          getRowKey={(c) => c.id}
          emptyTitle="لا توجد سلال"
        />
      )}
    </DataTablePageFrame>
  );
}
