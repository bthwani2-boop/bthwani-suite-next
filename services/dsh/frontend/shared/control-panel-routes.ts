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

export const CONTROL_PANEL_LOGIN_ROUTE = "/dsh/login" as const;
export const CONTROL_PANEL_SHELL_PREFIXES = ["/dsh", "/wlt"] as const;

export type ControlPanelSectionId = keyof typeof CONTROL_PANEL_SECTION_ROUTES;
export type ControlPanelSectionRoute = (typeof CONTROL_PANEL_SECTION_ROUTES)[ControlPanelSectionId];

export function isGovernedControlPanelShellPath(pathname: string): boolean {
  return CONTROL_PANEL_SHELL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveControlPanelReturnTo(pathname: string | null | undefined): string {
  return pathname && isGovernedControlPanelShellPath(pathname)
    ? pathname
    : CONTROL_PANEL_SECTION_ROUTES.dashboard;
}
