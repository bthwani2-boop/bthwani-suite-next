"use client";

import { useState } from "react";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";
import { HomeDiscoveryAdminScreen } from "@dsh-cp/marketing/home-discovery";

type HomeDiscoveryAdminKind = "banners" | "promos" | "categories";

export default function MarketingPage() {
  const { items, handleSectionPress } = useDshNavigation();
  const [kind, setKind] = useState<HomeDiscoveryAdminKind>("banners");

  const tabs = [
    { id: "banners",     label: "البنرات الإعلانية" },
    { id: "promos",      label: "العروض الخاصة" },
    { id: "categories",  label: "التصنيفات الترويجية" },
  ] as const;

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>التسويق والاكتشاف</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="marketing"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Premium Tabs Bar */}
          <div
            style={{
              display: "flex",
              gap: "0.375rem",
              padding: "0.875rem 1.5rem",
              background: "var(--card-bg, rgb(255, 255, 255))",
              borderBottom: "1px solid var(--card-border, rgb(226, 232, 243))",
              direction: "rtl",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKind(tab.id)}
                style={{
                  padding: "0.45rem 1.1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: kind === tab.id
                    ? "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))"
                    : "transparent",
                  color: kind === tab.id ? "rgb(255, 255, 255)" : "var(--text-secondary, rgb(90, 106, 133))",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-arabic, 'Cairo', sans-serif)",
                  transition: "all 0.18s ease",
                  boxShadow: kind === tab.id ? "0 2px 8px rgba(59,123,255,0.3)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <HomeDiscoveryAdminScreen kind={kind} />
          </div>
        </div>
      }
    />
  );
}
