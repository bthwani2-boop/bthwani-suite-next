"use client";

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
  MARKETING_SUB_TABS,
  MARKETING_SECTION_TABS,
  GOVERNANCE_BRIDGES,
  PARTNER_GATE_CARDS,
  PRODUCT_GATE_CARDS,
  DELIVERY_SIGNAL_CARDS,
  buildMarketingKpiMetrics,
  getMarketingSubTabsForMain,
  type MarketingMainTabId,
  type MarketingSubTabId,
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

// â”€â”€â”€ Main Tab button (underline style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        borderBottom: active ? "2px solid #FF500D" : "2px solid transparent",
        color: active ? "#FF500D" : "currentColor",
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

// â”€â”€â”€ Tab button (pill style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabButton({
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
        padding: "0.5rem 1rem",
        background: active ? "#FF500D" : "transparent",
        color: active ? "#FFF" : "currentColor",
        border: active ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        borderRadius: "0.5rem",
        fontWeight: active ? 700 : 500,
        fontSize: "0.813rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// â”€â”€â”€ Section Tab button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        background: active ? "#FEE2E2" : "transparent",
        color: active ? "#991B1B" : "currentColor",
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
  const [subTab, setSubTab] = useState<MarketingSubTabId>("review-queue");
  const [sectionTab, setSectionTab] = useState<MarketingSectionTabId>("eligibility");
  const [bypassedGates, setBypassedGates] = useState<Set<string>>(new Set());

  const subTabs = getMarketingSubTabsForMain(mainTab);
  const metrics = useMemo(() => buildMarketingKpiMetrics(), []);

  // â”€â”€ Auth gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <h2 style={{ margin: 0, textAlign: "right" }}>ØªØ³ÙˆÙŠÙ‚ DSH</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            ÙŠØªØ·Ù„Ø¨ Ø­Ø³Ø§Ø¨ operator Ù…ØµØ±Ø­ Ø¨Ù‡ Ù„Ù„ÙˆØµÙˆÙ„ Ù„Ù„Ø­ÙˆÙƒÙ…Ø© Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠØ©.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            ØªØ¬Ø§ÙˆØ² ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ (Ù…Ø·ÙˆØ±)
          </CpButton>
        </div>
      </section>
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="ØªØ³ÙˆÙŠÙ‚ DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            Ø­ÙˆÙƒÙ…Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠ ÙˆØ§Ù„Ù†Ù…Ùˆ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠ
          </p>

          {/* â”€â”€ KPI Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <CpKpiStrip>
            <CpKpiCard label="Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø´Ø±ÙƒØ§Ø¡"    value={metrics.partnerGatesActive} />
            <CpKpiCard label="Ù…Ù†ØªØ¬Ø§Øª Ù…Ø­Ø¬ÙˆØ¨Ø©"    value={metrics.blockedProductsActive} />
            <CpKpiCard label="Ø¸Ù‡ÙˆØ± ØªØ¬Ø§Ø±ÙŠ"       value={`${metrics.commercialVisibilityBlocked} Ù…Ø­Ø¬ÙˆØ¨ Ø­Ø§Ù„ÙŠØ§Ù‹`} />
            <CpKpiCard label="Ø¥Ø´Ø§Ø±Ø§Øª ØºÙŠØ± Ù…Ù‚Ø±ÙˆØ¡Ø©" value={`${metrics.unreadSignalsCount} (${metrics.promoCandidatesCount} Ù…Ø±Ø´Ø­ÙŠÙ† ØªØ±ÙˆÙŠØ¬)`} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
      {/* â”€â”€ Main Tab Navigation (matching underline style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            onClick={() => {
              setMainTab(t.id);
              const subs = getMarketingSubTabsForMain(t.id);
              if (subs.length > 0) setSubTab(subs[0]!.id);
            }}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* â”€â”€ Sub-Tabs (Pills) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {subTabs.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1rem", flexWrap: "wrap" }}>
          {subTabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>
      )}

      {/* â”€â”€ Main Dashboard Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
          {/* â”€â”€ Right Column: Interactive Gates & Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Section Tabs: Ø§Ù„Ø£Ù‡Ù„ÙŠØ© / Ø§Ù„ÙƒØ¨Øª / Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ / Ø§Ù„Ø´Ø±Ø§Ø¦Ø­ */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                background: "#F1F5F9",
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
              <span style={{ fontWeight: 600, opacity: 0.8 }}>Ø¬Ø³ÙˆØ± Ø§Ù„Ø­ÙˆÙƒÙ…Ø© Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ©:</span>
              {GOVERNANCE_BRIDGES.map((bridge) => (
                <a
                  key={bridge.id}
                  href={bridge.targetRoute}
                  style={{
                    color: opsTheme.brand,
                    textDecoration: "none",
                    fontWeight: 600,
                    background: "#FFF7F5",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #FFD8CC",
                  }}
                >
                  {bridge.label}
                </a>
              ))}
            </div>

            {/* Visibility Gates Intro Header */}
            <div
              style={{
                background: "#FFF",
                border: "1px solid #E2E8F0",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem", color: opsTheme.danger, fontSize: "1.05rem" }}>
                Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¸Ù‡ÙˆØ± Ø¹Ø¨Ø± Ø§Ù„Ø£Ø³Ø·Ø­
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6 }}>
                Ø¨ÙˆØ§Ø¨Ø© ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø´Ø±ÙƒØ§Ø¡ ØªØªØ­Ù‚Ù‚ Ù…Ù† Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ù…ØªØ¬Ø± Ù‚Ø¨Ù„ Ø¥Ø·Ù„Ø§Ù‚ Ø£ÙŠ Ø¹Ø±ÙˆØ¶ ØªØ³ÙˆÙŠÙ‚ÙŠØ©. Ø¨ÙˆØ§Ø¨Ø© Ù†Ø´Ø± Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ØªØ¶Ù…Ù† Ø³Ù„Ø§Ù…Ø© Ù…ÙˆØ§ØµÙØ§Øª ÙˆØµÙˆØ± Ø§Ù„Ù…Ù†ØªØ¬ Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø±. ØªÙˆÙ‚Ø¹Ø§Øª Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„ØªØ¬Ø§Ø±ÙŠ ØªÙ‚ØªØµØ± Ø¹Ù„Ù‰ Ù…Ø­Ø§ÙƒØ§Ø© Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø±Ø¦ÙŠØ© Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡. Ù‚Ù†ÙˆØ§Øª Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ ØªØ¹Ù…Ù„ Ø¹Ù„Ù‰ ØªØ²Ø§Ù…Ù† Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ù„Ø­Ø¸ÙŠØ§Ù‹ ÙˆØ¨Ø¯ÙˆÙ† ØªØ¯Ø§Ø®Ù„.
              </p>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <CpButton style={{ background: opsTheme.brand, color: opsTheme.textInverse, border: "none", borderRadius: "0.5rem", padding: "0.45rem 1rem", cursor: "pointer" }}>
                  Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø´Ø±ÙƒØ§Ø¡
                </CpButton>
                <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
                  Ø§Ù„Ø­Ù…Ù„Ø§Øª
                </CpButton>
                <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
                  Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…ÙŠØ¯ÙŠØ§
                </CpButton>
                <CpButton style={{ borderRadius: "0.5rem", padding: "0.45rem 1rem" }}>
                  Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª
                </CpButton>
              </div>
            </div>

            {/* Eligibility Card Block */}
            <div
              style={{
                background: "#FFF",
                border: "1px solid #E2E8F0",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Ø£Ù‡Ù„ÙŠØ© Ø§Ù„Ø¸Ù‡ÙˆØ± / Ù…ÙˆØ§Ù†Ø¹ Ø§Ù„Ù†Ø´Ø± / Ø³Ø¬Ù„Ø§Øª Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆØ§Ù„Ø´Ø±Ø§Ø¦Ø­
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>Ù…Ù„Ø®Øµ Ø§Ù„Ø­ÙˆÙƒÙ…Ø©</span>
                  <span style={{ background: opsTheme.dangerSurface, color: 'var(--status-danger-strong, #991B1B)', padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700, fontSize: "0.85rem" }}>
                    0
                  </span>
                  <span style={{ fontSize: "0.75rem", color: 'var(--status-danger-strong, #991B1B)', fontWeight: 600 }}>eligibility</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>
                Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØªÙˆØ§ÙÙ‚ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ø­Ù…Ù„Ø§Øª ÙˆØ§Ù„Ø´Ø±ÙƒØ§Ø¡ Ù…Ø¹ Ø³ÙŠØ§Ø³Ø§Øª Ø§Ù„Ù†Ø´Ø± Ø¯ÙˆÙ† ØªØ¬Ø§ÙˆØ² Ø¶ÙˆØ§Ø¨Ø· Ø§Ù„ØªÙØ¹ÙŠÙ„.
              </p>
            </div>

            {/* â”€â”€ Section: Ø¨ÙˆØ§Ø¨Ø© ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø´Ø±ÙŠÙƒ Ø¥Ù„Ù‰ Ø§Ù„Ø¸Ù‡ÙˆØ± â”€â”€ */}
            <div>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
                Ø¨ÙˆØ§Ø¨Ø© ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø´Ø±ÙŠÙƒ Ø¥Ù„Ù‰ Ø§Ù„Ø¸Ù‡ÙˆØ±
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {PARTNER_GATE_CARDS.map((card) => {
                  const isBypassed = bypassedGates.has(card.id);
                  return (
                    <div
                      key={card.id}
                      style={{
                        background: "#FFF",
                        border: "1px solid #E2E8F0",
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
                            background: isBypassed ? "#D1FAE5" : card.statusColor + "15",
                            color: isBypassed ? "#065F46" : card.statusColor,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontWeight: 600,
                            fontSize: "0.72rem",
                          }}
                        >
                          {isBypassed ? "ØªÙ… Ø§Ù„ØªØ¬Ø§ÙˆØ² Ø¨Ù†Ø¬Ø§Ø­" : card.statusTag}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", opacity: 0.55, display: "flex", gap: "1rem" }}>
                        <span>Ø§Ù„Ù…Ø§Ù„Ùƒ: {card.owner}</span>
                        <span>Ø§Ù„Ø³Ø·Ø­ Ø§Ù„Ù…ØªØ£Ø«Ø±: {card.surface}</span>
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
                              background: "#D1FAE5",
                              color: 'var(--status-success-strong, #065F46)',
                              border: "1px solid #6EE7B7",
                              borderRadius: "0.5rem",
                            }}
                          >
                            ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©
                          </CpButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* â”€â”€ Section: Ø¨ÙˆØ§Ø¨Ø© Ù†Ø´Ø± Ø§Ù„Ù…Ù†ØªØ¬ â”€â”€ */}
            <div>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
                Ø¨ÙˆØ§Ø¨Ø© Ù†Ø´Ø± Ø§Ù„Ù…Ù†ØªØ¬
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {PRODUCT_GATE_CARDS.map((card) => {
                  const isBypassed = bypassedGates.has(card.id);
                  return (
                    <div
                      key={card.id}
                      style={{
                        background: "#FFF",
                        border: "1px solid #E2E8F0",
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
                            background: isBypassed ? "#D1FAE5" : "#FFF1F2",
                            color: isBypassed ? "#065F46" : "#E11D48",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontWeight: 600,
                            fontSize: "0.72rem",
                          }}
                        >
                          {isBypassed ? "ØªÙ… Ø§Ù„ØªØ¬Ø§ÙˆØ² Ø¨Ù†Ø¬Ø§Ø­" : card.statusTag}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", opacity: 0.55, display: "flex", gap: "1rem" }}>
                        <span>Ø§Ù„Ù…ÙˆØ§Ù†Ø¹: {card.restrictionsCount}</span>
                        <span>Ø§Ù„Ù†Ø´Ø± Ù…Ø­Ø¬ÙˆØ¨</span>
                        <span>Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø´Ø±ÙŠÙƒ: {card.partnerGateStatus}</span>
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
                              background: "#D1FAE5",
                              color: 'var(--status-success-strong, #065F46)',
                              border: "1px solid #6EE7B7",
                              borderRadius: "0.5rem",
                            }}
                          >
                            ØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ÙˆØ§Ù†Ø¹
                          </CpButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* â”€â”€ Left Column: Quick Decision & Signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Quick Decision Board */}
            <div
              style={{
                background: "#FFF",
                border: "1px solid #E2E8F0",
                borderRadius: "0.75rem",
                padding: "1.25rem",
              }}
            >
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700 }}>
                Ù„ÙˆØ­Ø© Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ø³Ø±ÙŠØ¹
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
                  <span style={{ opacity: 0.7 }}>Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø´Ø±ÙƒØ§Ø¡:</span>
                  <strong style={{ color: opsTheme.brand }}>{metrics.partnerGatesActive} Ù…Ø³Ø§Ø±Ø§Øª Ù†Ø´Ø·Ø©</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
                  <span style={{ opacity: 0.7 }}>Ù…Ù†ØªØ¬Ø§Øª Ù…Ø­Ø¬ÙˆØ¨Ø©:</span>
                  <strong>{metrics.blockedProductsActive} Ù…ÙˆØ§Ù†Ø¹ Ù†Ø´Ø·Ø©</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.813rem" }}>
                  <span style={{ opacity: 0.7 }}>Ø¸Ù‡ÙˆØ± ØªØ¬Ø§Ø±ÙŠ:</span>
                  <strong style={{ color: 'var(--status-success-strong, #065F46)' }}>{metrics.commercialVisibilityBlocked} Ù…Ø­Ø¬ÙˆØ¨ Ø­Ø§Ù„ÙŠØ§Ù‹</strong>
                </div>
              </div>
            </div>

            {/* Delivery Signals to Marketing */}
            <div
              style={{
                background: "#FFF",
                border: "1px solid #E2E8F0",
                borderRadius: "0.75rem",
                padding: "1.25rem",
              }}
            >
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700 }}>
                Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¥Ù„Ù‰ Ø§Ù„ØªØ³ÙˆÙŠÙ‚
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {DELIVERY_SIGNAL_CARDS.map((signal) => (
                  <div
                    key={signal.id}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
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
                        background: signal.isApproved ? "#D1FAE5" : "#FFF3CD",
                        color: signal.isApproved ? "#065F46" : "#92400E",
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
                      ÙØªØ­ Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª
                    </CpButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Banners Tab â”€â”€ */}
      {mainTab === "banners-carousel" && (
        <MarketingHomeDiscoveryPanel kind="banners" />
      )}

      {/* â”€â”€ Promos Tab â”€â”€ */}
      {mainTab === "homepage-promos" && (
        <MarketingHomeDiscoveryPanel kind="promos" />
      )}

      {/* ─── Smart Bar / Tickers Tab ─── */}
      {mainTab === "smart-bar" && (
        <TickerCommandDeck />
      )}

      {/* â”€â”€ Placeholder for other tabs â”€â”€ */}
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
  banners: { title: "Ø¥Ø¯Ø§Ø±Ø© Ø¨Ù†Ø±Ø§Øª Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©", singular: "Ø¨Ù†Ø±", imageLabel: "Ø±Ø§Ø¨Ø· ØµÙˆØ±Ø© Ø§Ù„Ø¨Ù†Ø±" },
  promos: { title: "Ø¥Ø¯Ø§Ø±Ø© Ø¹Ø±ÙˆØ¶ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©", singular: "Ø¹Ø±Ø¶", imageLabel: "Ø±Ø§Ø¨Ø· ØµÙˆØ±Ø© Ø§Ù„Ø¹Ø±Ø¶" },
  categories: { title: "Ø¥Ø¯Ø§Ø±Ø© ØªØµÙ†ÙŠÙØ§Øª Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©", singular: "ØªØµÙ†ÙŠÙ", imageLabel: "Ø±Ø§Ø¨Ø· Ø§Ù„Ø£ÙŠÙ‚ÙˆÙ†Ø© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)" },
} as const;

function MarketingHomeDiscoveryPanel({ kind }: { readonly kind: DshHomeAdminKind }) {
  const identity = useIdentitySession();
  const controller = useHomeDiscoveryAdminController(kind, identity.state.kind);
  const meta = KIND_META[kind];

  if (controller.state.kind === "loading") {
    return <CpStatePanel role="status" title="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø­ØªÙˆÙ‰..." />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª" description={controller.state.message}>
        <CpButton onClick={controller.retry}>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</CpButton>
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
            <CpButton onClick={() => controller.select(null)}>Ø¥Ø¶Ø§ÙØ© {meta.singular}</CpButton>
            <CpButton onClick={controller.retry}>ØªØ­Ø¯ÙŠØ«</CpButton>
          </div>
        </div>

        {controller.actionState.kind === "success" && (
          <p role="status" style={{ color: 'var(--status-success-strong, #065F46)', fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}
        {controller.actionState.kind === "error" && (
          <p role="alert" style={{ color: opsTheme.danger, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}

        {controller.state.kind === "empty" ? (
          <CpEmptyTableMessage>Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø­ØªÙˆÙ‰ Ù…Ù† Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹. Ø£Ø¶Ù Ø£ÙˆÙ„ Ø¹Ù†ØµØ±.</CpEmptyTableMessage>
        ) : (
          <CpTable aria-label={meta.title}>
            <thead>
              <tr>
                <CpTableHeaderCell>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</CpTableHeaderCell>
                <CpTableHeaderCell>Ø§Ù„Ø­Ø§Ù„Ø©</CpTableHeaderCell>
                <CpTableHeaderCell>Ø§Ù„ØªØ±ØªÙŠØ¨</CpTableHeaderCell>
                <CpTableHeaderCell>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</CpTableHeaderCell>
                <CpTableHeaderCell>Ø§Ù„ØªØ­ÙƒÙ…</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>{item.title}</CpTableCell>
                  <CpTableCell>{item.isActive ? "Ù†Ø´Ø·" : "Ù…ÙˆÙ‚ÙˆÙ"}</CpTableCell>
                  <CpTableCell>{item.sortOrder}</CpTableCell>
                  <CpTableCell>
                    {item.actionType === "none" ? "Ø¨Ø¯ÙˆÙ† Ø§Ù†ØªÙ‚Ø§Ù„" : `${item.actionType}: ${item.actionTarget}`}
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CpButton onClick={() => controller.select(item)}>ØªØ¹Ø¯ÙŠÙ„</CpButton>
                      <CpButton onClick={() => void controller.remove(item.id)}>Ø­Ø°Ù</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "0.75rem", padding: "1.25rem" }}>
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
        {editing ? `ØªØ¹Ø¯ÙŠÙ„ ${meta.singular}` : `Ø¥Ø¶Ø§ÙØ© ${meta.singular}`}
      </h4>
      <CpTextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" aria-label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" />
      {kind !== "categories" && (
        <CpTextInput value={draft.subtitle} onChange={(v) => update("subtitle", v)} placeholder="Ø§Ù„ÙˆØµÙ Ø§Ù„Ù…Ø®ØªØµØ±" aria-label="Ø§Ù„ÙˆØµÙ Ø§Ù„Ù…Ø®ØªØµØ±" />
      )}
      {kind === "promos" && (
        <CpTextInput value={draft.badgeLabel} onChange={(v) => update("badgeLabel", v)} placeholder="Ø´Ø§Ø±Ø© Ø§Ù„Ø¹Ø±Ø¶" aria-label="Ø´Ø§Ø±Ø© Ø§Ù„Ø¹Ø±Ø¶" />
      )}
      <CpTextInput value={draft.imageUrl} onChange={(v) => update("imageUrl", v)} placeholder={meta.imageLabel} aria-label={meta.imageLabel} />
      {kind !== "categories" && (
        <>
          <CpSelect
            value={draft.actionType}
            onChange={(v) => update("actionType", v as DshHomeAdminContentInput["actionType"])}
            options={[
              { value: "none", label: "Ø¨Ø¯ÙˆÙ† Ø§Ù†ØªÙ‚Ø§Ù„" },
              { value: "store", label: "Ù…ØªØ¬Ø±" },
              { value: "category", label: "ØªØµÙ†ÙŠÙ" },
              { value: "external", label: "Ø±Ø§Ø¨Ø· Ø®Ø§Ø±Ø¬ÙŠ" },
            ]}
            aria-label="Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡"
          />
          <CpTextInput value={draft.actionTarget} onChange={(v) => update("actionTarget", v)} placeholder="Ù‡Ø¯Ù Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" aria-label="Ù‡Ø¯Ù Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" />
        </>
      )}
      <CpTextInput value={String(draft.sortOrder)} onChange={(v) => update("sortOrder", Number.parseInt(v, 10) || 0)} placeholder="Ø§Ù„ØªØ±ØªÙŠØ¨" aria-label="Ø§Ù„ØªØ±ØªÙŠØ¨" />
      <CpSelect
        value={draft.isActive ? "active" : "inactive"}
        onChange={(v) => update("isActive", v === "active")}
        options={[
          { value: "active", label: "Ù†Ø´Ø·" },
          { value: "inactive", label: "Ù…ÙˆÙ‚ÙˆÙ" },
        ]}
        aria-label="Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø´Ø±"
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <CpButton
          disabled={submitting || draft.title.trim().length < 2 || (kind !== "categories" && draft.imageUrl.trim().length === 0)}
          onClick={onSave}
          style={{ background: opsTheme.brand, color: opsTheme.textInverse, border: "none", borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}
        >
          {submitting ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸â€¦" : "Ø­ÙØ¸ ÙˆÙ†Ø´Ø±"}
        </CpButton>
        <CpButton onClick={onCancel} style={{ borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}>
          Ø¥Ù„ØºØ§Ø¡
        </CpButton>
      </div>
    </div>
  );
}




