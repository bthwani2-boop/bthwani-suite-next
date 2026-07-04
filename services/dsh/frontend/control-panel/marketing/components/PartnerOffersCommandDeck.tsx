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
import { usePartnerOffersController } from "../../../shared/marketing";
import type { PartnerOfferRecord } from "../../../shared/partner/dsh-partner-offer-types";
import { NotBackedNotice } from "./NotBackedNotice";

export function PartnerOffersCommandDeck() {
  const controller = usePartnerOffersController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.partnerName.trim() || !controller.draft.title.trim()) {
      setErrorMsg("اسم الشريك وعنوان العرض الترويجي هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof PartnerOfferRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>عروض الشركاء وتجاوزات الهوامش الترويجية</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة عرض جديد</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد عروض مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>الشريك</CpTableHeaderCell>
                <CpTableHeaderCell>العرض المقترح</CpTableHeaderCell>
                <CpTableHeaderCell>نوع التفعيل</CpTableHeaderCell>
                <CpTableHeaderCell>هامش المخاطرة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((o) => (
                <tr key={o.id}>
                  <CpTableCell>
                    <strong>{o.partnerName}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{o.storeLabel}</div>
                  </CpTableCell>
                  <CpTableCell>{o.title}</CpTableCell>
                  <CpTableCell>{o.offerType === "free-delivery" ? "توصيل مجاني" : "خصم مباشر"}</CpTableCell>
                  <CpTableCell style={{ color: o.marginRiskNote ? colorRoles.brandAction : "inherit" }}>
                    {o.marginRiskNote || "آمن"}
                  </CpTableCell>
                  <CpTableCell>
                    <span style={{ color: o.status === "published" ? colorRoles.brandStructure : o.status === "review" ? colorRoles.brandAction : colorRoles.brandStructure, opacity: o.status === "published" ? 1 : 0.6 }}>
                      {o.status === "published" ? "معتمد ومنشور" : o.status === "review" ? "تحت التدقيق" : "موقوف"}
                    </span>
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(o)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(o.id)} disabled={!controller.isBackedByApi}>
                        {o.status === "published" ? "إيقاف" : "اعتماد وتفعيل"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(o.id)} disabled={!controller.isBackedByApi} style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}>حذف</CpButton>
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
            {controller.selected.id ? "تعديل عرض شريك" : "إضافة عرض شريك جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم الشريك</label>
            <CpTextInput
              value={controller.draft.partnerName}
              onChange={(v) => updateDraft("partnerName", v)}
              placeholder="مثال: مطعم الفخامة"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم المتجر والفرع</label>
            <CpTextInput
              value={controller.draft.storeLabel}
              onChange={(v) => updateDraft("storeLabel", v)}
              placeholder="مثال: متجر السليمانية"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان العرض الترويجي</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="خصم 20% على المأكولات..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع العرض</label>
            <CpSelect
              value={controller.draft.offerType}
              onChange={(v) => updateDraft("offerType", v)}
              options={[
                { value: "discount", label: "خصم مباشر (نسبة مئوية)" },
                { value: "free-delivery", label: "توصيل مجاني للطلبات" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شرح هامش المخاطرة</label>
            <CpTextInput
              value={controller.draft.marginRiskNote || ""}
              onChange={(v) => updateDraft("marginRiskNote", v)}
              placeholder="هامش ربح آمن، يتطلب مراجعة، إلخ..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة الاعتماد</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "review", label: "قيد التدقيق والمراجعة" },
                { value: "published", label: "معتمد ومنشور للعملاء" },
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
