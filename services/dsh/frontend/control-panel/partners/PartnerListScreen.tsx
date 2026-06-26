"use client";

import { statusScale, neutralScale } from "@bthwani/ui-kit";
import {
  CpButton,
  CpFilterBar,
  CpPageHeader,
  CpRetryButton,
  CpSelect,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame, PaginationToolbar } from "@bthwani/control-panel/shell";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  usePartnerAdminController,
  getDshPartnerActivationStatusLabel,
} from "../../shared/partner";

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

const TONE_COLOR: Record<string, string> = {
  success: statusScale.success,
  danger: statusScale.danger,
  warning: statusScale.warning,
  info: statusScale.info,
};

function statusBadgeStyle(tone: string): React.CSSProperties {
  const color = TONE_COLOR[tone] ?? neutralScale[500];
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    whiteSpace: "nowrap",
  };
}

type Props = {
  readonly onSelectPartner?: (partnerId: string) => void;
  readonly onCreatePartner?: () => void;
};

export function PartnerListScreen({ onSelectPartner, onCreatePartner }: Props) {
  const identity = useIdentitySession();
  const c = usePartnerAdminController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <CpStatePanel role="alert" title="يجب تسجيل الدخول للوصول لقسم الشركاء." />
    );
  }

  const stateView =
    c.listState.kind === "loading" ? (
      <CpStatePanel role="status" title="جاري تحميل الشركاء…" />
    ) : c.listState.kind === "empty" ? (
      <CpStatePanel
        role="status"
        title="لا يوجد شركاء مطابقون"
        description="جرّب تغيير الفلتر أو البحث بكلمة مختلفة."
      />
    ) : c.listState.kind === "error" ? (
      <CpStatePanel role="alert" title="تعذر تحميل الشركاء" code={c.listState.message}>
        <CpRetryButton onClick={c.retry}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    ) : undefined;

  return (
    <DataTablePageFrame
      header={
        <CpPageHeader title="إدارة الشركاء">
          {c.total > 0 ? (
            <span style={{ fontSize: "0.8rem", color: neutralScale[500] }}>
              {c.total} شريك
            </span>
          ) : null}
          {onCreatePartner ? (
            <CpButton onClick={onCreatePartner}>+ إضافة شريك</CpButton>
          ) : null}
        </CpPageHeader>
      }
      filters={
        <CpFilterBar label="فلاتر الشركاء">
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
        </CpFilterBar>
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
      stateView={stateView}
    >
      <CpTable aria-label="قائمة الشركاء">
        <thead>
          <tr>
            <CpTableHeaderCell>اسم الشريك</CpTableHeaderCell>
            <CpTableHeaderCell>الفئة</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            <CpTableHeaderCell>الإجراء التالي</CpTableHeaderCell>
            <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {c.rows.map((row) => (
            <tr key={row.id}>
              <CpTableCell>
                <div style={{ fontWeight: 600 }}>{row.displayName}</div>
                <div style={{ fontSize: "0.75rem", color: neutralScale[500] }}>{row.legalNameAr}</div>
              </CpTableCell>
              <CpTableCell>{row.category}</CpTableCell>
              <CpTableCell>
                <span style={statusBadgeStyle(row.statusTone)}>{row.statusLabel}</span>
              </CpTableCell>
              <CpTableCell>
                <span style={{ color: neutralScale[500], fontSize: "0.75rem" }}>{row.nextAction}</span>
              </CpTableCell>
              <CpTableCell>
                <CpButton onClick={() => onSelectPartner?.(row.id)}>عرض التفاصيل</CpButton>
              </CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </DataTablePageFrame>
  );
}
