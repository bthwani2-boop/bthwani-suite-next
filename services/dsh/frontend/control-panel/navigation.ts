/** Ordered public navigation contract for the DSH control-panel surface. */
export const DSH_NAV_ITEMS = [
  { section: "dashboard", label: "الرئيسية", route: "/dsh/dashboard" },
  { section: "operations", label: "العمليات", route: "/dsh/operations" },
  { section: "analytics", label: "التحليلات", route: "/dsh/analytics" },
  { section: "partners", label: "الشركاء والمتاجر", route: "/dsh/partners" },
  { section: "catalogs", label: "اعتماد الكتالوجات", route: "/dsh/catalogs" },
  { section: "marketing", label: "التسويق والاكتشاف", route: "/dsh/marketing" },
  { section: "finance", label: "المالية والتسويات", route: "/wlt/finance" },
  { section: "support", label: "الدعم والمساعدة", route: "/dsh/support" },
  { section: "platform", label: "المنصة السيادية", route: "/dsh/platform" },
  { section: "administration", label: "الإدارة والصلاحيات", route: "/dsh/administration" },
  { section: "hr", label: "الموارد البشرية", route: "/dsh/hr" },
] as const;

export type DshSection = (typeof DSH_NAV_ITEMS)[number]["section"];
