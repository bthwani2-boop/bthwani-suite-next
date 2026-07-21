"use client";

import { CpPageHeader } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
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

function validationLabel(cart: DshCart): string {
  if (!cart.validation) return "لم تُفحص";
  if (cart.validation.ready) return "جاهزة";
  const changes = [
    cart.validation.priceChanged ? "تغير سعر" : null,
    cart.validation.unavailableCount > 0
      ? `${cart.validation.unavailableCount} عنصر غير متاح`
      : null,
  ].filter((value): value is string => value !== null);
  return changes.join(" · ") || "تحتاج مراجعة";
}

const CART_COLUMNS = [
  { key: "clientId", header: "معرف العميل", render: (cart: DshCart) => <Text role="body">{cart.clientId}</Text> },
  { key: "storeId", header: "معرف المتجر", render: (cart: DshCart) => <Text role="body">{cart.storeId}</Text> },
  { key: "fulfillmentMode", header: "طريقة التنفيذ", render: (cart: DshCart) => <Text role="body">{FULFILLMENT_LABELS[cart.fulfillmentMode] ?? cart.fulfillmentMode}</Text> },
  { key: "state", header: "الحالة", render: (cart: DshCart) => <Text role="body">{STATE_LABELS[cart.state] ?? cart.state}</Text> },
  { key: "items", header: "المنتجات", render: (cart: DshCart) => <Text role="body">{String(cart.items.length)}</Text> },
  { key: "validation", header: "سلامة التشكيلة", render: (cart: DshCart) => <Text role="body">{validationLabel(cart)}</Text> },
  { key: "version", header: "نسخة السلة", render: (cart: DshCart) => <Text role="body">{String(cart.version)}</Text> },
  { key: "updatedAt", header: "آخر تحديث", render: (cart: DshCart) => <Text role="body">{new Date(cart.updatedAt).toLocaleString("ar-SA")}</Text> },
] as const;

export function CartActivityScreen() {
  const controller = useOperatorCartsController("authenticated");

  return (
    <DataTablePageFrame
      dir="rtl"
      header={(
        <CpPageHeader title="نشاط سلال التسوق">
          قراءة تشغيلية لحالة السلة والتشكيلة فقط؛ لا توجد كتابة أو حقيقة مالية في هذا السطح.
        </CpPageHeader>
      )}
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
          getRowKey={(cart) => cart.id}
          emptyTitle="لا توجد سلال"
        />
      )}
    </DataTablePageFrame>
  );
}
