"use client";

import { useState } from "react";
import { CpButton, CpPageHeader, CpTextInput } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import { useCatalogApprovalController } from "../../shared/catalog";

export function CatalogApprovalScreen() {
  const identity = useIdentitySession();
  const controller = useCatalogApprovalController(identity.state.kind);
  const [reasonByStore, setReasonByStore] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>مراجعة واعتماد الكتالوجات</h1>
          <p style={{ opacity: 0.7 }}>يتطلب حساب operator مصرح به لمراجعة الكتالوجات.</p>
        </div>
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
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton
            disabled={username.trim().length === 0 || password.length < 4 || identity.state.kind === "authenticating"}
            onClick={() => void identity.login(username.trim(), password)}
            style={{ flex: 1 }}
          >
            {identity.state.kind === "authenticating" ? "جاري التحقق…" : "تسجيل الدخول"}
          </CpButton>
          <CpButton
            onClick={() => devBypassLogin("operator")}
            style={{ flex: 1 }}
          >
            تجاوز تسجيل الدخول (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && <p role="alert">{identity.state.message}</p>}
      </section>
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="اعتماد كتالوجات المتاجر" />}
      stateView={
        controller.state.kind === "loading" ? <p>جاري تحميل طلبات الاعتماد…</p>
          : controller.state.kind === "empty" ? <p>لا توجد طلبات اعتماد معلقة.</p>
          : controller.state.kind === "error" ? <p role="alert">{controller.state.message}</p>
          : controller.state.kind === "permission_denied" ? <p role="alert">لا تملك الصلاحية.</p>
          : undefined
      }
    >
      {controller.state.kind === "success" ? (
        <section style={{ display: "grid", gap: "1rem" }}>
          {controller.state.submissions.map((submission) => (
            <article
              key={submission.id}
              style={{
                display: "grid",
                gap: "0.75rem",
                padding: "1rem",
                border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
                borderRadius: "1rem",
              }}
            >
              <strong>{submission.storeId} — النسخة {submission.revision}</strong>
              <span>الحالة: {submission.status}</span>
              <CpTextInput
                value={reasonByStore[submission.storeId] ?? ""}
                onChange={(value) => setReasonByStore((current) => ({ ...current, [submission.storeId]: value }))}
                placeholder="سبب قرار الاعتماد"
                aria-label={`سبب قرار ${submission.storeId}`}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <CpButton
                  disabled={(reasonByStore[submission.storeId] ?? "").trim().length < 3 || controller.action === "submitting"}
                  onClick={() => void controller.decide({
                    storeId: submission.storeId,
                    decision: "approved",
                    reason: (reasonByStore[submission.storeId] ?? "").trim(),
                  })}
                >
                  اعتماد
                </CpButton>
                <CpButton
                  disabled={(reasonByStore[submission.storeId] ?? "").trim().length < 3 || controller.action === "submitting"}
                  onClick={() => void controller.decide({
                    storeId: submission.storeId,
                    decision: "rejected",
                    reason: (reasonByStore[submission.storeId] ?? "").trim(),
                  })}
                >
                  رفض
                </CpButton>
              </div>
            </article>
          ))}
        </section>
      ) : <></>}
    </DataTablePageFrame>
  );
}
