"use client";

import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpSelect,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame, PaginationToolbar } from "@bthwani/control-panel/shell";
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";
import { usePartnerWorkspaceListController } from "../../shared/partner";

const STATUS_OPTIONS = [
  { value: "", label: "جميع الحالات" },
  { value: "draft", label: "مسودة" },
  { value: "submitted", label: "مُرسَل للمراجعة" },
  { value: "documents_missing", label: "وثائق ناقصة" },
  { value: "documents_uploaded", label: "وثائق مرفوعة" },
  { value: "documents_verified", label: "وثائق معتمدة" },
  { value: "catalog_not_ready", label: "كتالوج غير جاهز" },
  { value: "catalog_ready", label: "كتالوج جاهز" },
  { value: "delivery_modes_not_ready", label: "أنماط التوصيل غير جاهزة" },
  { value: "delivery_modes_ready", label: "أنماط التوصيل جاهزة" },
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
  { value: "default", label: "أخرى" },
];

function toBadgeTone(tone: "success" | "warning" | "danger" | "info" | "muted"): CpBadgeTone {
  return tone === "muted" ? "neutral" : tone;
}

type Props = {
  readonly onSelectPartner?: (partnerId: string) => void;
  readonly onCreatePartner?: () => void;
};

export function PartnerListScreen({ onSelectPartner, onCreatePartner }: Props) {
  const { state: sessionState } = useControlPanelSession();
  const controller = usePartnerWorkspaceListController(sessionState.kind);

  const stateView =
    sessionState.kind !== "authenticated" ? (
      <CpStatePanel role="alert" title="جلسة مصادق عليها مطلوبة" description="يجب استعادة جلسة المشغل قبل قراءة الشركاء." />
    ) : controller.listState.kind === "loading" || controller.listState.kind === "idle" ? (
      <CpStatePanel role="status" title="جاري تحميل الشركاء…" />
    ) : controller.listState.kind === "offline" ? (
      <CpStatePanel role="alert" title="DSH غير متاح حاليًا">
        <CpRetryButton onClick={controller.retry}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    ) : controller.listState.kind === "empty" ? (
      <CpStatePanel role="status" title="لا يوجد شركاء مطابقون" description="جرّب تغيير الحالة أو الفئة." />
    ) : controller.listState.kind === "error" ? (
      <CpStatePanel role="alert" title="تعذر تحميل الشركاء" code={controller.listState.message}>
        <CpRetryButton onClick={controller.retry}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    ) : undefined;

  const start = controller.total === 0 ? 0 : controller.page * controller.pageSize + 1;
  const end = Math.min((controller.page + 1) * controller.pageSize, controller.total);

  return (
    <DataTablePageFrame
      header={
        <CpPageHeader title="إدارة الشركاء">
          {controller.total > 0 ? <CpMutedInline>{controller.total} شريك</CpMutedInline> : null}
          {onCreatePartner ? <CpButton onClick={onCreatePartner}>+ إضافة شريك</CpButton> : null}
        </CpPageHeader>
      }
      filters={
        <CpFilterBar label="فلاتر الشركاء">
          <CpSelect
            value={controller.filters.status}
            onChange={(status) => controller.setFilters({ ...controller.filters, status })}
            options={STATUS_OPTIONS}
            aria-label="فلتر الحالة"
          />
          <CpSelect
            value={controller.filters.category}
            onChange={(category) => controller.setFilters({ ...controller.filters, category })}
            options={CATEGORY_OPTIONS}
            aria-label="فلتر الفئة"
          />
        </CpFilterBar>
      }
      toolbar={
        <PaginationToolbar
          label={`${start}–${end} من ${controller.total}`}
          hasPrev={controller.hasPrevPage}
          hasNext={controller.hasNextPage}
          onPrev={controller.prevPage}
          onNext={controller.nextPage}
          onRetry={controller.retry}
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
          {controller.rows.map((row) => (
            <tr key={row.id}>
              <CpTableCell>{row.name}</CpTableCell>
              <CpTableCell>{row.category}</CpTableCell>
              <CpTableCell><CpBadge tone={toBadgeTone(row.statusTone)}>{row.statusLabel}</CpBadge></CpTableCell>
              <CpTableCell>{row.nextActionLabel}</CpTableCell>
              <CpTableCell>
                {onSelectPartner ? <CpButton variant="secondary" onClick={() => onSelectPartner(row.id)}>فتح</CpButton> : null}
              </CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </DataTablePageFrame>
  );
}

export default PartnerListScreen;
