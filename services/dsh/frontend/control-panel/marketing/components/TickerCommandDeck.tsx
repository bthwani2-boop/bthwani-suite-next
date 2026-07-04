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
import { useTickersController } from "../../../shared/marketing";
import type { MarketingNewsTickerItem } from "../../../shared/marketing";
import { NotBackedNotice } from "./NotBackedNotice";

export function TickerCommandDeck() {
  const controller = useTickersController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.message.trim()) {
      setErrorMsg("الرسالة مطلوبة لتسجيل الشريط الترويجي.");
      return;
    }
    // Conflict resolution check: Duplicate published message
    if (controller.draft.status === "published") {
      const isDuplicate = controller.items.some(
        (item) => item.id !== controller.draft?.id && item.message.trim() === controller.draft?.message.trim() && item.status === "published"
      );
      if (isDuplicate) {
        setErrorMsg("يوجد شريط إعلاني نشط بنفس الرسالة تماماً. يرجى تعديل المحتوى أو إيقاف الشريط الآخر.");
        return;
      }
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingNewsTickerItem, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>إدارة شريط الإعلانات والأخبار (News Tickers)</h3>
          <CpButton onClick={() => controller.select(null)}>إضافة شريط جديد</CpButton>
        </div>

        {controller.errorMessage && <NotBackedNotice reason={controller.errorMessage} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا يوجد أشرطة إعلانية مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>الرسالة</CpTableHeaderCell>
                <CpTableHeaderCell>الفئة المستهدفة</CpTableHeaderCell>
                <CpTableHeaderCell>النوع</CpTableHeaderCell>
                <CpTableHeaderCell>الأولوية</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات</CpTableHeaderCell>
                <CpTableHeaderCell>تثبيت</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell style={{ maxWidth: "16rem", whiteSpace: "normal" }}>{item.message}</CpTableCell>
                  <CpTableCell>{item.audience === "all" ? "الجميع" : item.audience === "client" ? "العملاء" : "الشركاء"}</CpTableCell>
                  <CpTableCell>{item.kind === "alert" ? "تنبيه" : item.kind === "news" ? "أخبار" : "عرض ترويجي"}</CpTableCell>
                  <CpTableCell style={{ color: item.priority === "critical" ? colorRoles.brandAction : "inherit" }}>
                    {item.priority === "critical" ? "حرج" : item.priority === "high" ? "مرتفع" : "عادي"}
                  </CpTableCell>
                  <CpTableCell>
                    <span style={{ color: item.status === "published" ? colorRoles.brandStructure : colorRoles.brandStructure, opacity: item.status === "published" ? 1 : 0.6 }}>
                      {item.status === "published" ? "نشط" : "موقوف"}
                    </span>
                  </CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>
                    <CpButton onClick={() => controller.togglePinned(item.id)} disabled={!controller.isBackedByApi} style={{ padding: "0.2rem 0.5rem" }}>
                      {item.pinned ? "📌 مثبت" : "ثبت"}
                    </CpButton>
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)}>تعديل</CpButton>
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
            {controller.selected.id ? "تعديل شريط إعلاني" : "إضافة شريط إعلاني جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نص الرسالة</label>
            <CpTextInput
              value={controller.draft.message}
              onChange={(v) => updateDraft("message", v)}
              placeholder="اكتب نص الإعلان هنا..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع التنبيه</label>
            <CpSelect
              value={controller.draft.kind}
              onChange={(v) => updateDraft("kind", v)}
              options={[
                { value: "news", label: "أخبار وعام" },
                { value: "alert", label: "تنبيه هام" },
                { value: "promo", label: "عرض ترويجي" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الفئة المستهدفة</label>
            <CpSelect
              value={controller.draft.audience}
              onChange={(v) => updateDraft("audience", v)}
              options={[
                { value: "all", label: "الجميع" },
                { value: "client", label: "العملاء" },
                { value: "partner", label: "الشركاء" },
                { value: "captain", label: "الكباتن" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الأولوية</label>
            <CpSelect
              value={controller.draft.priority}
              onChange={(v) => updateDraft("priority", v)}
              options={[
                { value: "low", label: "منخفضة" },
                { value: "normal", label: "عادية" },
                { value: "high", label: "مرتفعة" },
                { value: "critical", label: "حرجة" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نمط التسليم</label>
            <CpSelect
              value={controller.draft.deliveryMode}
              onChange={(v) => updateDraft("deliveryMode", v)}
              options={[
                { value: "scroll", label: "شريط متحرك علوي" },
                { value: "toast", label: "إشعار منبثق فوري" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة النشر</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة غير مفعلة" },
                { value: "published", label: "نشط ومنشور حالياً" },
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
