"use client";

import { CatalogApprovalScreen } from "@dsh-cp/catalogs/CatalogApprovalScreen";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "@bthwani/app-shell";
import { useRouter } from "next/navigation";

export default function DshCatalogsPage() {
  const router = useRouter();

  const handleSectionPress = (section: string) => {
    if (section === "dashboard") router.push("/");
    if (section === "partners") router.push("/dsh/partners/stores");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing");
  };

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم — DSH</strong>} serviceLabel={<span>catalogs / approvals</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            { section: "dashboard", label: "الرئيسية" },
            { section: "partners", label: "إدارة المتاجر" },
            { section: "catalogs", label: "اعتماد الكتالوجات" },
            { section: "marketing", label: "التسويق واكتشاف الصفحة" },
          ]}
          activeSection="catalogs"
          onSectionPress={handleSectionPress}
        />
      }
      main={<CatalogApprovalScreen />}
    />
  );
}
