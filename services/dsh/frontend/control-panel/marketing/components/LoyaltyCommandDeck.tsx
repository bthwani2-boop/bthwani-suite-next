"use client";
import { colorRoles } from "@bthwani/ui-kit";
import React, { useState } from "react";
import {
  CpButton,
  CpTextInput,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpEmptyTableMessage,
  CpKpiStrip,
  CpKpiCard,
} from "@bthwani/control-panel/components";
import {
  useLoyaltyController,
} from "../../../shared/marketing";
import type { LoyaltyTierRecord } from "../../../shared/marketing";

const STATUS_LABEL: Record<LoyaltyTierRecord["status"], string> = {
  draft: "مسودة",
  active: "نشط",
  paused: "موقوف",
  archived: "مؤرشف",
};

export function LoyaltyCommandDeck() {
  const controller = useLoyaltyController("authenticated");

  // ─ Create form ─
  const [nameAr, setNameAr] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("0");
  const [badge, setBadge] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!nameAr.trim() || !minPoints || !discountPercent) {
      setFormError("الاسم بالعربية، الحد الأدنى للنقاط، ونسبة الخصم حقول مطلوبة.");
      return;
    }
    const min = parseInt(minPoints, 10);
    const disc = parseFloat(discountPercent);
    const fdt = parseInt(freeDeliveryThreshold, 10) || 0;
    if (isNaN(min) || min < 0) { setFormError("الحد الأدنى للنقاط يجب أن يكون عدداً صحيحاً غير سالب."); return; }
    if (isNaN(disc) || disc < 0 || disc > 100) { setFormError("نسبة الخصم يجب أن تكون بين 0 و100."); return; }
    setFormError(null);
    controller.create({ nameAr, nameEn: nameAr, minPoints: min, discountPercent: disc, freeDeliveryThreshold: fdt, badge: badge || "⭐" });
    setNameAr(""); setMinPoints(""); setDiscountPercent(""); setFreeDeliveryThreshold("0"); setBadge("");
  };

  return (
    <div style={{ padding: "1.5rem" }} dir="rtl">
      {/* ── KPI Strip ── */}
      <CpKpiStrip>
        <CpKpiCard label="مستويات نشطة"       value={String(controller.summary.activeTiers)} />
        <CpKpiCard label="عملاء مشتركون"     value={controller.summary.totalEnrolledClients.toLocaleString("ar")} />
        <CpKpiCard label="نقاط مُصدَرة (الشهر)" value={controller.summary.pointsIssuedThisMonth.toLocaleString("ar")} />
      </CpKpiStrip>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }}>

        {/* ── Tiers table ── */}
        <div>
          <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction, fontSize: "1.15rem" }}>
            مستويات برنامج الولاء
          </h3>

          {controller.tiers.length === 0 ? (
            <CpEmptyTableMessage>لا توجد مستويات ولاء محددة حالياً.</CpEmptyTableMessage>
          ) : (
            <CpTable>
              <thead>
                <tr>
                  <CpTableHeaderCell>الشارة</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم</CpTableHeaderCell>
                  <CpTableHeaderCell>الحد الأدنى (نقطة)</CpTableHeaderCell>
                  <CpTableHeaderCell>الخصم</CpTableHeaderCell>
                  <CpTableHeaderCell>توصيل مجاني فوق</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>العمليات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {controller.tiers.map((tier) => (
                  <tr key={tier.id}>
                    <CpTableCell>{tier.badge}</CpTableCell>
                    <CpTableCell><strong>{tier.nameAr}</strong></CpTableCell>
                    <CpTableCell>{tier.minPoints.toLocaleString("ar")}</CpTableCell>
                    <CpTableCell>{tier.discountPercent}%</CpTableCell>
                    <CpTableCell>
                      {tier.freeDeliveryThreshold > 0
                        ? `${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي`
                        : "—"}
                    </CpTableCell>
                    <CpTableCell>
                      <span
                        style={{
                          color: tier.status === "active" ? colorRoles.brandStructure : undefined,
                          opacity: tier.status === "draft" ? 0.55 : 1,
                        }}
                      >
                        {STATUS_LABEL[tier.status]}
                      </span>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <CpButton onClick={() => controller.select(tier)}>تعديل</CpButton>
                        <CpButton
                          onClick={() => controller.toggleStatus(tier.id)}
                          style={{ background: colorRoles.surfaceBase }}
                        >
                          {tier.status === "active" ? "إيقاف" : "تفعيل"}
                        </CpButton>
                      </div>
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          )}
        </div>

        {/* ── Side panel: edit or create ── */}
        <div
          style={{
            background: colorRoles.surfaceBase,
            borderRadius: "0.75rem",
            padding: "1.25rem",
          }}
        >
          {controller.selected !== null && controller.draft ? (
            <>
              <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                تعديل مستوى: {controller.selected.nameAr}
              </h4>
              {controller.errorMessage && (
                <div style={{ color: colorRoles.brandAction, fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                  {controller.errorMessage}
                </div>
              )}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نسبة الخصم (%)</label>
                <CpTextInput
                  value={String(controller.draft.discountPercent)}
                  onChange={(v) => controller.setDraft({ ...controller.draft!, discountPercent: parseFloat(v) || 0 })}
                />
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حد التوصيل المجاني (ريال، 0 = غير مفعل)</label>
                <CpTextInput
                  value={String(controller.draft.freeDeliveryThreshold)}
                  onChange={(v) => controller.setDraft({ ...controller.draft!, freeDeliveryThreshold: parseInt(v, 10) || 0 })}
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <CpButton
                    onClick={() => controller.save(controller.draft!)}
                    style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}
                  >
                    حفظ التعديلات
                  </CpButton>
                  <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>
                    إلغاء
                  </CpButton>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                إضافة مستوى جديد
              </h4>
              {formError && (
                <div style={{ color: colorRoles.brandAction, fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                  {formError}
                </div>
              )}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم المستوى (عربي)</label>
                <CpTextInput value={nameAr} onChange={setNameAr} placeholder="مثال: ذهبي" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شارة (إيموجي)</label>
                <CpTextInput value={badge} onChange={setBadge} placeholder="مثال: 🥇" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الحد الأدنى للنقاط</label>
                <CpTextInput value={minPoints} onChange={setMinPoints} placeholder="مثال: 1500" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نسبة الخصم (%)</label>
                <CpTextInput value={discountPercent} onChange={setDiscountPercent} placeholder="مثال: 12" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حد التوصيل المجاني (ريال)</label>
                <CpTextInput value={freeDeliveryThreshold} onChange={setFreeDeliveryThreshold} placeholder="0 = غير مفعل" />

                <CpButton
                  onClick={handleCreate}
                  style={{ background: colorRoles.brandAction, color: "white", marginTop: "0.5rem" }}
                >
                  إضافة المستوى
                </CpButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
