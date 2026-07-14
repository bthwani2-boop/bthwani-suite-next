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
  CpKpiStrip,
  CpKpiCard,
} from "@bthwani/control-panel/components";
import {
  useSubscriptionsController,
} from "../../../shared/marketing";
import type { SubscriptionPlanRecord, SubscriptionBillingCycle } from "../../../shared/marketing";

const STATUS_LABEL: Record<SubscriptionPlanRecord["status"], string> = {
  draft: "مسودة",
  active: "نشط",
  paused: "موقوف",
  archived: "مؤرشف",
};

const CYCLE_LABEL: Record<SubscriptionBillingCycle, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  annual: "سنوي",
};

export function SubscriptionsCommandDeck() {
  const controller = useSubscriptionsController("authenticated");

  // ─ Create form ─
  const [nameAr, setNameAr] = useState("");
  const [priceYer, setPriceYer] = useState("");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [includeFreeDelivery, setIncludeFreeDelivery] = useState(false);
  const [pointsMultiplier, setPointsMultiplier] = useState("1");
  const [orderCap, setOrderCap] = useState("0");
  const [badge, setBadge] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!nameAr.trim() || !priceYer) {
      setFormError("اسم الخطة والسعر حقول مطلوبة.");
      return;
    }
    const price = parseInt(priceYer, 10);
    if (isNaN(price) || price <= 0) { setFormError("السعر يجب أن يكون عدداً موجباً."); return; }
    setFormError(null);
    controller.create({
      nameAr,
      nameEn: nameAr,
      priceYer: price,
      billingCycle,
      includeFreeDelivery,
      pointsMultiplier: parseFloat(pointsMultiplier) || 1,
      orderCap: parseInt(orderCap, 10) || 0,
      badge: badge || "🎟",
    });
    setNameAr(""); setPriceYer(""); setBillingCycle("monthly");
    setIncludeFreeDelivery(false); setPointsMultiplier("1"); setOrderCap("0"); setBadge("");
  };

  return (
    <div style={{ padding: "1.5rem" }} dir="rtl">
      {/* ── KPI Strip ── */}
      <CpKpiStrip>
        <CpKpiCard label="خطط نشطة"          value={String(controller.summary.activePlans)} />
        <CpKpiCard label="مشتركون نشطون"    value={controller.summary.totalActiveSubscribers.toLocaleString("ar")} />
        <CpKpiCard label="إيرادات شهرية (MRR)" value={`${controller.summary.mrr.toLocaleString("ar")} ر.ي`} />
      </CpKpiStrip>
      {!controller.summary.isBackedByApi && (
        <p style={{ fontSize: "0.75rem", color: colorRoles.brandAction, margin: "0.5rem 0 1rem", opacity: 0.8 }}>
          ⚠️ بيانات الاشتراكات تعمل على سجل محلي — سيتم ربطها بالـ API عند الإطلاق.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr 22rem",
          gap: "1.5rem",
        }}
      >
        {/* ── Plans table ── */}
        <div>
          <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction, fontSize: "1.15rem" }}>
            خطط الاشتراك
          </h3>

          {controller.plans.length === 0 ? (
            <CpEmptyTableMessage>لا توجد خطط اشتراك محددة حالياً.</CpEmptyTableMessage>
          ) : (
            <CpTable>
              <thead>
                <tr>
                  <CpTableHeaderCell>الشارة</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم</CpTableHeaderCell>
                  <CpTableHeaderCell>السعر</CpTableHeaderCell>
                  <CpTableHeaderCell>دورة الفوترة</CpTableHeaderCell>
                  <CpTableHeaderCell>توصيل مجاني</CpTableHeaderCell>
                  <CpTableHeaderCell>مضاعف النقاط</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>العمليات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {controller.plans.map((plan) => (
                  <tr key={plan.id}>
                    <CpTableCell>{plan.badge}</CpTableCell>
                    <CpTableCell><strong>{plan.nameAr}</strong></CpTableCell>
                    <CpTableCell>{plan.priceYer.toLocaleString("ar")} ر.ي</CpTableCell>
                    <CpTableCell>{CYCLE_LABEL[plan.billingCycle]}</CpTableCell>
                    <CpTableCell>{plan.includeFreeDelivery ? "✅ نعم" : "—"}</CpTableCell>
                    <CpTableCell>×{plan.pointsMultiplier}</CpTableCell>
                    <CpTableCell>
                      <span
                        style={{
                          color: plan.status === "active" ? colorRoles.brandStructure : undefined,
                          opacity: plan.status === "draft" ? 0.55 : 1,
                        }}
                      >
                        {STATUS_LABEL[plan.status]}
                      </span>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <CpButton onClick={() => controller.select(plan)}>تعديل</CpButton>
                        <CpButton
                          onClick={() => controller.toggleStatus(plan.id)}
                          style={{ background: colorRoles.surfaceBase }}
                        >
                          {plan.status === "active" ? "إيقاف" : "تفعيل"}
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
        <div style={{ background: colorRoles.surfaceBase, borderRadius: "0.75rem", padding: "1.25rem" }}>
          {controller.selected !== null && controller.draft ? (
            <>
              <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                تعديل خطة: {controller.selected.nameAr}
              </h4>
              {controller.errorMessage && (
                <div style={{ color: colorRoles.brandAction, fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                  {controller.errorMessage}
                </div>
              )}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>السعر (ريال يمني)</label>
                <CpTextInput
                  value={String(controller.draft.priceYer)}
                  onChange={(v) => controller.setDraft({ ...controller.draft!, priceYer: parseInt(v, 10) || 0 })}
                />
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>مضاعف نقاط الولاء</label>
                <CpSelect
                  value={String(controller.draft.pointsMultiplier)}
                  onChange={(v) => controller.setDraft({ ...controller.draft!, pointsMultiplier: parseFloat(v) })}
                  options={[
                    { value: "1", label: "×1 — معيار" },
                    { value: "1.5", label: "×1.5" },
                    { value: "2", label: "×2 — مضاعف" },
                    { value: "3", label: "×3 — برميوم" },
                  ]}
                />
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الحد الأقصى للطلبات (0 = غير محدود)</label>
                <CpTextInput
                  value={String(controller.draft.orderCap)}
                  onChange={(v) => controller.setDraft({ ...controller.draft!, orderCap: parseInt(v, 10) || 0 })}
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <CpButton
                    onClick={() => controller.save(controller.draft!)}
                    style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}
                  >
                    حفظ التعديلات
                  </CpButton>
                  <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>إضافة خطة جديدة</h4>
              {formError && (
                <div style={{ color: colorRoles.brandAction, fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                  {formError}
                </div>
              )}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم الخطة (عربي)</label>
                <CpTextInput value={nameAr} onChange={setNameAr} placeholder="مثال: اشتراك برو" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شارة (إيموجي)</label>
                <CpTextInput value={badge} onChange={setBadge} placeholder="مثال: 🚀" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>السعر (ريال يمني)</label>
                <CpTextInput value={priceYer} onChange={setPriceYer} placeholder="مثال: 1990" />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>دورة الفوترة</label>
                <CpSelect
                  value={billingCycle}
                  onChange={(v) => setBillingCycle(v as SubscriptionBillingCycle)}
                  options={[
                    { value: "monthly", label: "شهري" },
                    { value: "quarterly", label: "ربع سنوي" },
                    { value: "annual", label: "سنوي" },
                  ]}
                />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>مضاعف نقاط الولاء</label>
                <CpSelect
                  value={pointsMultiplier}
                  onChange={setPointsMultiplier}
                  options={[
                    { value: "1", label: "×1 — معيار" },
                    { value: "1.5", label: "×1.5" },
                    { value: "2", label: "×2 — مضاعف" },
                  ]}
                />

                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الحد الأقصى للطلبات (0 = غير محدود)</label>
                <CpTextInput value={orderCap} onChange={setOrderCap} placeholder="0" />

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeFreeDelivery}
                    onChange={(e) => setIncludeFreeDelivery(e.target.checked)}
                  />
                  يشمل توصيلاً مجانياً على كل طلب
                </label>

                <CpButton
                  onClick={handleCreate}
                  style={{ background: colorRoles.brandAction, color: "white", marginTop: "0.5rem" }}
                >
                  إضافة الخطة
                </CpButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
