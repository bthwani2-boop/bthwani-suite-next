"use client";

import { colorRoles } from "@bthwani/ui-kit";
import { useState, type ReactNode } from "react";
import {
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  MARKETING_MAIN_TABS,
  useMarketingKpiMetricsController,
  useMarketingDeliverySignalsController,
  type MarketingMainTabId,
} from "../../shared/marketing";
import { TickerCommandDeck } from "./components/TickerCommandDeck";
import { CampaignsCommandDeck } from "./components/CampaignsCommandDeck";
import { PartnerOffersCommandDeck } from "./components/PartnerOffersCommandDeck";
import { LoyaltyCommandDeck } from "./components/LoyaltyCommandDeck";
import { SubscriptionsCommandDeck } from "./components/SubscriptionsCommandDeck";
import { SignalsMeasurementCommandDeck } from "./components/SignalsMeasurementCommandDeck";
import { VisibilityGatesSection } from "./components/VisibilityGatesSection";
import { MarketingHomeDiscoveryPanel } from "./components/MarketingHomeDiscoveryPanel";

function MainTabButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
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
      }}
    >
      {children}
    </button>
  );
}

export function MarketingDashboardScreen() {
  const [mainTab, setMainTab] = useState<MarketingMainTabId>("visibility-gates");
  const { metrics, reload: reloadMetrics } = useMarketingKpiMetricsController();
  const deliverySignals = useMarketingDeliverySignalsController();

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="تسويق DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            إدارة المحتوى والحملات والعروض والبرامج التجارية المرتبطة بعقود DSH الفعلية
          </p>

          <CpKpiStrip>
            <CpKpiCard label="متاجر نشطة" value={metrics.activeStoresRatio} />
            <CpKpiCard label="طلبات مكتملة" value={metrics.deliveredOrders.toLocaleString("ar")} />
            <CpKpiCard label="تذاكر مفتوحة" value={metrics.openTickets.toLocaleString("ar")} />
            <CpKpiCard label="تصعيدات مفتوحة" value={metrics.openEscalations.toLocaleString("ar")} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
      <nav
        aria-label="أقسام التسويق"
        dir="rtl"
        style={{
          display: "flex",
          borderBottom: `1px solid ${colorRoles.borderSubtle}`,
          padding: "0 1rem",
          gap: "0.25rem",
          marginBottom: "0.75rem",
          overflowX: "auto",
        }}
      >
        {MARKETING_MAIN_TABS.map((tab) => (
          <MainTabButton
            key={tab.id}
            active={mainTab === tab.id}
            onClick={() => setMainTab(tab.id)}
          >
            {tab.label}
          </MainTabButton>
        ))}
      </nav>

      {mainTab === "visibility-gates" ? (
        <VisibilityGatesSection
          metrics={metrics}
          reloadMetrics={reloadMetrics}
          deliverySignals={deliverySignals}
        />
      ) : null}
      {mainTab === "banners-carousel" ? <MarketingHomeDiscoveryPanel kind="banners" /> : null}
      {mainTab === "homepage-promos" ? <MarketingHomeDiscoveryPanel kind="promos" /> : null}
      {mainTab === "smart-bar" ? <TickerCommandDeck /> : null}
      {mainTab === "campaigns" ? <CampaignsCommandDeck /> : null}
      {mainTab === "partner-offers" ? <PartnerOffersCommandDeck /> : null}
      {mainTab === "loyalty" ? <LoyaltyCommandDeck /> : null}
      {mainTab === "subscriptions" ? <SubscriptionsCommandDeck /> : null}
      {mainTab === "signals-measurement" ? <SignalsMeasurementCommandDeck /> : null}
    </DataTablePageFrame>
  );
}
