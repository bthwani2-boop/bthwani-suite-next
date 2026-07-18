"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";
import { hasControlPanelPermission } from "@dsh-shared/session/control-panel-permissions";

/** Full ordered list of all DSH control panel sections. */
export const DSH_NAV_ITEMS = [
  { section: "dashboard", label: "الرئيسية", route: "/dsh/dashboard" },
  { section: "operations", label: "العمليات", route: "/dsh/operations" },
  { section: "analytics", label: "التحليلات", route: "/dsh/analytics" },
  { section: "partners", label: "الشركاء والمتاجر", route: "/dsh/partners" },
  { section: "catalogs", label: "اعتماد الكتالوجات", route: "/dsh/catalogs" },
  { section: "marketing", label: "التسويق والاكتشاف", route: "/dsh/marketing" },
  { section: "finance", label: "المالية والتسويات", route: "/dsh/finance" },
  { section: "support", label: "الدعم والمساعدة", route: "/dsh/support" },
  { section: "platform", label: "المنصة السيادية", route: "/dsh/platform" },
  {
    section: "platform-policies",
    label: "سياسات المنصة ومناطق الخدمة",
    route: "/dsh/platform/policies",
  },
  {
    section: "administration",
    label: "الإدارة والصلاحيات",
    route: "/dsh/administration",
  },
  { section: "hr", label: "الموارد البشرية", route: "/dsh/hr" },
] as const;

export type DshSection = (typeof DSH_NAV_ITEMS)[number]["section"];

/**
 * Returns only the sections authorized for the restored control-panel session.
 * Sensitive platform sections default to hidden while the session is restoring
 * or when platform:read is absent.
 */
export function useDshNavigation() {
  const router = useRouter();
  const { state } = useControlPanelSession();
  const canReadPlatform =
    state.kind === "authenticated" &&
    hasControlPanelPermission(state.identity, "platform:read");

  const visibleItems = useMemo(
    () =>
      DSH_NAV_ITEMS.filter(
        (item) => !item.section.startsWith("platform") || canReadPlatform,
      ),
    [canReadPlatform],
  );

  const handleSectionPress = (section: string) => {
    const found = visibleItems.find((item) => item.section === section);
    if (found) router.push(found.route);
  };

  return {
    items: visibleItems.map(({ section, label }) => ({ section, label })),
    handleSectionPress,
  };
}
