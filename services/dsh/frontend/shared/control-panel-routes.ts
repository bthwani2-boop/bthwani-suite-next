export const CONTROL_PANEL_SECTION_ROUTES = {
  dashboard: "/dsh/dashboard",
  operations: "/dsh/operations",
  analytics: "/dsh/analytics",
  partners: "/dsh/partners",
  catalogs: "/dsh/catalogs",
  marketing: "/dsh/marketing",
  finance: "/wlt/finance",
  support: "/dsh/support",
  platform: "/dsh/platform",
  administration: "/dsh/administration",
  hr: "/dsh/hr",
} as const;

export type ControlPanelSectionId = keyof typeof CONTROL_PANEL_SECTION_ROUTES;
export type ControlPanelSectionRoute = (typeof CONTROL_PANEL_SECTION_ROUTES)[ControlPanelSectionId];
