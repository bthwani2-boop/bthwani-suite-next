"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DSH_NAV_ITEMS, resolveDshNavigationItem } from "@bthwani/dsh/control-panel/navigation";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../shell";
import { ControlPanelSessionProvider } from "@bthwani/dsh/control-panel/session";
import { ControlPanelAuthBoundary } from "@bthwani/dsh/control-panel/session";
import { ControlPanelSectionAccessBoundary } from "@bthwani/dsh/control-panel/session";
import { ControlPanelUserMenu } from "@bthwani/dsh/control-panel/session";
import { ControlPanelNotificationsBell } from "@bthwani/dsh/control-panel/session";
import { useControlPanelServiceHealth } from "@bthwani/dsh/control-panel/session";

function resolveActiveSection(pathname: string | null): string | undefined {
  return resolveDshNavigationItem(pathname)?.section;
}

function DshShell({ children }: { readonly children: ReactNode }) {
  const { items, handleSectionPress } = useDshNavigation();
  const pathname = usePathname();
  const activeSection = resolveActiveSection(pathname);
  const activeLabel = DSH_NAV_ITEMS.find((item) => item.section === activeSection)?.label;
  const serviceStatus = useControlPanelServiceHealth();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={activeLabel ? <span>{activeLabel}</span> : undefined}
          serviceStatus={serviceStatus}
          notifications={<ControlPanelNotificationsBell />}
          userMenu={<ControlPanelUserMenu />}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection={activeSection}
          onSectionPress={handleSectionPress}
        />
      }
      main={children}
    />
  );
}

export default function DshLayout({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/dsh/login";

  return (
    <ControlPanelSessionProvider>
      {isLoginRoute ? (
        children
      ) : (
        <ControlPanelAuthBoundary>
          <DshShell>
            <ControlPanelSectionAccessBoundary>{children}</ControlPanelSectionAccessBoundary>
          </DshShell>
        </ControlPanelAuthBoundary>
      )}
    </ControlPanelSessionProvider>
  );
}
