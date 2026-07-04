"use client";
import { colorRoles } from "@bthwani/ui-kit";
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

const STATUS_LABEL: Record<PartnerOfferRecord["status"], string> = {
  inbound: "وارد من الشريك",
  review: "قيد التدقيق",
  "marketing-ready": "جاهز للتسويق",
  published: "معتمد ومنشور",
  paused: "موقوف",
  rejected: "مرفوض",
  archived: "مؤرشف",
  expired: "منتهي",
  exhausted: "مستنفد",
};

export function PartnerOffersCommandDeck() {
  const controller = usePartnerOffersController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (controller.draft.status === "rejected" && !controller.draft.rejectionReason?.trim()) {
      setErrorMsg("سبب الرفض مطلوب قبل حفظ عرض مرفوض.");
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
    <div style={{ padding: "1.5rem" }} dir="rtl">
      <div style={{ display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: colorRoles.brandAction, fontSize: "1.15rem" }}>مراجعة عروض الشركاء</h3>
          </div>

          {controller.errorMessage && (
            <div style={{ color: colorRoles.brandAction, marginBottom: "0.75rem", fontSize: "0.8rem" }}>
              {controller.errorMessage}
            </div>
          )}

          {controller.items.length === 0 ? (
            <CpEmptyTableMessage>لا توجد عروض واردة من الشركاء حالياً.</CpEmptyTableMessage>
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
                      <span style={{ opacity: o.status === "published" ? 1 : 0.6 }}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <CpButton onClick={() => controller.select(o)}>مراجعة</CpButton>
                        {(o.status === "inbound" || o.status === "review" || o.status === "published") && (
                          <CpButton onClick={() => controller.toggleStatus(o.id)}>
                            {o.status === "published" ? "إيقاف" : o.status === "review" ? "اعتماد ونشر" : "بدء المراجعة"}
                          </CpButton>
                        )}
                        <CpButton onClick={() => controller.remove(o.id)} style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}>أرشفة</CpButton>
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
            <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>مراجعة عرض شريك</h4>

            {errorMsg && (
              <div style={{ color: colorRoles.brandAction, background: colorRoles.surfaceBase, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان العرض الترويجي</label>
              <CpTextInput
                value={controller.draft.title}
                onChange={(v) => updateDraft("title", v)}
              />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>قيمة العرض</label>
              <CpTextInput
                value={controller.draft.valueLabel}
                onChange={(v) => updateDraft("valueLabel", v)}
              />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شروط الأهلية</label>
              <CpTextInput
                value={controller.draft.eligibility}
                onChange={(v) => updateDraft("eligibility", v)}
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
                  { value: "marketing-ready", label: "جاهز للتسويق" },
                  { value: "published", label: "معتمد ومنشور للعملاء" },
                  { value: "paused", label: "موقوف مؤقتاً" },
                  { value: "rejected", label: "مرفوض" },
                ]}
              />

              {controller.draft.status === "rejected" && (
                <>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>سبب الرفض</label>
                  <CpTextInput
                    value={controller.draft.rejectionReason || ""}
                    onChange={(v) => updateDraft("rejectionReason", v)}
                    placeholder="سبب الرفض مطلوب..."
                  />
                </>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <CpButton onClick={handleSave} style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}>حفظ القرار</CpButton>
                <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
