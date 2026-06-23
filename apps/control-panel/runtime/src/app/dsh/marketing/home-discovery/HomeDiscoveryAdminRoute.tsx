"use client";

import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "@bthwani/app-shell";
import { HomeDiscoveryAdminScreen } from "@dsh-cp/marketing/home-discovery";

type HomeDiscoveryAdminKind = "banners" | "promos" | "categories";

export function HomeDiscoveryAdminRoute({ kind }: { readonly kind: HomeDiscoveryAdminKind }) {
  const labels = {
    banners: "البنرات",
    promos: "العروض",
    categories: "التصنيفات",
  } as const;
  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم — DSH</strong>}
          serviceLabel={<span>marketing / home-discovery / {kind}</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[{ section: "marketing", label: `اكتشاف الصفحة — ${labels[kind]}` }]}
          activeSection="marketing"
        />
      }
      main={<HomeDiscoveryAdminScreen kind={kind} />}
    />
  );
}
