"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DSH_NAV_ITEMS } from "@bthwani/dsh/control-panel/navigation";
import { hasControlPanelPermission, useControlPanelSession } from "@bthwani/dsh/control-panel/session";

/** Returns only the DSH sections authorized for the restored operator session. */
export function useDshNavigation() {
  const router = useRouter();
  const { state } = useControlPanelSession();
  const canReadPlatform =
    state.kind === "authenticated" &&
    hasControlPanelPermission(state.identity, "platform:read");

  const visibleItems = useMemo(
    () => DSH_NAV_ITEMS.filter((item) => item.section !== "platform" || canReadPlatform),
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
