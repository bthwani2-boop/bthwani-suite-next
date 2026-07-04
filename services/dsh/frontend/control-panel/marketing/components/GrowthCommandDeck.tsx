"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React, { useState } from "react";
import {
  CpButton,
  CpTextInput,
  CpSelect,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpEmptyTableMessage,
} from "@bthwani/control-panel/components";
import { useGrowthController } from "../../../shared/marketing";
import type { MarketingGrowthRecord } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function GrowthCommandDeck() {
  const controller = useGrowthController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.title.trim() || !controller.draft.metricValue.trim()) {
      setErrorMsg("العنوان وقيمة المؤشر هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingGrowthRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>تحليلات النمو الرقمي وإحالات الأصدقاء (Growth)</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة مبادرة نمو</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد مبادرات نمو مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>مبادرة النمو</CpTableHeaderCell>
                <CpTableHeaderCell>عائلة المبادرة</CpTableHeaderCell>
                <CpTableHeaderCell>مؤشر الأداء (Metric)</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات / النقرات</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>
                    <strong>{item.title}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{item.subtitle}</div>
                  </CpTableCell>
                  <CpTableCell>{item.family === "promotion" ? "إحالة وأكواد" : "حملة تشغيلية"}</CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: colorRoles.brandAction }}>{item.metricValue}</CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>{item.status === "published" ? "نشطة" : "مسودة"}</CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(item.id)} disabled={!controller.isBackedByApi}>
                        {item.status === "published" ? "تعطيل" : "تنشيط"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(item.id)} disabled={!controller.isBackedByApi} style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && controller.draft && (
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
            {controller.selected.id ? "تعديل مبادرة نمو" : "إضافة مبادرة نمو جديدة"}
          </h4>

          {errorMsg && (
            <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان المبادرة</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="مثال: حملة إحالات نهاية الأسبوع"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الوصف التفصيلي</label>
            <CpTextInput
              value={controller.draft.subtitle}
              onChange={(v) => updateDraft("subtitle", v)}
              placeholder="تفاصيل الحوافز والجوائز..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع العائلة للنمو</label>
            <CpSelect
              value={controller.draft.family}
              onChange={(v) => updateDraft("family", v)}
              options={[
                { value: "promotion", label: "أكواد خصم وإحالات" },
                { value: "campaign", label: "حملة إعلانية رقمية" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>قيمة المؤشر / الهدف المالي</label>
            <CpTextInput
              value={controller.draft.metricValue}
              onChange={(v) => updateDraft("metricValue", v)}
              placeholder="مثال: +15% معدل تحويل العملاء"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة المبادرة</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة تحت الإعداد" },
                { value: "published", label: "نشطة ومنشورة" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}>حفظ التعديلات</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
