"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpEmptyTableMessage,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
  CpSelect,
  CpStatePanel,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  MARKETING_MAIN_TABS,
  MARKETING_SECTION_TABS,
  GOVERNANCE_BRIDGES,
  PARTNER_GATE_CARDS,
  PRODUCT_GATE_CARDS,
  DELIVERY_SIGNAL_CARDS,
  buildMarketingKpiMetrics,
  type MarketingMainTabId,
  type MarketingSectionTabId,
} from "../../shared/marketing";
import {
  useHomeDiscoveryAdminController,
  type DshHomeAdminContentInput,
  type DshHomeAdminKind,
} from "../../shared/home-discovery";
import { opsTheme } from "../../shared/operations";
import {
  VideoStudioCommandDeck,
  CampaignsCommandDeck,
  PartnerOffersCommandDeck,
  ImageProductReviewCommandDeck,
  BenefitsSubscriptionsCommandDeck,
  GrowthCommandDeck,
  SignalsMeasurementCommandDeck,
  TickerCommandDeck,
} from "./MarketingCommandDecks";

// ─── Main Tab button (underline style) ─────────────────────────────────────

function MainTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.625rem 1.125rem",
        background: "none",
        border: "none",
        borderBottom: active ? `2px solid ${colorRoles.brandAction}` : "2px solid transparent",
        color: active ? colorRoles.brandAction : "currentColor",
        fontWeight: active ? 700 : 500,
        fontSize: "0.875rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Section Tab button ──────────────────────────────────────────────────────

function SectionTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

export function MarketingDashboardScreen() {
  const identity = useIdentitySession();

  const [mainTab, setMainTab] = useState<MarketingMainTabId>("visibility-gates");
  const [sectionTab, setSectionTab] = useState<MarketingSectionTabId>("eligibility");
  // PENDING_GOVERNANCE_API: no governance API exists for gate bypass — this only flips local
  // component state (see PARTNER_GATE_CARDS/PRODUCT_GATE_CARDS render below, which
  // now labels the result "تجاوز محلي فقط" instead of falsely claiming success).
  const [bypassedGates, setBypassedGates] = useState<Set<string>>(new Set());

  const metrics = useMemo(() => buildMarketingKpiMetrics(), []);

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h2 style={{ margin: 0, textAlign: "right" }}>تسويق DSH</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به للوصول للحوكمة التسويقية.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز تسجيل الدخول (مطور)
          </CpButton>
        </div>
      </section>
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="تسويق DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            حوكمة المحتوى التسويقي والنمو الاستراتيجي
          </p>

          {/* ── KPI Strip ─────────────────────────────────────────────── */}
          <CpKpiStrip>
            <CpKpiCard label="بوابات الشركاء"    value={metrics.partnerGatesActive} />
            <CpKpiCard label="منتجات محجوبة"    value={metrics.blockedProductsActive} />
            <CpKpiCard label="ظهور تجاري"       value={`${metrics.commercialVisibilityBlocked} محجوب حالياً`} />
            <CpKpiCard label="إشارات غير مقروءة" value={`${metrics.unreadSignalsCount} (${metrics.promoCandidatesCount} مرشحين ترويج)`} />
          </CpKpiStrip>
          {!metrics.isBackedByApi && (
            <p role="status" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: opsTheme.warning, opacity: 0.85 }}>
              ⚠️ {metrics.disclosureReason}
            </p>
          )}
        </CpPageHeader>
      }
    >
      {/* ── Main Tab Navigation (matching underline style) ──────────────── */}
      <nav
        dir="rtl"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem",
          gap: "0.25rem",
          marginBottom: "0.75rem",
          overflowX: "auto",
        }}
      >
        {MARKETING_MAIN_TABS.map((t) => (
          <MainTabButton
            key={t.id}
            active={mainTab === t.id}
            onClick={() => setMainTab(t.id)}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* ── Main Dashboard Layout ─────────────────────────────────────── */}
      {mainTab === "visibility-gates" && (
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
                    color: opsTheme.brand,
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
              <h3 style={{ margin: "0 0 0.5rem", color: opsTheme.danger, fontSize: "1.05rem" }}>
                بوابات الظهور عبر الأسطح
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6 }}>
                بوابة تفعيل الشركاء تتحقق من جاهزية المتجر قبل إطلاق أي عروض تسويقية. بوابة نشر المنتجات تضمن سلامة مواصفات وصور المنتج قبل النشر. توقعات الظهور التجاري تقتصر على محاكاة العناصر المرئية للعملاء. قنوات إشارات التنسيق تعمل على تزامن القرارات لحظياً وبدون تداخل.
              </p>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <CpButton style={{ background: opsTheme.brand, color: opsTheme.textInverse, border: "none", borderRadius: "0.5rem", padding: "0.45rem 1rem", cursor: "pointer" }}>
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
                  <span style={{ background: opsTheme.dangerSurface, color: `var(--status-danger-strong, ${colorRoles.brandAction})`, padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700, fontSize: "0.85rem" }}>
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
                  const isBypassed = bypassedGates.has(card.id);
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
                        <strong style={{ fontSize: "0.875rem", color: opsTheme.text }}>{card.title}</strong>
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
                          {isBypassed ? "تجاوز محلي فقط — لم يُنفَّذ فعلياً" : card.statusTag}
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
                        {!isBypassed && (
                          <CpButton
                            onClick={() => setBypassedGates((prev) => new Set([...prev, card.id]))}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.35rem 0.85rem",
                              background: colorRoles.surfaceBase,
                              color: `var(--status-success-strong, ${colorRoles.brandStructure})`,
                              border: `1px solid ${colorRoles.surfaceBase}`,
                              borderRadius: "0.5rem",
                            }}
                          >
                            تجاوز البوابة
                          </CpButton>
                        )}
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
                  const isBypassed = bypassedGates.has(card.id);
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
                        <strong style={{ fontSize: "0.875rem", color: opsTheme.text }}>{card.title}</strong>
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
                          {isBypassed ? "تجاوز محلي فقط — لم يُنفَّذ فعلياً" : card.statusTag}
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
                        {!isBypassed && (
                          <CpButton
                            onClick={() => setBypassedGates((prev) => new Set([...prev, card.id]))}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.35rem 0.85rem",
                              background: colorRoles.surfaceBase,
                              color: `var(--status-success-strong, ${colorRoles.brandStructure})`,
                              border: `1px solid ${colorRoles.surfaceBase}`,
                              borderRadius: "0.5rem",
                            }}
                          >
                            تجاوز الموانع
                          </CpButton>
                        )}
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
                  <span style={{ opacity: 0.7 }}>بوابات الشركاء:</span>
                  <strong style={{ color: opsTheme.brand }}>{metrics.partnerGatesActive} مسارات نشطة</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
                  <span style={{ opacity: 0.7 }}>منتجات محجوبة:</span>
                  <strong>{metrics.blockedProductsActive} موانع نشطة</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
                  <span style={{ opacity: 0.7 }}>ظهور تجاري:</span>
                  <strong style={{ color: `var(--status-success-strong, ${colorRoles.brandStructure})` }}>{metrics.commercialVisibilityBlocked} محجوب حالياً</strong>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {DELIVERY_SIGNAL_CARDS.map((signal) => (
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
                    <p style={{ margin: 0, fontSize: "0.775rem", fontWeight: 600, color: opsTheme.text, lineHeight: 1.4 }}>
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
      )}

      {/* ── Banners Tab ── */}
      {mainTab === "banners-carousel" && (
        <MarketingHomeDiscoveryPanel kind="banners" />
      )}

      {/* ── Promos Tab ── */}
      {mainTab === "homepage-promos" && (
        <MarketingHomeDiscoveryPanel kind="promos" />
      )}

      {/* ─── Smart Bar / Tickers Tab ─── */}
      {mainTab === "smart-bar" && (
        <TickerCommandDeck />
      )}

      {/* ── Remaining Command Deck tabs ── */}
      {mainTab === "video-studio" && <VideoStudioCommandDeck />}
      {mainTab === "campaigns" && <CampaignsCommandDeck />}
      {mainTab === "partner-offers" && <PartnerOffersCommandDeck />}
      {mainTab === "image-product-review" && <ImageProductReviewCommandDeck />}
      {mainTab === "benefits-subscriptions" && <BenefitsSubscriptionsCommandDeck />}
      {mainTab === "growth" && <GrowthCommandDeck />}
      {mainTab === "signals-measurement" && <SignalsMeasurementCommandDeck />}
    </DataTablePageFrame>
  );
}

const KIND_META = {
  banners: { title: "إدارة بنرات الصفحة الرئيسية", singular: "بنر", imageLabel: "رابط صورة البنر" },
  promos: { title: "إدارة عروض الصفحة الرئيسية", singular: "عرض", imageLabel: "رابط صورة العرض" },
  categories: { title: "إدارة تصنيفات الصفحة الرئيسية", singular: "تصنيف", imageLabel: "رابط الأيقونة (اختياري)" },
} as const;

function MarketingHomeDiscoveryPanel({ kind }: { readonly kind: DshHomeAdminKind }) {
  const identity = useIdentitySession();
  const controller = useHomeDiscoveryAdminController(kind, identity.state.kind);
  const meta = KIND_META[kind];

  if (controller.state.kind === "loading") {
    return <CpStatePanel role="status" title="جاري تحميل المحتوى..." />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل البيانات" description={controller.state.message}>
        <CpButton onClick={controller.retry}>إعادة المحاولة</CpButton>
      </CpStatePanel>
    );
  }

  const items = controller.state.kind === "success" ? controller.state.items : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem", padding: "1rem" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{meta.title}</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <CpButton onClick={() => controller.select(null)}>إضافة {meta.singular}</CpButton>
            <CpButton onClick={controller.retry}>تحديث</CpButton>
          </div>
        </div>

        {controller.actionState.kind === "success" && (
          <p role="status" style={{ color: `var(--status-success-strong, ${colorRoles.brandStructure})`, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}
        {controller.actionState.kind === "error" && (
          <p role="alert" style={{ color: opsTheme.danger, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}

        {controller.state.kind === "empty" ? (
          <CpEmptyTableMessage>لا يوجد محتوى من هذا النوع. أضف أول عنصر.</CpEmptyTableMessage>
        ) : (
          <CpTable aria-label={meta.title}>
            <thead>
              <tr>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>الترتيب</CpTableHeaderCell>
                <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
                <CpTableHeaderCell>التحكم</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>{item.title}</CpTableCell>
                  <CpTableCell>{item.isActive ? "نشط" : "موقوف"}</CpTableCell>
                  <CpTableCell>{item.sortOrder}</CpTableCell>
                  <CpTableCell>
                    {item.actionType === "none" ? "بدون انتقال" : `${item.actionType}: ${item.actionTarget}`}
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CpButton onClick={() => controller.select(item)}>تعديل</CpButton>
                      <CpButton onClick={() => void controller.remove(item.id)}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && (
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.75rem", padding: "1.25rem" }}>
          <HomeDiscoveryEditor
            kind={kind}
            draft={controller.draft}
            setDraft={controller.setDraft}
            editing={controller.selected !== null && controller.selected.id !== ""}
            submitting={controller.actionState.kind === "submitting"}
            onSave={() => void controller.save(controller.draft)}
            onCancel={() => controller.select(null)}
          />
        </div>
      )}
    </div>
  );
}

function HomeDiscoveryEditor({
  kind,
  draft,
  setDraft,
  editing,
  submitting,
  onSave,
  onCancel,
}: {
  readonly kind: DshHomeAdminKind;
  readonly draft: DshHomeAdminContentInput;
  readonly setDraft: (value: DshHomeAdminContentInput) => void;
  readonly editing: boolean;
  readonly submitting: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  const meta = KIND_META[kind];
  const update = <K extends keyof DshHomeAdminContentInput>(key: K, value: DshHomeAdminContentInput[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
        {editing ? `تعديل ${meta.singular}` : `إضافة ${meta.singular}`}
      </h4>
      <CpTextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="العنوان" aria-label="العنوان" />
      {kind !== "categories" && (
        <CpTextInput value={draft.subtitle} onChange={(v) => update("subtitle", v)} placeholder="الوصف المختصر" aria-label="الوصف المختصر" />
      )}
      {kind === "promos" && (
        <CpTextInput value={draft.badgeLabel} onChange={(v) => update("badgeLabel", v)} placeholder="شارة العرض" aria-label="شارة العرض" />
      )}
      <CpTextInput value={draft.imageUrl} onChange={(v) => update("imageUrl", v)} placeholder={meta.imageLabel} aria-label={meta.imageLabel} />
      {kind !== "categories" && (
        <>
          <CpSelect
            value={draft.actionType}
            onChange={(v) => update("actionType", v as DshHomeAdminContentInput["actionType"])}
            options={[
              { value: "none", label: "بدون انتقال" },
              { value: "store", label: "متجر" },
              { value: "category", label: "تصنيف" },
              { value: "external", label: "رابط خارجي" },
            ]}
            aria-label="نوع الإجراء"
          />
          <CpTextInput value={draft.actionTarget} onChange={(v) => update("actionTarget", v)} placeholder="هدف الإجراء" aria-label="هدف الإجراء" />
        </>
      )}
      <CpTextInput value={String(draft.sortOrder)} onChange={(v) => update("sortOrder", Number.parseInt(v, 10) || 0)} placeholder="الترتيب" aria-label="الترتيب" />
      <CpSelect
        value={draft.isActive ? "active" : "inactive"}
        onChange={(v) => update("isActive", v === "active")}
        options={[
          { value: "active", label: "نشط" },
          { value: "inactive", label: "موقوف" },
        ]}
        aria-label="حالة النشر"
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <CpButton
          disabled={submitting || draft.title.trim().length < 2 || (kind !== "categories" && draft.imageUrl.trim().length === 0)}
          onClick={onSave}
          style={{ background: opsTheme.brand, color: opsTheme.textInverse, border: "none", borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}
        >
          {submitting ? "جاري الحفظ…" : "حفظ ونشر"}
        </CpButton>
        <CpButton onClick={onCancel} style={{ borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}>
          إلغاء
        </CpButton>
      </div>
    </div>
  );
}
