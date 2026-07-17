"use client";

import React, { useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  CpButton,
  CpEmptyTableMessage,
  CpKpiCard,
  CpKpiStrip,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { useLoyaltyTiersController } from "../../../shared/marketing";
import type { LoyaltyTierRecord } from "../../../shared/marketing";

const STATUS_LABEL: Record<LoyaltyTierRecord["status"], string> = {
  draft: "مسودة",
  active: "نشط",
  paused: "موقوف",
  archived: "مؤرشف",
};

export function LoyaltyCommandDeck() {
  const controller = useLoyaltyTiersController("authenticated");
  const [nameAr, setNameAr] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("0");
  const [badge, setBadge] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const items = controller.state.kind === "success" ? controller.state.items : [];

  const createDraft = async () => {
    const points = Number.parseInt(minPoints, 10);
    const discount = Number.parseFloat(discountPercent);
    const threshold = Number.parseInt(freeDeliveryThreshold, 10) || 0;
    if (!nameAr.trim() || !Number.isInteger(points) || points < 0 || Number.isNaN(discount) || discount < 0 || discount > 100 || threshold < 0) {
      setFormError("تحقق من الاسم والنقاط ونسبة الخصم وحد التوصيل المجاني.");
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    try {
      await controller.create({
        nameAr: nameAr.trim(),
        nameEn: nameAr.trim(),
        minPoints: points,
        discountPercent: discount,
        freeDeliveryThreshold: threshold,
        badge: badge.trim(),
      });
      setNameAr("");
      setMinPoints("");
      setDiscountPercent("");
      setFreeDeliveryThreshold("0");
      setBadge("");
      setSuccessMessage("تم إنشاء مستوى الولاء كمسودة. يحتاج إلى اعتماد مستخدم آخر قبل التفعيل.");
    } catch {
      // The controller exposes the server error below.
    }
  };

  const changeStatus = async (tier: LoyaltyTierRecord, status: LoyaltyTierRecord["status"]) => {
    setSuccessMessage(null);
    try {
      await controller.update(tier, { status });
      setSuccessMessage(`تم تحديث حالة المستوى إلى ${STATUS_LABEL[status]}.`);
    } catch {
      // The controller exposes the server error below.
    }
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gap: "1.25rem" }} dir="rtl">
      <CpKpiStrip>
        <CpKpiCard label="مستويات نشطة" value={controller.summary.activeTiers.toLocaleString("ar")} />
        <CpKpiCard label="عملاء مسجلون" value={controller.summary.totalEnrolledClients.toLocaleString("ar")} />
        <CpKpiCard label="نقاط مصدرة هذا الشهر" value={controller.summary.pointsIssuedThisMonth.toLocaleString("ar")} />
      </CpKpiStrip>

      {(controller.state.kind === "error" || controller.actionError || formError) && (
        <p role="alert" style={{ margin: 0, color: colorRoles.brandAction }}>
          {formError ?? controller.actionError ?? (controller.state.kind === "error" ? controller.state.message : "")}
        </p>
      )}
      {successMessage && <p role="status" style={{ margin: 0, color: colorRoles.brandStructure }}>{successMessage}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }}>
        <div>
          <h3 style={{ margin: "0 0 1rem", color: colorRoles.brandAction }}>مستويات برنامج الولاء</h3>
          {controller.state.kind === "loading" ? (
            <p>جارٍ تحميل برنامج الولاء...</p>
          ) : items.length === 0 ? (
            <CpEmptyTableMessage>لا توجد مستويات ولاء حتى الآن.</CpEmptyTableMessage>
          ) : (
            <CpTable>
              <thead>
                <tr>
                  <CpTableHeaderCell>المستوى</CpTableHeaderCell>
                  <CpTableHeaderCell>النقاط</CpTableHeaderCell>
                  <CpTableHeaderCell>المزايا</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>الحوكمة</CpTableHeaderCell>
                  <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {items.map((tier) => (
                  <tr key={tier.id}>
                    <CpTableCell><strong>{tier.badge} {tier.nameAr}</strong></CpTableCell>
                    <CpTableCell>{tier.minPoints.toLocaleString("ar")}</CpTableCell>
                    <CpTableCell>
                      خصم {tier.discountPercent}%
                      {tier.freeDeliveryThreshold > 0 ? ` · توصيل مجاني فوق ${tier.freeDeliveryThreshold.toLocaleString("ar")} ر.ي` : ""}
                    </CpTableCell>
                    <CpTableCell>{STATUS_LABEL[tier.status]}</CpTableCell>
                    <CpTableCell>
                      <div style={{ fontSize: "0.75rem" }}>الإصدار: {tier.version}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>المنشئ: {tier.createdByActorId || "—"}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>المعتمد: {tier.approvedByActorId || "لم يعتمد"}</div>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {(tier.status === "draft" || tier.status === "paused") && (
                          <CpButton onClick={() => void changeStatus(tier, "active")}>اعتماد وتفعيل</CpButton>
                        )}
                        {tier.status === "active" && (
                          <CpButton onClick={() => void changeStatus(tier, "paused")}>إيقاف</CpButton>
                        )}
                        {tier.status !== "archived" && tier.status !== "active" && (
                          <CpButton onClick={() => void changeStatus(tier, "archived")}>أرشفة</CpButton>
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
          <h4 style={{ margin: "0 0 0.5rem" }}>إنشاء مستوى ولاء</h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", opacity: 0.7 }}>
            الإنشاء ينتج مسودة فقط. لا يستطيع منشئ المستوى اعتماده بنفسه.
          </p>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <CpTextInput value={nameAr} onChange={setNameAr} placeholder="اسم المستوى" />
            <CpTextInput value={badge} onChange={setBadge} placeholder="الشارة" />
            <CpTextInput value={minPoints} onChange={setMinPoints} placeholder="الحد الأدنى للنقاط" />
            <CpTextInput value={discountPercent} onChange={setDiscountPercent} placeholder="نسبة الخصم" />
            <CpTextInput value={freeDeliveryThreshold} onChange={setFreeDeliveryThreshold} placeholder="حد التوصيل المجاني" />
            <CpButton onClick={() => void createDraft()}>حفظ كمسودة</CpButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
