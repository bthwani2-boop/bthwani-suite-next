"use client";

import { CheckoutActivityScreen } from "@dsh-cp/operations/CheckoutActivityScreen";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "../../../shell";
import { useRouter } from "next/navigation";

export default function DshOperationsPage() {
  const router = useRouter();

  const handleSectionPress = (section: string) => {
    if (section === "dashboard") router.push("/");
    if (section === "operations") router.push("/dsh/operations");
    if (section === "partners") router.push("/dsh/partners/stores");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing");
  };

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم — DSH</strong>} serviceLabel={<span>operations / checkout</span>} />}
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
          activeSection="operations"
          onSectionPress={handleSectionPress}
        />
      }
      main={<CheckoutActivityScreen />}
    />
  );
}
