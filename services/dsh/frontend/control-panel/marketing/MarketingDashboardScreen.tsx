"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState } from "react";
import {
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  MARKETING_MAIN_TABS,
  useMarketingKpiMetricsController,
  useMarketingDeliverySignalsController,
  type MarketingMainTabId,
  type MarketingSectionTabId,
} from "../../shared/marketing";

// Import split command decks
import { TickerCommandDeck } from "./components/TickerCommandDeck";
import { VideoStudioCommandDeck } from "./components/VideoStudioCommandDeck";
import { CampaignsCommandDeck } from "./components/CampaignsCommandDeck";
import { PartnerOffersCommandDeck } from "./components/PartnerOffersCommandDeck";
import { ImageProductReviewCommandDeck } from "./components/ImageProductReviewCommandDeck";
import { GrowthCommandDeck } from "./components/GrowthCommandDeck";
import { SignalsMeasurementCommandDeck } from "./components/SignalsMeasurementCommandDeck";

// Import split dashboard sections
import { VisibilityGatesSection } from "./components/VisibilityGatesSection";
import { MarketingHomeDiscoveryPanel } from "./components/MarketingHomeDiscoveryPanel";

// ─── Main Tab button (underline style) ─────────────────────────────────────

function MainTabButton({
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

export function MarketingDashboardScreen() {
  const identity = useIdentitySession();

  const [mainTab, setMainTab] = useState<MarketingMainTabId>("visibility-gates");
  const [sectionTab, setSectionTab] = useState<MarketingSectionTabId>("eligibility");
  const { metrics } = useMarketingKpiMetricsController();
  const deliverySignals = useMarketingDeliverySignalsController();

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
            <CpKpiCard label="متاجر نشطة"      value={metrics.activeStoresRatio} />
            <CpKpiCard label="طلبات مكتملة"    value={metrics.deliveredOrders.toLocaleString("ar")} />
            <CpKpiCard label="تذاكر مفتوحة"    value={metrics.openTickets.toLocaleString("ar")} />
            <CpKpiCard label="تصعيدات مفتوحة" value={metrics.openEscalations.toLocaleString("ar")} />
          </CpKpiStrip>
          {!metrics.isBackedByApi && (
            <p role="status" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: colorRoles.brandAction, opacity: 0.85 }}>
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
        <VisibilityGatesSection
          sectionTab={sectionTab}
          setSectionTab={setSectionTab}
          metrics={metrics}
          deliverySignals={deliverySignals}
        />
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
      {mainTab === "growth" && <GrowthCommandDeck />}
      {mainTab === "signals-measurement" && <SignalsMeasurementCommandDeck />}
    </DataTablePageFrame>
  );
}
