"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { canReadDshNavItem, DSH_NAV_ITEMS } from "@bthwani/dsh/control-panel/navigation";
import { useControlPanelSession } from "@bthwani/dsh/control-panel/session";

/** Returns only the DSH sections authorized for the restored operator session. */
export function useDshNavigation() {
  const router = useRouter();
  const { state } = useControlPanelSession();
  const identity = state.kind === "authenticated" ? state.identity : null;

  const visibleItems = useMemo(
    () => DSH_NAV_ITEMS.filter((item) => canReadDshNavItem(identity, item)),
    [identity],
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
