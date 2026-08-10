"use client";

import { useState } from "react";
import { CpPageHeader, CpStatePanel, CpStateView, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { Button } from "@bthwani/ui-kit";
import { useOperatorCartsController } from "../../shared/cart";
import type { DshCart, DshFulfillmentMode } from "../../shared/cart";
import { CartSyncDiagnostics } from "../carts/CartSyncDiagnostics";

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

export function CartActivityScreen() {
  const controller = useOperatorCartsController("authenticated");
  const [diagnosticsCartId, setDiagnosticsCartId] = useState<string | null>(null);

  if (diagnosticsCartId) {
    return (
      <CartSyncDiagnostics
        cartId={diagnosticsCartId}
        onBack={() => setDiagnosticsCartId(null)}
      />
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={(
        <CpPageHeader title="نشاط سلال التسوق">
          قراءة تشغيلية لحالة السلة والتشكيلة فقط؛ لا توجد كتابة أو حقيقة مالية في هذا السطح.
        </CpPageHeader>
      )}
      stateView={
        controller.loadState === "loading" ? <CpStateView kind="loading" title="جاري تحميل السلال…" />
          : controller.loadState === "empty" ? <CpStatePanel role="status" title="لا توجد سلال في هذه الحالة." />
          : controller.loadState === "error" ? <CpStatePanel role="alert" title="تعذر تحميل السلال" description="تحقق من الصلاحيات." />
          : undefined
      }
    >
      {controller.loadState === "success" && (
        <CpTable aria-label="نشاط سلال التسوق">
          <thead>
            <tr>
              <CpTableHeaderCell>معرف العميل</CpTableHeaderCell>
              <CpTableHeaderCell>معرف المتجر</CpTableHeaderCell>
              <CpTableHeaderCell>طريقة التنفيذ</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>المنتجات</CpTableHeaderCell>
              <CpTableHeaderCell>سلامة التشكيلة</CpTableHeaderCell>
              <CpTableHeaderCell>نسخة السلة</CpTableHeaderCell>
              <CpTableHeaderCell>آخر تحديث</CpTableHeaderCell>
              <CpTableHeaderCell>تشخيص المزامنة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {controller.carts.map((cart) => (
              <tr key={cart.id}>
                <CpTableCell>{cart.clientId}</CpTableCell>
                <CpTableCell>{cart.storeId}</CpTableCell>
                <CpTableCell>{FULFILLMENT_LABELS[cart.fulfillmentMode] ?? cart.fulfillmentMode}</CpTableCell>
                <CpTableCell>{STATE_LABELS[cart.state] ?? cart.state}</CpTableCell>
                <CpTableCell>{String(cart.items.length)}</CpTableCell>
                <CpTableCell>{validationLabel(cart)}</CpTableCell>
                <CpTableCell>{String(cart.version)}</CpTableCell>
                <CpTableCell>{new Date(cart.updatedAt).toLocaleString("ar-SA")}</CpTableCell>
                <CpTableCell>
                  <Button
                    label="فتح السجل"
                    tone="secondary"
                    size="sm"
                    onPress={() => setDiagnosticsCartId(cart.id)}
                  />
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}
    </DataTablePageFrame>
  );
}
