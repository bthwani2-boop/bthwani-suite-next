"use client";

import { CpPageHeader } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import { usePartnerAdminController } from "../../shared/partner";
import { getDshPartnerActivationStatusLabel } from "../../shared/partner";
import type { DshPartnerActivationStatus } from "../../shared/partner";

const STATUS_FILTER_OPTIONS: Array<{ value: DshPartnerActivationStatus | ""; label: string }> = [
  { value: "", label: "الكل" },
  { value: "submitted", label: "مُرسَل للمراجعة" },
  { value: "documents_missing", label: "وثائق ناقصة" },
  { value: "documents_uploaded", label: "وثائق مرفوعة" },
  { value: "ops_review", label: "مراجعة العمليات" },
  { value: "partner_active", label: "نشط" },
  { value: "partner_deactivated", label: "موقوف" },
];

type Props = {
  onOpenPartner: (partnerId: string) => void;
};

export function PartnersReviewQueueScreen({ onOpenPartner }: Props) {
  const identity = useIdentitySession();
  const c = usePartnerAdminController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <section dir="rtl" style={{ maxWidth: "32rem", margin: "4rem auto", padding: "2rem", border: "1px solid var(--dsh-card-border)", borderRadius: "1rem", background: "var(--dsh-card-bg)" }}>
        <h2 style={{ color: "var(--dsh-text-primary)", marginTop: 0 }}>دخول مشغّل الشركاء</h2>
        <button
          onClick={() => devBypassLogin("operator")}
          style={{ padding: "0.75rem 1.5rem", borderRadius: "0.5rem", backgroundColor: "var(--dsh-text-primary)", color: "white", border: "none", cursor: "pointer", fontFamily: "var(--font-arabic)" }}
        >
          تجاوز تسجيل الدخول (مطور)
        </button>
      </section>
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="طابور مراجعة الشركاء" />}
      filters={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", direction: "rtl" }}>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => c.setFilters({ status: opt.value, category: c.filters.category })}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "1rem",
                border: "1px solid",
                borderColor: c.filters.status === opt.value ? "var(--dsh-text-primary)" : "var(--dsh-card-border)",
                backgroundColor: c.filters.status === opt.value ? "var(--dsh-text-primary)" : "transparent",
                color: c.filters.status === opt.value ? "white" : "var(--dsh-text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "var(--font-arabic)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      {c.listState.kind === "loading" && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--dsh-text-muted)" }}>جاري التحميل…</div>
      )}
      {c.listState.kind === "error" && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>
          {c.listState.message}
          <br />
          <button
            onClick={c.retry}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--dsh-card-border)", cursor: "pointer", fontFamily: "var(--font-arabic)" }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {c.listState.kind === "success" && c.rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--dsh-text-muted)" }}>لا توجد نتائج</div>
      )}
      {c.rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid var(--dsh-card-border)` }}>
              {["الاسم التجاري", "رقم الجوال", "الحالة", "الإجراء التالي", "تاريخ الإنشاء", ""].map((h) => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.8125rem", color: "var(--dsh-text-muted)", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: `1px solid var(--dsh-content-bg)` }}>
                <td style={{ padding: "0.875rem 1rem" }}>
                  <div style={{ fontWeight: 600, color: "var(--dsh-text-primary)" }}>{row.displayName}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)" }}>{row.legalNameAr}</div>
                </td>
                <td style={{ padding: "0.875rem 1rem", color: "var(--dsh-text-secondary)" }}>{row.primaryPhone}</td>
                <td style={{ padding: "0.875rem 1rem" }}>
                  <StatusBadge status={row.activationStatus as DshPartnerActivationStatus} />
                </td>
                <td style={{ padding: "0.875rem 1rem", color: "var(--dsh-text-muted)", fontSize: "0.875rem", maxWidth: "16rem" }}>{row.nextAction}</td>
                <td style={{ padding: "0.875rem 1rem", color: "var(--dsh-text-muted)", fontSize: "0.8125rem" }}>
                  {new Date(row.createdAt).toLocaleDateString("ar-SA")}
                </td>
                <td style={{ padding: "0.875rem 1rem" }}>
                  <button
                    onClick={() => onOpenPartner(row.id)}
                    style={{ padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: "1px solid var(--dsh-card-border)", cursor: "pointer", fontSize: "0.875rem", fontFamily: "var(--font-arabic)" }}
                  >
                    فتح
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DataTablePageFrame>
  );
}

function StatusBadge({ status }: { status: DshPartnerActivationStatus }) {
  const tones: Partial<Record<DshPartnerActivationStatus, { bg: string; text: string }>> = {
    draft:                { bg: "var(--dsh-content-bg)",       text: "var(--dsh-text-muted)" },
    submitted:            { bg: "rgba(59,123,255,0.08)",        text: "rgb(29,78,216)" },
    documents_missing:    { bg: "rgba(234,88,12,0.08)",         text: "rgb(194,65,12)" },
    documents_uploaded:   { bg: "rgba(21,128,61,0.08)",         text: "rgb(21,128,61)" },
    documents_verified:   { bg: "rgba(21,128,61,0.08)",         text: "rgb(21,128,61)" },
    ops_review:           { bg: "rgba(161,98,7,0.08)",          text: "rgb(161,98,7)" },
    ops_approved:         { bg: "rgba(21,128,61,0.08)",         text: "rgb(21,128,61)" },
    ops_rejected:         { bg: "rgba(220,38,38,0.08)",         text: "rgb(220,38,38)" },
    partner_active:       { bg: "rgba(21,128,61,0.08)",         text: "rgb(21,128,61)" },
    partner_deactivated:  { bg: "rgba(220,38,38,0.08)",         text: "rgb(220,38,38)" },
    client_visible:       { bg: "rgba(22,101,52,0.08)",         text: "rgb(22,101,52)" },
    client_hidden:        { bg: "var(--dsh-content-bg)",        text: "var(--dsh-text-muted)" },
  };
  const tone = tones[status] ?? { bg: "var(--dsh-content-bg)", text: "var(--dsh-text-muted)" };
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.625rem",
      borderRadius: "1rem",
      backgroundColor: tone.bg,
      color: tone.text,
      fontSize: "0.8125rem",
      fontWeight: 500,
    }}>
      {getDshPartnerActivationStatusLabel(status)}
    </span>
  );
}
