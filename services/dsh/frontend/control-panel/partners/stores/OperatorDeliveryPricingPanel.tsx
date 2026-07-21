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
  useOperatorDeliveryPricingController,
  type DeliveryPricingRecord,
} from "../../../shared/partner";

export type OperatorDeliveryPricingPanelProps = {
  readonly storeId: string;
};

type Draft = {
  readonly feeYer: string;
  readonly status: DeliveryPricingRecord["status"];
  readonly reason: string;
};

const MODE_LABEL: Record<DeliveryPricingRecord["fulfillmentMode"], string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

export function OperatorDeliveryPricingPanel({ storeId }: OperatorDeliveryPricingPanelProps) {
  const controller = useOperatorDeliveryPricingController(storeId);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});

  React.useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const record of controller.records) {
      next[record.fulfillmentMode] = {
        feeYer: String(record.feeMinorUnits / 100),
        status: record.status,
        reason: "",
      };
    }
    setDrafts(next);
  }, [controller.records]);

  const patchDraft = (mode: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [mode]: {
        feeYer: current[mode]?.feeYer ?? "0",
        status: current[mode]?.status ?? "paused",
        reason: current[mode]?.reason ?? "",
        ...patch,
      },
    }));
  };

  const save = async (record: DeliveryPricingRecord) => {
    const draft = drafts[record.fulfillmentMode];
    if (!draft?.reason.trim()) return;
    const fee = Number(draft.feeYer);
    if (!Number.isFinite(fee) || fee < 0) return;
    const succeeded = await controller.save(record, {
      feeMinorUnits: Math.round(fee * 100),
      currency: "YER",
      status: draft.status,
      reason: draft.reason.trim(),
    });
    if (succeeded) patchDraft(record.fulfillmentMode, { reason: "" });
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
  if (controller.state.kind === "empty") {
    return <CpStatePanel role="status" title="لا توجد سياسات تسعير لهذا المتجر." />;
  }

  return (
    <section dir="rtl" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0, color: colorRoles.brandStructure }}>تسعير تنفيذ الطلب</h2>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.68 }}>
          هذه القيم هي المصدر الذي يستخدمه DSH في checkout قبل إرسال الإجمالي إلى WLT. كل تغيير يحتاج سببًا ويُسجل بإصدار جديد.
        </p>
      </div>

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
          {controller.records.map((record) => {
            const draft = drafts[record.fulfillmentMode];
            return (
              <tr key={record.fulfillmentMode}>
                <CpTableCell>{MODE_LABEL[record.fulfillmentMode]}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={draft?.feeYer ?? String(record.feeMinorUnits / 100)}
                    onChange={(value) => patchDraft(record.fulfillmentMode, { feeYer: value })}
                    aria-label={`رسم ${MODE_LABEL[record.fulfillmentMode]}`}
                    disabled={record.fulfillmentMode === "pickup"}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpSelect
                    value={draft?.status ?? record.status}
                    onChange={(value) => patchDraft(record.fulfillmentMode, { status: value as DeliveryPricingRecord["status"] })}
                    options={[
                      { value: "active", label: "نشط" },
                      { value: "paused", label: "موقوف" },
                      { value: "archived", label: "مؤرشف" },
                    ]}
                  />
                </CpTableCell>
                <CpTableCell>{record.pricingSource}</CpTableCell>
                <CpTableCell>{record.version}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={draft?.reason ?? ""}
                    onChange={(value) => patchDraft(record.fulfillmentMode, { reason: value })}
                    placeholder="السبب إلزامي"
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton
                    disabled={controller.mutationLoading || !draft?.reason.trim()}
                    onClick={() => void save(record)}
                  >
                    {controller.mutationLoading ? "جاري الحفظ…" : "حفظ"}
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
