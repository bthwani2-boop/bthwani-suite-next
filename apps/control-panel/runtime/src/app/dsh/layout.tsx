"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
  DSH_NAV_ITEMS,
} from "../../shell";
import { ControlPanelSessionProvider } from "@dsh-shared/session/control-panel-session";
import { ControlPanelAuthBoundary } from "@dsh-shared/session/ControlPanelAuthBoundary";
import { ControlPanelUserMenu } from "@dsh-shared/session/ControlPanelUserMenu";
import { ControlPanelNotificationsBell } from "@dsh-shared/session/ControlPanelNotificationsBell";
import { useControlPanelServiceHealth } from "@dsh-shared/session/use-control-panel-service-health";

function resolveActiveSection(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const sorted = [...DSH_NAV_ITEMS].sort((a, b) => b.route.length - a.route.length);
  return sorted.find((item) => pathname.startsWith(item.route))?.section;
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
          <DshShell>{children}</DshShell>
        </ControlPanelAuthBoundary>
      )}
    </ControlPanelSessionProvider>
  );
}
