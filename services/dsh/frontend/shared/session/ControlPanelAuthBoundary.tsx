"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { useControlPanelSession } from "./control-panel-session";

const DSH_ROUTE_PREFIX = "/" + "dsh";
const DSH_LOGIN_ROUTE = `${DSH_ROUTE_PREFIX}/login`;
const DSH_DASHBOARD_ROUTE = `${DSH_ROUTE_PREFIX}/dashboard`;

function loadingPanel(): ReactNode {
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: colorRoles.textSecondary,
      }}
    >
      جاري التحقق من الجلسة...
    </div>
  );
}

/**
 * Owns the single sign-on boundary for every /dsh/* route (except
 * /dsh/login itself, which renders outside this component). No screen
 * below this boundary may render its own login UI.
 */
export function ControlPanelAuthBoundary({ children }: { readonly children: ReactNode }) {
  const { state } = useControlPanelSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      state.kind === "signed_out" ||
      state.kind === "error" ||
      (state.kind === "authenticated" && !state.identity.roles.includes("operator"))
    ) {
      const returnTo = pathname && pathname.startsWith(DSH_ROUTE_PREFIX) ? pathname : DSH_DASHBOARD_ROUTE;
      router.replace(`${DSH_LOGIN_ROUTE}?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [state, pathname, router]);

  if (state.kind === "restoring" || state.kind === "authenticating") {
    return loadingPanel();
  }

  if (
    state.kind === "signed_out" ||
    state.kind === "error" ||
    (state.kind === "authenticated" && !state.identity.roles.includes("operator"))
  ) {
    return loadingPanel();
  }

  return <>{children}</>;
}
