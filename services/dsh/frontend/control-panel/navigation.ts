import { CONTROL_PANEL_SECTION_ROUTES } from "../shared/control-panel-routes";

/** Ordered public navigation contract for the DSH control-panel surface. */
export const DSH_NAV_ITEMS = [
  { section: "dashboard", label: "الرئيسية", route: CONTROL_PANEL_SECTION_ROUTES.dashboard },
  { section: "operations", label: "العمليات", route: CONTROL_PANEL_SECTION_ROUTES.operations },
  { section: "analytics", label: "التحليلات", route: CONTROL_PANEL_SECTION_ROUTES.analytics },
  { section: "partners", label: "الشركاء والمتاجر", route: CONTROL_PANEL_SECTION_ROUTES.partners },
  { section: "catalogs", label: "اعتماد الكتالوجات", route: CONTROL_PANEL_SECTION_ROUTES.catalogs },
  { section: "marketing", label: "التسويق والاكتشاف", route: CONTROL_PANEL_SECTION_ROUTES.marketing },
  { section: "finance", label: "المالية والتسويات", route: CONTROL_PANEL_SECTION_ROUTES.finance },
  { section: "support", label: "الدعم والمساعدة", route: CONTROL_PANEL_SECTION_ROUTES.support },
  { section: "platform", label: "المنصة السيادية", route: CONTROL_PANEL_SECTION_ROUTES.platform },
  { section: "administration", label: "الإدارة والصلاحيات", route: CONTROL_PANEL_SECTION_ROUTES.administration },
  { section: "hr", label: "الموارد البشرية", route: CONTROL_PANEL_SECTION_ROUTES.hr },
] as const;

export type DshSection = (typeof DSH_NAV_ITEMS)[number]["section"];
