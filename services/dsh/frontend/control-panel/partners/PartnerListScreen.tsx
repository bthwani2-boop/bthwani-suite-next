"use client";

import { useState } from "react";
import { statusScale, neutralScale } from "@bthwani/ui-kit";
import { CpButton, CpPageHeader, CpTextInput, CpSelect } from "@bthwani/control-panel/components";
import { DataTablePageFrame, PaginationToolbar } from "@bthwani/control-panel/shell";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  usePartnerAdminController,
  getDshPartnerActivationStatusLabel,
} from "../../shared/partner";
import type { DshPartnerListFilters } from "../../shared/partner";

const STATUS_OPTIONS = [
  { value: "", label: "جميع الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "submitted", label: "مُرسَل للمراجعة" },
  { value: "documents_missing", label: "وثائق ناقصة" },
  { value: "documents_uploaded", label: "وثائق مرفوعة" },
  { value: "documents_verified", label: "وثائق معتمدة" },
  { value: "ops_review", label: "مراجعة العمليات" },
  { value: "ops_approved", label: "معتمد" },
  { value: "ops_rejected", label: "مرفوض" },
  { value: "partner_active", label: "نشط" },
  { value: "partner_deactivated", label: "موقوف" },
  { value: "client_visible", label: "ظاهر للعملاء" },
  { value: "client_hidden", label: "مخفي" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "جميع الفئات" },
  { value: "restaurant", label: "مطعم" },
  { value: "grocery", label: "بقالة" },
  { value: "pharmacy", label: "صيدلية" },
  { value: "bakery", label: "مخبز" },
  { value: "other", label: "أخرى" },
];

type Props = {
  readonly onSelectPartner?: (partnerId: string) => void;
  readonly onCreatePartner?: () => void;
};

export function PartnerListScreen({ onSelectPartner, onCreatePartner }: Props) {
  const identity = useIdentitySession();
  const c = usePartnerAdminController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <div dir="rtl" style={{ padding: "2rem", textAlign: "center" }}>
        <p>يجب تسجيل الدخول للوصول لقسم الشركاء.</p>
      </div>
    );
  }

  const toneColor = (tone: string) => {
    if (tone === "success") return statusScale.success;
    if (tone === "danger") return statusScale.danger;
    if (tone === "warning") return statusScale.warning;
    if (tone === "info") return statusScale.info;
    return neutralScale[500];
  };

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="إدارة الشركاء">
          <span style={{ color: "var(--color-muted)" }}>
            {c.total > 0 ? `${c.total} شريك` : ""}
          </span>
          {onCreatePartner && (
            <CpButton onClick={onCreatePartner}>+ إضافة شريك</CpButton>
          )}
        </CpPageHeader>
      }
      filters={
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }} dir="rtl">
          <CpSelect
            value={c.filters.status}
            onChange={(v) => c.setFilters({ ...c.filters, status: v })}
            options={STATUS_OPTIONS}
            aria-label="فلتر الحالة"
          />
          <CpSelect
            value={c.filters.category}
            onChange={(v) => c.setFilters({ ...c.filters, category: v })}
            options={CATEGORY_OPTIONS}
            aria-label="فلتر الفئة"
          />
        </div>
      }
      toolbar={
        <PaginationToolbar
          label={`${c.page * 50 + 1}–${Math.min((c.page + 1) * 50, c.total)} من ${c.total}`}
          hasPrev={c.hasPrevPage}
          hasNext={c.hasNextPage}
          onPrev={c.prevPage}
          onNext={c.nextPage}
          onRetry={c.retry}
        />
      }
      stateView={
        c.listState.kind === "loading" ? (
          <div dir="rtl" style={{ padding: "2rem", textAlign: "center" }}>جاري التحميل…</div>
        ) : c.listState.kind === "empty" ? (
          <div dir="rtl" style={{ padding: "2rem", textAlign: "center" }}>
            <p>لا يوجد شركاء مطابقون للفلتر الحالي.</p>
          </div>
        ) : c.listState.kind === "error" ? (
          <div dir="rtl" role="alert" style={{ padding: "2rem", textAlign: "center", color: "red" }}>
            <p>{c.listState.message}</p>
            <CpButton onClick={c.retry}>إعادة المحاولة</CpButton>
          </div>
        ) : undefined
      }
    >
      <table dir="rtl" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--color-border, neutralScale[200])" }}>
            <th style={{ padding: "0.75rem", textAlign: "right" }}>اسم الشريك</th>
            <th style={{ padding: "0.75rem", textAlign: "right" }}>الفئة</th>
            <th style={{ padding: "0.75rem", textAlign: "right" }}>الحالة</th>
            <th style={{ padding: "0.75rem", textAlign: "right" }}>الإجراء التالي</th>
            <th style={{ padding: "0.75rem", textAlign: "right" }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {c.rows.map((row) => (
            <tr
              key={row.id}
              style={{ borderBottom: "1px solid var(--color-border, neutralScale[200])" }}
            >
              <td style={{ padding: "0.75rem" }}>
                <div style={{ fontWeight: 600 }}>{row.displayName}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{row.legalNameAr}</div>
              </td>
              <td style={{ padding: "0.75rem" }}>{row.category}</td>
              <td style={{ padding: "0.75rem" }}>
                <span style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: `${toneColor(row.statusTone)}22`,
                  color: toneColor(row.statusTone),
                }}>
                  {row.statusLabel}
                </span>
              </td>
              <td style={{ padding: "0.75rem", color: "var(--color-muted)", fontSize: "0.75rem" }}>
                {row.nextAction}
              </td>
              <td style={{ padding: "0.75rem" }}>
                <CpButton
                  onClick={() => onSelectPartner?.(row.id)}
                  style={{ fontSize: "0.75rem" }}
                >
                  عرض التفاصيل
                </CpButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTablePageFrame>
  );
}
