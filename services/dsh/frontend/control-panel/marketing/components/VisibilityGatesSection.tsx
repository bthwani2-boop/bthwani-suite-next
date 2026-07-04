"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React from "react";
import {
  CpButton,
  CpEmptyTableMessage,
} from "@bthwani/control-panel/components";
import {
  MARKETING_SECTION_TABS,
  GOVERNANCE_BRIDGES,
  PARTNER_GATE_CARDS,
  PRODUCT_GATE_CARDS,
  type MarketingSectionTabId,
  type MarketingKpiMetrics,
} from "../../../shared/marketing";

// ─── Section Tab button ──────────────────────────────────────────────────────

function SectionTabButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.35rem 0.85rem",
        background: active ? colorRoles.surfaceBase : "transparent",
        color: active ? colorRoles.brandAction : "currentColor",
        border: "none",
        borderRadius: "0.375rem",
        fontWeight: active ? 700 : 500,
        fontSize: "0.775rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

type VisibilityGatesSectionProps = {
  readonly sectionTab: MarketingSectionTabId;
  readonly setSectionTab: (tab: MarketingSectionTabId) => void;
  readonly metrics: MarketingKpiMetrics;
  readonly deliverySignals: any; // return type of useMarketingDeliverySignalsController
};

export function VisibilityGatesSection({
  sectionTab,
  setSectionTab,
  metrics,
  deliverySignals,
}: VisibilityGatesSectionProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 20rem",
        gap: "1.5rem",
        padding: "1rem",
        alignItems: "start",
      }}
    >
      {/* ── Right Column: Interactive Gates & Content ─────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Section Tabs: الأهلية / الكبت / التدقيق / الفئات المستهدفة */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            background: colorRoles.surfaceBase,
            padding: "0.25rem",
            borderRadius: "0.5rem",
            alignSelf: "flex-start",
          }}
        >
          {MARKETING_SECTION_TABS.map((tab) => (
            <SectionTabButton
              key={tab.id}
              active={sectionTab === tab.id}
              onClick={() => setSectionTab(tab.id)}
            >
              {tab.label}
            </SectionTabButton>
          ))}
        </div>

        {/* Interactive Governance Bridges */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            fontSize: "0.813rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, opacity: 0.8 }}>جسور الحوكمة التفاعلية:</span>
          {GOVERNANCE_BRIDGES.map((bridge) => (
            <a
              key={bridge.id}
              href={bridge.targetRoute}
              style={{
                color: colorRoles.brandAction,
                textDecoration: "none",
                fontWeight: 600,
                background: colorRoles.surfaceBase,
                padding: "0.25rem 0.625rem",
                borderRadius: "0.375rem",
                border: `1px solid ${colorRoles.surfaceBase}`,
              }}
            >
              {bridge.label}
            </a>
          ))}
        </div>

        {/* Visibility Gates Intro Header */}
        <div
          style={{
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.surfaceBase}`,
            borderRadius: "1rem",
            padding: "1.5rem",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem", color: colorRoles.brandAction, fontSize: "1.05rem" }}>
            بوابات الظهور عبر الأسطح
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6 }}>
            بوابة تفعيل الشركاء تتحقق من جاهزية المتجر قبل إطلاق أي عروض تسويقية. بوابة نشر المنتجات تضمن سلامة مواصفات وصور المنتج قبل النشر. توقعات الظهور التجاري تقتصر على محاكاة العناصر المرئية للعملاء. قنوات إشارات التنسيق تعمل على تزامن القرارات لحظياً وبدون تداخل.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <CpButton style={{ background: colorRoles.brandAction, color: colorRoles.surfaceBase, border: "none", borderRadius: "0.5rem", padding: "0.45rem 1rem", cursor: "pointer" }}>
              عروض الشركاء
            </CpButton>
            <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
              الحملات
            </CpButton>
            <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
              مراجعة الميديا
            </CpButton>
            <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
              الإشارات
            </CpButton>
          </div>
        </div>

        {/* Eligibility Card Block */}
        <div
          style={{
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.surfaceBase}`,
            borderRadius: "1rem",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
              أهلية الظهور / موانع النشر / سجلات التدقيق والفئات المستهدفة
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>ملخص الحوكمة</span>
              <span style={{ background: colorRoles.surfaceBase, color: `var(--status-danger-strong, ${colorRoles.brandAction})`, padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700, fontSize: "0.85rem" }}>
                0
              </span>
              <span style={{ fontSize: "0.75rem", color: `var(--status-danger-strong, ${colorRoles.brandAction})`, fontWeight: 600 }}>eligibility</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>
            التحقق من توافق معايير الحملات والشركاء مع سياسات النشر دون تجاوز ضوابط التفعيل.
          </p>
        </div>

        {/* ── Section: بوابة تفعيل الشريك إلى الظهور ── */}
        <div>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
            بوابة تفعيل الشريك إلى الظهور
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {PARTNER_GATE_CARDS.map((card) => {
              const isBypassed = false;
              return (
                <div
                  key={card.id}
                  style={{
                    background: colorRoles.surfaceBase,
                    border: `1px solid ${colorRoles.surfaceBase}`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    opacity: isBypassed ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "0.875rem", color: colorRoles.brandStructure }}>{card.title}</strong>
                    <span
                      style={{
                        background: isBypassed ? colorRoles.surfaceBase : card.statusColor + "15",
                        color: isBypassed ? colorRoles.brandStructure : card.statusColor,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        fontSize: "0.72rem",
                      }}
                    >
                      {card.statusTag}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.75rem", opacity: 0.55, display: "flex", gap: "1rem" }}>
                    <span>المالك: {card.owner}</span>
                    <span>السطح المتأثر: {card.surface}</span>
                    <span>{card.auditNote}</span>
                  </div>

                  <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.813rem", opacity: 0.8 }}>
                    {card.statusLabel}
                  </p>

                  <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-end" }}>
                    <CpButton style={{ fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}>
                      {card.primaryActionLabel}
                    </CpButton>
                    <CpButton
                      disabled
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.35rem 0.85rem",
                        background: colorRoles.surfaceBase,
                        color: `var(--status-success-strong, ${colorRoles.brandStructure})`,
                        border: `1px solid ${colorRoles.surfaceBase}`,
                        borderRadius: "0.5rem",
                      }}
                    >
                      التجاوز غير مفعّل
                    </CpButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section: بوابة نشر المنتج ── */}
        <div>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
            بوابة نشر المنتج
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {PRODUCT_GATE_CARDS.map((card) => {
              const isBypassed = false;
              return (
                <div
                  key={card.id}
                  style={{
                    background: colorRoles.surfaceBase,
                    border: `1px solid ${colorRoles.surfaceBase}`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    opacity: isBypassed ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "0.875rem", color: colorRoles.brandStructure }}>{card.title}</strong>
                    <span
                      style={{
                        background: isBypassed ? colorRoles.surfaceBase : colorRoles.surfaceBase,
                        color: isBypassed ? colorRoles.brandStructure : colorRoles.brandAction,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        fontSize: "0.72rem",
                      }}
                    >
                      {card.statusTag}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.75rem", opacity: 0.55, display: "flex", gap: "1rem" }}>
                    <span>الموانع: {card.restrictionsCount}</span>
                    <span>النشر محجوب</span>
                    <span>بوابة الشريك: {card.partnerGateStatus}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-end", marginTop: "0.25rem" }}>
                    <CpButton style={{ fontSize: "0.75rem", padding: "0.35rem 0.85rem" }}>
                      {card.primaryActionLabel}
                    </CpButton>
                    <CpButton
                      disabled
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.35rem 0.85rem",
                        background: colorRoles.surfaceBase,
                        color: `var(--status-success-strong, ${colorRoles.brandStructure})`,
                        border: `1px solid ${colorRoles.surfaceBase}`,
                        borderRadius: "0.5rem",
                      }}
                    >
                      التجاوز غير مفعّل
                    </CpButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Left Column: Quick Decision & Signals ─────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Quick Decision Board */}
        <div
          style={{
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.surfaceBase}`,
            borderRadius: "0.75rem",
            padding: "1.25rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700 }}>
            لوحة القرار السريع
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
              <span style={{ opacity: 0.7 }}>المتاجر النشطة:</span>
              <strong style={{ color: colorRoles.brandAction }}>{metrics.activeStoresRatio}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
              <span style={{ opacity: 0.7 }}>طلبات مكتملة:</span>
              <strong>{metrics.deliveredOrders.toLocaleString("ar")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
              <span style={{ opacity: 0.7 }}>تصعيدات مفتوحة:</span>
              <strong style={{ color: `var(--status-success-strong, ${colorRoles.brandStructure})` }}>{metrics.openEscalations.toLocaleString("ar")}</strong>
            </div>
          </div>
        </div>

        {/* Delivery Signals to Marketing */}
        <div
          style={{
            background: colorRoles.surfaceBase,
            border: `1px solid ${colorRoles.surfaceBase}`,
            borderRadius: "0.75rem",
            padding: "1.25rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700 }}>
            إشارات التسليم إلى التسويق
          </h4>
          {deliverySignals.errorMessage && (
            <p role="status" style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: colorRoles.brandAction, opacity: 0.85 }}>
              {deliverySignals.errorMessage}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {deliverySignals.items.length === 0 && !deliverySignals.errorMessage && (
              <CpEmptyTableMessage>لا توجد إشارات دعم تشغيلية حالياً.</CpEmptyTableMessage>
            )}
            {deliverySignals.items.map((signal: any) => (
              <div
                key={signal.id}
                style={{
                  background: colorRoles.surfaceBase,
                  border: `1px solid ${colorRoles.surfaceBase}`,
                  borderRadius: "0.5rem",
                  padding: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.775rem", fontWeight: 600, color: colorRoles.brandStructure, lineHeight: 1.4 }}>
                  {signal.title}
                </p>
                <span
                  style={{
                    alignSelf: "flex-start",
                    background: signal.isApproved ? colorRoles.surfaceBase : colorRoles.surfaceBase,
                    color: signal.isApproved ? colorRoles.brandStructure : colorRoles.brandAction,
                    fontSize: "0.688rem",
                    fontWeight: 600,
                    padding: "0.1rem 0.35rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  {signal.statusLabel}
                </span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", opacity: 0.55, marginTop: "0.25rem" }}>
                  <span>{signal.source} | {signal.intakeId}</span>
                  <span>{signal.timeAgo}</span>
                </div>
                <CpButton
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.5rem",
                    alignSelf: "flex-end",
                    marginTop: "0.25rem",
                  }}
                >
                  فتح الإشارات
                </CpButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
