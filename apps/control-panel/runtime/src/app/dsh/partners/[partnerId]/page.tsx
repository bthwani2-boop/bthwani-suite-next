"use client";

import { PartnerDetailScreen } from "@dsh-cp/partners";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
} from "../../../../shell";
import { useRouter, useParams } from "next/navigation";

export default function DshPartnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = typeof params["partnerId"] === "string" ? params["partnerId"] : "";

  const handleSectionPress = (section: string) => {
    if (section === "dashboard") router.push("/");
    if (section === "operations") router.push("/dsh/operations");
    if (section === "partners") router.push("/dsh/partners");
    if (section === "catalogs") router.push("/dsh/catalogs");
    if (section === "marketing") router.push("/dsh/marketing");
    if (section === "platform") router.push("/dsh/platform");
    if (section === "administration") router.push("/dsh/administration");
  };

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم — DSH</strong>}
          serviceLabel={
            <span
              role="button"
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => router.push("/dsh/partners")}
            >
              الشركاء
            </span>
          }
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            { section: "dashboard", label: "الرئيسية" },
            { section: "operations", label: "العمليات" },
            { section: "partners", label: "الشركاء" },
            { section: "catalogs", label: "الكتالوجات" },
            { section: "marketing", label: "التسويق" },
            { section: "platform", label: "المنصة" },
            { section: "administration", label: "الإدارة" },
          ]}
          activeSection="partners"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <PartnerDetailScreen
          partnerId={partnerId}
          onBack={() => router.push("/dsh/partners")}
        />
      }
    />
  );
}
