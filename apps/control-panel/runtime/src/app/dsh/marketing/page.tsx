"use client";

import { useState } from "react";
import { HomeDiscoveryAdminScreen } from "@dsh-cp/marketing/home-discovery";
import { DshPage } from "../../../shell";

type HomeDiscoveryAdminKind = "banners" | "promos" | "categories";

const TABS = [
  { id: "banners",    label: "البنرات" },
  { id: "promos",     label: "العروض" },
  { id: "categories", label: "التصنيفات" },
] as const;

export default function MarketingPage() {
  const [kind, setKind] = useState<HomeDiscoveryAdminKind>("banners");

  return (
    <DshPage activeSection="marketing" sectionLabel="التسويق والاكتشاف">
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.875rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
          flexShrink: 0,
          direction: "rtl",
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKind(tab.id)}
              style={{
                padding: "0.4rem 1.25rem",
                borderRadius: "0.5rem",
                border: `1px solid ${kind === tab.id ? "rgb(59,123,255)" : "var(--dsh-card-border)"}`,
                background: kind === tab.id ? "rgba(59,123,255,0.08)" : "transparent",
                color: kind === tab.id ? "rgb(59,123,255)" : "var(--dsh-text-secondary)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                fontFamily: "var(--font-arabic)",
                cursor: "pointer",
                transition: "all 0.15s ease",
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
    </DshPage>
  );
}
