"use client";

import { useState } from "react";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "@bthwani/app-shell";
import { HomeDiscoveryAdminScreen } from "@dsh-cp/marketing/home-discovery";
import { useRouter } from "next/navigation";

type HomeDiscoveryAdminKind = "banners" | "promos" | "categories";

export default function MarketingPage() {
  const router = useRouter();
  const [kind, setKind] = useState<HomeDiscoveryAdminKind>("banners");

  const handleSectionPress = (section: string) => {
    if (section === "dashboard") router.push("/");
    if (section === "operations") router.push("/dsh/operations");
    if (section === "partners") router.push("/dsh/partners/stores");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing");
  };

  const tabs = [
    { id: "banners", label: "البنرات" },
    { id: "promos", label: "العروض" },
    { id: "categories", label: "التصنيفات" },
  ] as const;

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم — DSH</strong>}
          serviceLabel={<span>marketing / home-discovery</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            { section: "dashboard", label: "الرئيسية" },
            { section: "operations", label: "العمليات" },
            { section: "partners", label: "إدارة المتاجر" },
            { section: "catalogs", label: "اعتماد الكتالوجات" },
            { section: "marketing", label: "التسويق واكتشاف الصفحة" },
          ]}
          activeSection="marketing"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Tabs Switcher Bar */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              padding: "1rem 2rem",
              background: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
              direction: "rtl",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKind(tab.id)}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid",
                  borderColor: kind === tab.id ? "#3b82f6" : "#e5e7eb",
                  background: kind === tab.id ? "#eff6ff" : "#ffffff",
                  color: kind === tab.id ? "#2563eb" : "#4b5563",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
