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
import { useVideosController } from "../../../shared/marketing";
import type { MarketingVideoRecord } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function VideoStudioCommandDeck() {
  const controller = useVideosController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.title.trim() || !controller.draft.videoUrl.trim()) {
      setErrorMsg("العنوان ورابط الفيديو هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingVideoRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>استوديو الفيديو ومحتوى الكباتن والشركاء</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة فيديو ترويجي</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا يوجد فيديوهات مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>الناشر</CpTableHeaderCell>
                <CpTableHeaderCell>المدة</CpTableHeaderCell>
                <CpTableHeaderCell>الفئة المستهدفة</CpTableHeaderCell>
                <CpTableHeaderCell>حالة المراجعة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات / النقرات</CpTableHeaderCell>
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
                  <CpTableCell>{item.source === "partner" ? "الشريك" : "التسويق"}</CpTableCell>
                  <CpTableCell>{item.durationSeconds} ثانية</CpTableCell>
                  <CpTableCell>{item.audience === "all" ? "الجميع" : "العمليات"}</CpTableCell>
                  <CpTableCell style={{ color: item.reviewState === "approved" ? colorRoles.brandStructure : colorRoles.brandAction }}>
                    {item.reviewState === "approved" ? "معتمد" : item.reviewState === "pending" ? "بانتظار المراجعة" : "مرفوض"}
                  </CpTableCell>
                  <CpTableCell>{item.status === "published" ? "منشور" : "مسودة"}</CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(item.id)} disabled={!controller.isBackedByApi}>
                        {item.status === "published" ? "إيقاف" : "تنشيط"}
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
            {controller.selected.id ? "تعديل فيديو" : "إضافة فيديو جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان الفيديو</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="اكتب عنواناً جذاباً..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>وصف فرعي</label>
            <CpTextInput
              value={controller.draft.subtitle}
              onChange={(v) => updateDraft("subtitle", v)}
              placeholder="تفاصيل العرض الترويجي..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>رابط ملف الفيديو (.mp4)</label>
            <CpTextInput
              value={controller.draft.videoUrl}
              onChange={(v) => updateDraft("videoUrl", v)}
              placeholder="https://example.com/video.mp4"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>رابط الصورة المصغرة (Poster)</label>
            <CpTextInput
              value={controller.draft.posterUrl}
              onChange={(v) => updateDraft("posterUrl", v)}
              placeholder="https://example.com/poster.jpg"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الفئة المستهدفة</label>
            <CpSelect
              value={controller.draft.audience}
              onChange={(v) => updateDraft("audience", v)}
              options={[
                { value: "all", label: "الجميع (العملاء)" },
                { value: "operations", label: "فريق العمليات فقط" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة المراجعة</label>
            <CpSelect
              value={controller.draft.reviewState}
              onChange={(v) => updateDraft("reviewState", v)}
              options={[
                { value: "pending", label: "قيد المراجعة" },
                { value: "approved", label: "اعتماد وقبول" },
                { value: "rejected", label: "مرفوض" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة النشر</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة غير نشطة" },
                { value: "published", label: "منشور على التطبيق" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}>حفظ الفيديو</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
