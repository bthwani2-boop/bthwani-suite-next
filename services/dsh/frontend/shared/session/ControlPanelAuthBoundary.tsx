"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useControlPanelSession } from "./control-panel-session";

function loadingPanel(): ReactNode {
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "var(--text-secondary, rgb(90, 106, 133))",
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
      const returnTo = pathname && pathname.startsWith("/dsh") ? pathname : "/dsh/dashboard";
      router.replace(`/dsh/login?returnTo=${encodeURIComponent(returnTo)}`);
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
