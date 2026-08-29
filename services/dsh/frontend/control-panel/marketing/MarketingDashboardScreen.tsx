"use client";

import { useState } from "react";
import {
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTabs,
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
import { SignalsMeasurementCommandDeck } from "./components/SignalsMeasurementCommandDeck";
import { VisibilityGatesSection } from "./components/VisibilityGatesSection";
import { MarketingHomeDiscoveryPanel } from "./components/MarketingHomeDiscoveryPanel";
import { LoyaltyCommandDeck } from "./components/LoyaltyCommandDeck";
import { SubscriptionsCommandDeck } from "./components/SubscriptionsCommandDeck";
import { CouponsCommandDeck } from "./components/CouponsCommandDeck";
import { LoyaltyPolicyPanel } from "./components/LoyaltyPolicyPanel";
import { StorePublicationCommandPanel } from "./components/StorePublicationCommandPanel";

export function MarketingDashboardScreen() {
  const [mainTab, setMainTab] = useState<MarketingMainTabId>("visibility-gates");
  const { metrics, reload: reloadMetrics } = useMarketingKpiMetricsController();
  const deliverySignals = useMarketingDeliverySignalsController();

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="تسويق DSH">
          <CpMutedInline tight>إدارة المحتوى والحملات والعروض والكوبونات والبرامج التجارية المرتبطة بعقود DSH وWLT الفعلية</CpMutedInline>
        </CpPageHeader>
      }
      toolbar={
        <CpTabs
          items={MARKETING_MAIN_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
          value={mainTab}
          onChange={(value) => setMainTab(value as MarketingMainTabId)}
          aria-label="أقسام التسويق"
        />
      }
    >
      {metrics.isBackedByApi ? (
        <CpKpiStrip>
          <CpKpiCard label="متاجر نشطة" value={metrics.activeStoresRatio} />
          <CpKpiCard label="طلبات مكتملة" value={metrics.deliveredOrders.toLocaleString("ar")} />
          <CpKpiCard label="تذاكر مفتوحة" value={metrics.openTickets.toLocaleString("ar")} />
          <CpKpiCard label="تصعيدات مفتوحة" value={metrics.openEscalations.toLocaleString("ar")} />
        </CpKpiStrip>
      ) : (
        <CpStatePanel
          role="alert"
          title="تعذر إثبات مؤشرات التسويق"
          description={metrics.disclosureReason ?? "تعذر تحميل مؤشرات DSH؛ لن تُعرض أرقام صفرية بديلة كأنها حقيقة تشغيلية."}
        >
          <CpRetryButton onClick={() => void reloadMetrics()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      )}

      {mainTab === "visibility-gates" ? <VisibilityGatesSection deliverySignals={deliverySignals} /> : null}
      {mainTab === "store-publication" ? <StorePublicationCommandPanel /> : null}
      {mainTab === "banners-carousel" ? <MarketingHomeDiscoveryPanel kind="banners" /> : null}
      {mainTab === "homepage-promos" ? <MarketingHomeDiscoveryPanel kind="promos" /> : null}
      {mainTab === "smart-bar" ? <TickerCommandDeck /> : null}
      {mainTab === "campaigns" ? <CampaignsCommandDeck /> : null}
      {mainTab === "partner-offers" ? <PartnerOffersCommandDeck /> : null}
      {mainTab === "coupons" ? <CouponsCommandDeck /> : null}
      {mainTab === "loyalty" ? <><LoyaltyCommandDeck /><LoyaltyPolicyPanel /></> : null}
      {mainTab === "subscriptions" ? <SubscriptionsCommandDeck /> : null}
      {mainTab === "signals-measurement" ? <SignalsMeasurementCommandDeck /> : null}
    </DataTablePageFrame>
  );
}
