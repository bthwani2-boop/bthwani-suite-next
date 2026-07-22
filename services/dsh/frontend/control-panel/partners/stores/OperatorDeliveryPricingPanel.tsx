"use client";

import React from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  CpButton,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
  CpSelect,
} from "@bthwani/control-panel/components";
import {
  findDeliveryPricing,
  useOperatorDeliveryPricingController,
  type DeliveryPricingMode,
  type DeliveryPricingRecord,
} from "../../../shared/partner/operator-delivery-pricing.public";

export type OperatorDeliveryPricingPanelProps = {
  readonly storeId: string;
};

type Draft = {
  readonly feeYer: string;
  readonly status: DeliveryPricingRecord["status"];
  readonly reason: string;
};

const MODES: readonly DeliveryPricingMode[] = ["bthwani_delivery", "partner_delivery", "pickup"];

const MODE_LABEL: Record<DeliveryPricingMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

export function OperatorDeliveryPricingPanel({ storeId }: OperatorDeliveryPricingPanelProps) {
  const controller = useOperatorDeliveryPricingController(storeId);
  const [drafts, setDrafts] = React.useState<Record<DeliveryPricingMode, Draft>>({
    bthwani_delivery: { feeYer: "0", status: "paused", reason: "" },
    partner_delivery: { feeYer: "0", status: "paused", reason: "" },
    pickup: { feeYer: "0", status: "active", reason: "" },
  });

  React.useEffect(() => {
    const next = {} as Record<DeliveryPricingMode, Draft>;
    for (const mode of MODES) {
      const record = findDeliveryPricing(controller.records, mode);
      next[mode] = {
        feeYer: mode === "pickup" ? "0" : String((record?.feeMinorUnits ?? 0) / 100),
        status: record?.status ?? (mode === "pickup" ? "active" : "paused"),
        reason: "",
      };
    }
    setDrafts(next);
  }, [controller.records]);

  const patchDraft = (mode: DeliveryPricingMode, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [mode]: { ...current[mode], ...patch },
    }));
  };

  const save = async (mode: DeliveryPricingMode) => {
    const record = findDeliveryPricing(controller.records, mode);
    const draft = drafts[mode];
    if (!draft.reason.trim()) return;
    const fee = mode === "pickup" ? 0 : Number(draft.feeYer);
    if (!Number.isFinite(fee) || fee < 0) return;
    const succeeded = await controller.save(record, {
      feeMinorUnits: Math.round(fee * 100),
      currency: "YER",
      status: !record && draft.status === "archived" ? "paused" : draft.status,
      reason: draft.reason.trim(),
    }, mode);
    if (succeeded) patchDraft(mode, { reason: "" });
  };

  if (controller.state.kind === "loading") {
    return <CpStatePanel role="status" title="جاري تحميل سياسات تسعير التوصيل…" />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل تسعير التوصيل" code={controller.state.message}>
        <CpRetryButton onClick={() => void controller.reload()}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    );
  }

  return (
    <section dir="rtl" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0, color: colorRoles.brandStructure }}>تسعير تنفيذ الطلب</h2>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.68 }}>
          هذه القيم هي المصدر الذي يستخدمه DSH في checkout قبل إرسال الإجمالي إلى WLT. كل تغيير يحتاج سببًا ويُسجل بإصدار جديد.
        </p>
      </div>

      {controller.state.kind === "empty" ? (
        <CpStatePanel role="status" title="لا توجد سياسات مهيأة. أنشئ السياسة الأولى لكل نمط من الجدول أدناه." />
      ) : null}
      {controller.mutationError ? <p role="alert" style={{ color: colorRoles.danger }}>{controller.mutationError}</p> : null}

      <CpTable aria-label="سياسات تسعير توصيل المتجر">
        <thead>
          <tr>
            <CpTableHeaderCell>النمط</CpTableHeaderCell>
            <CpTableHeaderCell>الرسم ر.ي</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            <CpTableHeaderCell>المصدر</CpTableHeaderCell>
            <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
            <CpTableHeaderCell>سبب التغيير</CpTableHeaderCell>
            <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {MODES.map((mode) => {
            const record = findDeliveryPricing(controller.records, mode);
            const draft = drafts[mode];
            const statusOptions = [
              { value: "active", label: "نشط" },
              { value: "paused", label: "موقوف" },
              ...(record ? [{ value: "archived", label: "مؤرشف" }] : []),
            ];
            return (
              <tr key={mode}>
                <CpTableCell>{MODE_LABEL[mode]}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={draft.feeYer}
                    onChange={(value) => patchDraft(mode, { feeYer: value })}
                    aria-label={`رسم ${MODE_LABEL[mode]}`}
                    disabled={mode === "pickup"}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpSelect
                    value={draft.status}
                    onChange={(value) => patchDraft(mode, { status: value as DeliveryPricingRecord["status"] })}
                    options={statusOptions}
                  />
                </CpTableCell>
                <CpTableCell>{record?.pricingSource ?? "سيُحدد عند الإنشاء"}</CpTableCell>
                <CpTableCell>{record?.version ?? 0}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={draft.reason}
                    onChange={(value) => patchDraft(mode, { reason: value })}
                    placeholder="السبب إلزامي"
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton
                    disabled={controller.mutationLoading || !draft.reason.trim()}
                    onClick={() => void save(mode)}
                  >
                    {controller.mutationLoading ? "جاري الحفظ…" : record ? "حفظ" : "إنشاء"}
                  </CpButton>
                </CpTableCell>
              </tr>
            );
          })}
        </tbody>
      </CpTable>
    </section>
  );
}
