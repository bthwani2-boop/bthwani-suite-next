"use client";

import { useState, type CSSProperties } from "react";
import { CpButton, CpPageHeader, CpTextInput } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useCatalogApprovalController } from "../../shared/catalog";

const listSectionStyle: CSSProperties = { display: "grid", gap: "1rem" };
const submissionCardStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "1rem",
};
const decisionButtonRowStyle: CSSProperties = { display: "flex", gap: "0.75rem" };

export function CatalogApprovalScreen() {
  const controller = useCatalogApprovalController("authenticated");
  const [reasonByStore, setReasonByStore] = useState<Record<string, string>>({});

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
        <section style={listSectionStyle}>
          {controller.state.submissions.map((submission) => (
            <article key={submission.id} style={submissionCardStyle}>
              <strong>{submission.storeId} — النسخة {submission.revision}</strong>
              <span>الحالة: {submission.status}</span>
              <CpTextInput
                value={reasonByStore[submission.storeId] ?? ""}
                onChange={(value) => setReasonByStore((current) => ({ ...current, [submission.storeId]: value }))}
                placeholder="سبب قرار الاعتماد"
                aria-label={`سبب قرار ${submission.storeId}`}
              />
              <div style={decisionButtonRowStyle}>
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
