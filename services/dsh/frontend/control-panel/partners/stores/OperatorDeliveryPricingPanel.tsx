"use client";

import React from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  minorUnitsToWltMajorInput,
  parseWltMajorInputToMinorUnits,
} from "@bthwani/dsh/finance";
import {
  CpButton,
  CpRetryButton,
  CpSelect,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  findDeliveryPricing,
  useOperatorDeliveryPricingController,
  type DeliveryPricingMode,
  type DeliveryPricingFulfillmentMode,
  type DeliveryPricingRecord,
} from "../../../shared/partner/operator-delivery-pricing.public";
import { OperatorPartnerFleetPanel } from "./OperatorPartnerFleetPanel";

export type OperatorDeliveryPricingPanelProps = {
  readonly storeId: string;
};

type Draft = {
  readonly pricingMode: DeliveryPricingMode;
  readonly feeYer: string;
  readonly status: DeliveryPricingRecord["status"];
  readonly reason: string;
};

const MODES: readonly DeliveryPricingFulfillmentMode[] = ["bthwani_delivery", "partner_delivery", "pickup"];

const MODE_LABEL: Record<DeliveryPricingFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

export function OperatorDeliveryPricingPanel({ storeId }: OperatorDeliveryPricingPanelProps) {
  const controller = useOperatorDeliveryPricingController(storeId);
  const [drafts, setDrafts] = React.useState<Record<DeliveryPricingFulfillmentMode, Draft>>({
    bthwani_delivery: { pricingMode: "bthwani_pricing", feeYer: "0", status: "paused", reason: "" },
    partner_delivery: { pricingMode: "partner_fixed_pricing", feeYer: "0", status: "paused", reason: "" },
    pickup: { pricingMode: "free_delivery", feeYer: "0", status: "active", reason: "" },
  });

  React.useEffect(() => {
    const next = {} as Record<DeliveryPricingFulfillmentMode, Draft>;
    for (const mode of MODES) {
      const record = findDeliveryPricing(controller.records, mode);
      next[mode] = {
        pricingMode: record?.pricingMode ?? (mode === "pickup" ? "free_delivery" : (mode === "bthwani_delivery" ? "bthwani_pricing" : "partner_fixed_pricing")),
        feeYer: mode === "pickup"
          ? "0"
          : minorUnitsToWltMajorInput(record?.feeMinorUnits ?? 0, record?.currency ?? "YER"),
        status: record?.status ?? (mode === "pickup" ? "active" : "paused"),
        reason: "",
      };
    }
    setDrafts(next);
  }, [controller.records]);

  const patchDraft = (mode: DeliveryPricingFulfillmentMode, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [mode]: { ...current[mode], ...patch },
    }));
  };

  const save = async (mode: DeliveryPricingFulfillmentMode) => {
    const record = findDeliveryPricing(controller.records, mode);
    const draft = drafts[mode];
    if (!draft.reason.trim()) return;
    const fee = (mode === "pickup" || draft.pricingMode === "free_delivery")
      ? { ok: true as const, minorUnits: 0 }
      : parseWltMajorInputToMinorUnits(draft.feeYer, record?.currency ?? "YER");
    if (!fee.ok || fee.minorUnits < 0) return;
    const succeeded = await controller.save(record, {
      pricingMode: draft.pricingMode,
      feeMinorUnits: fee.minorUnits,
      currency: "YER",
      pricingConfig: "{}",
      status: !record && draft.status === "archived" ? "paused" : draft.status,
      reason: draft.reason.trim(),
    }, mode);
    if (succeeded) patchDraft(mode, { reason: "" });
  };

  if (controller.state.kind === "loading") {
    return <CpStateView kind="loading" title="جاري تحميل سياسات تسعير التوصيل…" />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل تسعير التوصيل" code={controller.state.message}>
        <CpRetryButton onClick={() => void controller.reload()}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    );
  }

  return (
    <section dir="rtl" style={{ display: "grid", gap: "2rem" }}>
      <section style={{ display: "grid", gap: "1rem" }} aria-label="تسعير تنفيذ الطلب">
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
              <CpTableHeaderCell>نوع التسعير</CpTableHeaderCell>
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
              const pricingModeOptions = [
                { value: "free_delivery", label: "مجاني" },
                { value: "bthwani_pricing", label: "تسعير بثواني" },
                { value: "partner_fixed_pricing", label: "مبلغ ثابت للمتجر" },
                { value: "zone_pricing", label: "تسعير مناطقي" },
              ];
              return (
                <tr key={mode}>
                  <CpTableCell>{MODE_LABEL[mode]}</CpTableCell>
                  <CpTableCell>
                    <CpSelect
                      value={draft.pricingMode}
                      onChange={(value) => patchDraft(mode, { pricingMode: value as DeliveryPricingMode })}
                      options={pricingModeOptions}
                    />
                  </CpTableCell>
                  <CpTableCell>
                    <CpTextInput
                      value={draft.pricingMode === "free_delivery" ? "0" : draft.feeYer}
                      onChange={(value) => patchDraft(mode, { feeYer: value })}
                      aria-label={`رسم ${MODE_LABEL[mode]}`}
                      disabled={mode === "pickup" || draft.pricingMode === "free_delivery"}
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

      <OperatorPartnerFleetPanel storeId={storeId} />
    </section>
  );
}
