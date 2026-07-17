"use client";

import React, { useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  CpButton,
  CpEmptyTableMessage,
  CpKpiCard,
  CpKpiStrip,
  CpSelect,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { useSubscriptionPlansController } from "../../../shared/marketing";
import type { SubscriptionBillingCycle, SubscriptionPlanRecord } from "../../../shared/marketing";

const STATUS_LABEL: Record<SubscriptionPlanRecord["status"], string> = {
  draft: "مسودة",
  active: "نشطة",
  paused: "موقوفة",
  archived: "مؤرشفة",
};

const CYCLE_LABEL: Record<SubscriptionBillingCycle, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  annual: "سنوي",
};

export function SubscriptionsCommandDeck() {
  const controller = useSubscriptionPlansController("authenticated");
  const [nameAr, setNameAr] = useState("");
  const [priceYer, setPriceYer] = useState("");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [includeFreeDelivery, setIncludeFreeDelivery] = useState(false);
  const [pointsMultiplier, setPointsMultiplier] = useState("1");
  const [orderCap, setOrderCap] = useState("0");
  const [badge, setBadge] = useState("");
  const [wltProductReference, setWltProductReference] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const items = controller.state.kind === "success" ? controller.state.items : [];

  const createDraft = async () => {
    const price = Number.parseInt(priceYer, 10);
    const multiplier = Number.parseFloat(pointsMultiplier);
    const cap = Number.parseInt(orderCap, 10) || 0;
    if (!nameAr.trim() || !Number.isInteger(price) || price <= 0 || Number.isNaN(multiplier) || multiplier < 1 || cap < 0) {
      setFormError("تحقق من الاسم والسعر ومضاعف النقاط وحد الطلبات.");
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    try {
      await controller.create({
        nameAr: nameAr.trim(),
        nameEn: nameAr.trim(),
        priceYer: price,
        billingCycle,
        includeFreeDelivery,
        pointsMultiplier: multiplier,
        orderCap: cap,
        badge: badge.trim(),
        wltProductReference: wltProductReference.trim(),
      });
      setNameAr("");
      setPriceYer("");
      setBillingCycle("monthly");
      setIncludeFreeDelivery(false);
      setPointsMultiplier("1");
      setOrderCap("0");
      setBadge("");
      setWltProductReference("");
      setSuccessMessage("تم إنشاء خطة الاشتراك كمسودة. التفعيل يتطلب مرجع WLT واعتماد مستخدم آخر.");
    } catch {
      // The controller exposes the server error below.
    }
  };

  const changeStatus = async (plan: SubscriptionPlanRecord, status: SubscriptionPlanRecord["status"]) => {
    setSuccessMessage(null);
    try {
      await controller.update(plan, { status });
      setSuccessMessage(`تم تحديث حالة الخطة إلى ${STATUS_LABEL[status]}.`);
    } catch {
      // The controller exposes the server error below.
    }
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gap: "1.25rem" }} dir="rtl">
      <CpKpiStrip>
        <CpKpiCard label="خطط نشطة" value={controller.summary.activePlans.toLocaleString("ar")} />
        <CpKpiCard label="مشتركون نشطون" value={controller.summary.totalActiveSubscribers.toLocaleString("ar")} />
        <CpKpiCard label="MRR موثق" value={`${controller.summary.mrr.toLocaleString("ar")} ر.ي`} />
      </CpKpiStrip>

      {(controller.state.kind === "error" || controller.actionError || formError) && (
        <p role="alert" style={{ margin: 0, color: colorRoles.brandAction }}>
          {formError ?? controller.actionError ?? (controller.state.kind === "error" ? controller.state.message : "")}
        </p>
      )}
      {successMessage && <p role="status" style={{ margin: 0, color: colorRoles.brandStructure }}>{successMessage}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 23rem", gap: "1.5rem" }}>
        <div>
          <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction }}>خطط الاشتراك</h3>
          {controller.state.kind === "loading" ? (
            <p>جارٍ تحميل خطط الاشتراك...</p>
          ) : items.length === 0 ? (
            <CpEmptyTableMessage>لا توجد خطط اشتراك حتى الآن.</CpEmptyTableMessage>
          ) : (
            <CpTable>
              <thead>
                <tr>
                  <CpTableHeaderCell>الخطة</CpTableHeaderCell>
                  <CpTableHeaderCell>السعر</CpTableHeaderCell>
                  <CpTableHeaderCell>المزايا</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>WLT والحوكمة</CpTableHeaderCell>
                  <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {items.map((plan) => (
                  <tr key={plan.id}>
                    <CpTableCell><strong>{plan.badge} {plan.nameAr}</strong></CpTableCell>
                    <CpTableCell>{plan.priceYer.toLocaleString("ar")} ر.ي / {CYCLE_LABEL[plan.billingCycle]}</CpTableCell>
                    <CpTableCell>
                      {plan.includeFreeDelivery ? "توصيل مجاني" : "بدون توصيل مجاني"}
                      {` · ×${plan.pointsMultiplier} نقاط`}
                      {plan.orderCap > 0 ? ` · ${plan.orderCap} طلب` : " · بلا حد طلبات"}
                    </CpTableCell>
                    <CpTableCell>{STATUS_LABEL[plan.status]}</CpTableCell>
                    <CpTableCell>
                      <div style={{ fontSize: "0.75rem" }}>WLT: {plan.wltProductReference || "غير مربوط"}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>الإصدار: {plan.version}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>المنشئ: {plan.createdByActorId || "—"}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>المعتمد: {plan.approvedByActorId || "لم يعتمد"}</div>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {(plan.status === "draft" || plan.status === "paused") && (
                          <CpButton onClick={() => void changeStatus(plan, "active")}>اعتماد وتفعيل</CpButton>
                        )}
                        {plan.status === "active" && (
                          <CpButton onClick={() => void changeStatus(plan, "paused")}>إيقاف</CpButton>
                        )}
                        {plan.status !== "archived" && plan.status !== "active" && (
                          <CpButton onClick={() => void changeStatus(plan, "archived")}>أرشفة</CpButton>
                        )}
                      </div>
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          )}
        </div>

        <aside style={{ background: colorRoles.surfaceBase, borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>إنشاء خطة اشتراك</h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", opacity: 0.7 }}>
            الإنشاء ينتج مسودة. لا يمكن التفعيل دون مرجع منتج WLT وموافق مستقل.
          </p>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <CpTextInput value={nameAr} onChange={setNameAr} placeholder="اسم الخطة" />
            <CpTextInput value={badge} onChange={setBadge} placeholder="الشارة" />
            <CpTextInput value={priceYer} onChange={setPriceYer} placeholder="السعر بالريال اليمني" />
            <CpSelect
              value={billingCycle}
              onChange={(value) => setBillingCycle(value as SubscriptionBillingCycle)}
              options={[
                { value: "monthly", label: "شهري" },
                { value: "quarterly", label: "ربع سنوي" },
                { value: "annual", label: "سنوي" },
              ]}
            />
            <CpSelect
              value={pointsMultiplier}
              onChange={setPointsMultiplier}
              options={[
                { value: "1", label: "×1" },
                { value: "1.5", label: "×1.5" },
                { value: "2", label: "×2" },
                { value: "3", label: "×3" },
              ]}
            />
            <CpTextInput value={orderCap} onChange={setOrderCap} placeholder="حد الطلبات، 0 بلا حد" />
            <CpTextInput value={wltProductReference} onChange={setWltProductReference} placeholder="مرجع منتج WLT" />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
              <input type="checkbox" checked={includeFreeDelivery} onChange={(event) => setIncludeFreeDelivery(event.target.checked)} />
              يشمل التوصيل المجاني
            </label>
            <CpButton onClick={() => void createDraft()}>حفظ كمسودة</CpButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
