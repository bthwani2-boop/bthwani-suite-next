"use client";

import { useState } from "react";
import { CpButton, CpPageHeader, CpTable, CpTableCell, CpTableHeaderCell, CpTextInput } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { devBypassLogin, useIdentitySession } from "@bthwani/core-identity";
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

const STATE_STYLES: Record<DshIntentState, { readonly background: string; readonly color: string }> = {
  pending: { background: "color-mix(in srgb, CanvasText 8%, transparent)", color: "CanvasText" },
  payment_pending: { background: "color-mix(in srgb, Highlight 16%, transparent)", color: "CanvasText" },
  confirmed: { background: "color-mix(in srgb, ActiveText 16%, transparent)", color: "CanvasText" },
  cancelled: { background: "color-mix(in srgb, Mark 16%, transparent)", color: "CanvasText" },
  expired: { background: "color-mix(in srgb, CanvasText 8%, transparent)", color: "CanvasText" },
};

export function CheckoutActivityScreen() {
  const identity = useIdentitySession();
  const controller = useOperatorCheckoutController(identity.state.kind);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <section dir="rtl" style={STATE_PANEL_STYLE}>
        <h2 style={STATE_TITLE_STYLE}>صلاحية operator مطلوبة</h2>
        <p style={STATE_BODY_STYLE}>سجّل الدخول بحساب operator لمتابعة نشاط checkout ومرجع WLT.</p>
        <div style={LOGIN_FORM_STYLE}>
          <CpTextInput
            value={username}
            onChange={setUsername}
            placeholder="اسم المستخدم"
            aria-label="اسم المستخدم"
          />
          <CpTextInput
            value={password}
            onChange={setPassword}
            placeholder="كلمة المرور"
            type="password"
            aria-label="كلمة المرور"
          />
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <CpButton
              disabled={username.trim().length === 0 || password.length < 4 || identity.state.kind === "authenticating"}
              onClick={() => void identity.login(username.trim(), password)}
              style={PRIMARY_BUTTON_STYLE}
            >
              {identity.state.kind === "authenticating" ? "جاري التحقق..." : "تسجيل الدخول"}
            </CpButton>
            <CpButton
              onClick={() => devBypassLogin("operator")}
              style={SECONDARY_BUTTON_STYLE}
            >
              تجاوز تسجيل الدخول (مطور)
            </CpButton>
          </div>
          {identity.state.kind === "error" && <p role="alert" style={ERROR_TEXT_STYLE}>{identity.state.message}</p>}
        </div>
      </section>
    );
  }

  const stateView = controller.loadState === "loading"
    ? <StatePanel title="جاري تحميل نشاط checkout" description="يتم تحميل نوايا الدفع ومرجع WLT من DSH." />
    : controller.loadState === "empty"
      ? <StatePanel title="لا توجد نوايا checkout" description="ستظهر هنا أي نية دفع تنشأ من DSH-005." />
      : controller.loadState === "error"
        ? <StatePanel title="تعذر تحميل نشاط checkout" description="تحقق من صلاحيات operator واتصال DSH API." />
        : undefined;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="نشاط checkout ومرجع WLT" />}
      toolbar={
        <section style={TOOLBAR_STYLE}>
          <strong>حدود الشريحة</strong>
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
              <CpTableHeaderCell>آخر تحديث</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {controller.intents.map((intent) => (
              <CheckoutIntentRow key={intent.id} intent={intent} />
            ))}
          </tbody>
        </CpTable>
      )}
    </DataTablePageFrame>
  );
}

function CheckoutIntentRow({ intent }: { readonly intent: DshCheckoutIntent }) {
  return (
    <tr>
      <CpTableCell>{intent.clientId}</CpTableCell>
      <CpTableCell>{intent.storeId}</CpTableCell>
      <CpTableCell>{FULFILLMENT_LABELS[intent.fulfillmentMode] ?? intent.fulfillmentMode}</CpTableCell>
      <CpTableCell>{intent.paymentMethod}</CpTableCell>
      <CpTableCell>{intent.wltPaymentSessionId || "غير متوفر"}</CpTableCell>
      <CpTableCell><StatusBadge state={intent.state} /></CpTableCell>
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
const LOGIN_FORM_STYLE = { display: "grid", gap: "0.75rem", marginTop: "1rem" } as const;
const PRIMARY_BUTTON_STYLE = {
  flex: 1,
  minWidth: "10rem",
  minHeight: "2.75rem",
  border: "none",
  borderRadius: "0.75rem",
  background: "CanvasText",
  color: "Canvas",
  cursor: "pointer",
  fontWeight: 700,
} as const;
const SECONDARY_BUTTON_STYLE = {
  flex: 1,
  minWidth: "10rem",
  minHeight: "2.75rem",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: "0.75rem",
  background: "Canvas",
  color: "CanvasText",
  cursor: "pointer",
  fontWeight: 700,
} as const;
const ERROR_TEXT_STYLE = { margin: 0, color: "Mark", fontWeight: 700 } as const;
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
