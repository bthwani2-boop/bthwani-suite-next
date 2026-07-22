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
import { useCouponsController, useGovernedPartnerOffersController } from "../../../shared/marketing";
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

function statusOptions(current: PartnerOfferRecord["status"]) {
  const values: PartnerOfferRecord["status"][] = (() => {
    switch (current) {
      case "inbound": return ["inbound", "review", "rejected"];
      case "review": return ["review", "marketing-ready", "rejected"];
      case "marketing-ready": return ["marketing-ready", "published", "rejected"];
      case "published": return ["published", "paused"];
      case "paused": return ["paused", "published"];
      default: return [current];
    }
  })();
  return values.map((value) => ({ value, label: STATUS_LABEL[value] ?? value }));
}

function quickActionLabel(status: PartnerOfferRecord["status"]): string | null {
  switch (status) {
    case "inbound": return "بدء المراجعة";
    case "review": return "اعتماد تسويقي";
    case "marketing-ready": return "نشر للعملاء";
    case "published": return "إيقاف";
    case "paused": return "استئناف";
    default: return null;
  }
}

export function PartnerOffersCommandDeck() {
  const controller = useGovernedPartnerOffersController("authenticated");
  const couponsController = useCouponsController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const activeCoupons = couponsController.state.kind === "success"
    ? couponsController.state.coupons.filter((coupon) => coupon.status === "active")
    : [];

  const handleSave = () => {
    if (!controller.draft || !controller.selected) return;
    if (controller.draft.status === "rejected" && !controller.draft.rejectionReason?.trim()) {
      setErrorMsg("سبب الرفض مطلوب قبل حفظ عرض مرفوض.");
      return;
    }
    if (controller.draft.status === "marketing-ready" || controller.draft.status === "published") {
      if (!controller.draft.activeFromDate || !controller.draft.activeToDate) {
        setErrorMsg("تاريخ البداية والنهاية مطلوبان قبل الاعتماد أو النشر.");
        return;
      }
      if (Number.isNaN(Date.parse(controller.draft.activeFromDate)) ||
          Number.isNaN(Date.parse(controller.draft.activeToDate)) ||
          new Date(controller.draft.activeToDate) <= new Date(controller.draft.activeFromDate)) {
        setErrorMsg("نافذة العرض غير صالحة؛ يجب أن يكون تاريخ النهاية بعد البداية.");
        return;
      }
    }
    if (controller.draft.offerType === "coupon" && controller.draft.status === "published" && !controller.draft.couponId) {
      setErrorMsg("اختر كوبون checkout نشطًا قبل نشر العرض.");
      return;
    }
    const allowed = statusOptions(controller.selected.status).some((option) => option.value === controller.draft?.status);
    if (!allowed) {
      setErrorMsg("انتقال الحالة المحدد غير مسموح من الحالة الحالية.");
      return;
    }
    setErrorMsg(null);
    void controller.save(controller.draft);
  };

  const updateDraft = (key: keyof PartnerOfferRecord, value: unknown) => {
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

          {controller.errorMessage ? <div role="alert" style={{ color: colorRoles.danger, marginBottom: "0.75rem", fontSize: "0.8rem" }}>{controller.errorMessage}</div> : null}

          {controller.items.length === 0 ? (
            <CpEmptyTableMessage>لا توجد عروض واردة من الشركاء حالياً.</CpEmptyTableMessage>
          ) : (
            <CpTable>
              <thead><tr><CpTableHeaderCell>الشريك</CpTableHeaderCell><CpTableHeaderCell>العرض المقترح</CpTableHeaderCell><CpTableHeaderCell>نافذة العرض</CpTableHeaderCell><CpTableHeaderCell>هامش المخاطرة</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>العمليات</CpTableHeaderCell></tr></thead>
              <tbody>
                {controller.items.map((offer) => {
                  const actionLabel = quickActionLabel(offer.status);
                  const scheduleBlocked = (offer.status === "review" || offer.status === "marketing-ready") && (!offer.activeFromDate || !offer.activeToDate);
                  const couponPublishBlocked = offer.status === "marketing-ready" && offer.offerType === "coupon" && !offer.couponId;
                  return (
                    <tr key={offer.id}>
                      <CpTableCell><strong>{offer.partnerName}</strong><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{offer.storeLabel}</div></CpTableCell>
                      <CpTableCell><strong>{offer.title}</strong><div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{offer.valueLabel}</div></CpTableCell>
                      <CpTableCell>{offer.activeFromDate && offer.activeToDate ? `${offer.activeFromDate} — ${offer.activeToDate}` : "غير محددة"}</CpTableCell>
                      <CpTableCell style={{ color: offer.marginRiskNote ? colorRoles.brandAction : "inherit" }}>{offer.marginRiskNote || "آمن"}</CpTableCell>
                      <CpTableCell><span style={{ opacity: offer.status === "published" ? 1 : 0.6 }}>{STATUS_LABEL[offer.status] ?? offer.status}</span><div style={{ fontSize: "0.7rem", opacity: 0.55 }}>الإصدار {offer.version}</div></CpTableCell>
                      <CpTableCell>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          <CpButton onClick={() => controller.select(offer)}>مراجعة</CpButton>
                          {actionLabel ? (
                            <CpButton disabled={scheduleBlocked || couponPublishBlocked || controller.loading} onClick={() => void controller.toggleStatus(offer.id)}>
                              {actionLabel}
                            </CpButton>
                          ) : null}
                          <CpButton onClick={() => void controller.remove(offer.id)} style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction }}>أرشفة</CpButton>
                        </div>
                      </CpTableCell>
                    </tr>
                  );
                })}
              </tbody>
            </CpTable>
          )}
        </div>

        {controller.selected !== null && controller.draft ? (
          <div style={{ background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>مراجعة عرض شريك</h4>
            {errorMsg ? <div role="alert" style={{ color: colorRoles.danger, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{errorMsg}</div> : null}

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان العرض الترويجي</label>
              <CpTextInput value={controller.draft.title} onChange={(value) => updateDraft("title", value)} />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>قيمة العرض</label>
              <CpTextInput value={controller.draft.valueLabel} onChange={(value) => updateDraft("valueLabel", value)} />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شروط الأهلية</label>
              <CpTextInput value={controller.draft.eligibility} onChange={(value) => updateDraft("eligibility", value)} />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ بداية العرض</label>
              <CpTextInput value={controller.draft.activeFromDate || ""} onChange={(value) => updateDraft("activeFromDate", value)} placeholder="YYYY-MM-DD" />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ نهاية العرض</label>
              <CpTextInput value={controller.draft.activeToDate || ""} onChange={(value) => updateDraft("activeToDate", value)} placeholder="YYYY-MM-DD" />

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شرح هامش المخاطرة</label>
              <CpTextInput value={controller.draft.marginRiskNote || ""} onChange={(value) => updateDraft("marginRiskNote", value)} placeholder="هامش ربح آمن، يتطلب مراجعة، إلخ..." />

              {controller.draft.offerType === "coupon" ? (
                <>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>كوبون checkout المرتبط</label>
                  <CpSelect
                    value={controller.draft.couponId || ""}
                    onChange={(value) => updateDraft("couponId", value)}
                    options={[
                      { value: "", label: "اختر كوبونًا نشطًا" },
                      ...activeCoupons
                        .filter((coupon) => !coupon.storeId || coupon.storeId === controller.draft?.storeId)
                        .map((coupon) => ({ value: coupon.id, label: `${coupon.nameAr} · ****${coupon.codeLast4}` })),
                    ]}
                  />
                  {couponsController.state.kind === "error" ? <p role="alert" style={{ color: colorRoles.danger, margin: 0 }}>{couponsController.state.message}</p> : null}
                </>
              ) : null}

              <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>قرار الحالة</label>
              <CpSelect
                value={controller.draft.status}
                onChange={(value) => updateDraft("status", value)}
                options={statusOptions(controller.selected.status)}
              />

              {controller.draft.status === "rejected" ? (
                <><label style={{ fontSize: "0.75rem", fontWeight: 600 }}>سبب الرفض</label><CpTextInput value={controller.draft.rejectionReason || ""} onChange={(value) => updateDraft("rejectionReason", value)} placeholder="سبب الرفض مطلوب..." /></>
              ) : null}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <CpButton disabled={controller.loading} onClick={handleSave} style={{ background: colorRoles.brandAction, color: "white", flex: 1 }}>حفظ القرار</CpButton>
                <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
