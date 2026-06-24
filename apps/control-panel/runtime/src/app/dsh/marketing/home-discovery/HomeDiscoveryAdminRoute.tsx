"use client";

import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "@bthwani/app-shell";
import { HomeDiscoveryAdminScreen } from "@dsh-cp/marketing/home-discovery";
import { useRouter } from "next/navigation";

type HomeDiscoveryAdminKind = "banners" | "promos" | "categories";

export function HomeDiscoveryAdminRoute({ kind }: { readonly kind: HomeDiscoveryAdminKind }) {
  const router = useRouter();

  const handleSectionPress = (section: string) => {
    if (section === "partners") router.push("/dsh/partners/stores");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing/home-discovery/banners");
  };

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
          items={[
            { section: "partners", label: "إدارة المتاجر" },
            { section: "catalogs", label: "اعتماد الكتالوجات" },
            { section: "marketing", label: "التسويق واكتشاف الصفحة" },
          ]}
          activeSection="marketing"
          onSectionPress={handleSectionPress}
        />
      }
      main={<HomeDiscoveryAdminScreen kind={kind} />}
    />
  );
}
