"use client";

import { useRouter } from "next/navigation";

/** Full ordered list of all DSH control panel sections */
export const DSH_NAV_ITEMS = [
  { section: "dashboard",      label: "الرئيسية",              route: "/dsh/dashboard" },
  { section: "operations",     label: "العمليات",              route: "/dsh/operations" },
  { section: "analytics",     label: "التحليلات",              route: "/dsh/analytics" },
  { section: "partners",       label: "الشركاء والمتاجر",     route: "/dsh/partners" },
  { section: "catalogs",       label: "اعتماد الكتالوجات",    route: "/dsh/catalogs" },
  { section: "marketing",      label: "التسويق والاكتشاف",    route: "/dsh/marketing" },
  { section: "finance",        label: "المالية والتسويات",    route: "/dsh/finance" },
  { section: "support",        label: "الدعم والمساعدة",      route: "/dsh/support" },
  { section: "platform",       label: "سياسات المنصة",        route: "/dsh/platform" },
  { section: "administration", label: "الإدارة والصلاحيات",  route: "/dsh/administration" },
  { section: "hr",             label: "الموارد البشرية",      route: "/dsh/hr" },
] as const;

export type DshSection = (typeof DSH_NAV_ITEMS)[number]["section"];

/** Hook: returns items + handler ready to drop into ControlPanelNavigation */
export function useDshNavigation() {
  const router = useRouter();

  const handleSectionPress = (section: string) => {
    const found = DSH_NAV_ITEMS.find((i) => i.section === section);
    if (found) router.push(found.route);
  };

  return {
    items: DSH_NAV_ITEMS.map(({ section, label }) => ({ section, label })),
    handleSectionPress,
  };
}
