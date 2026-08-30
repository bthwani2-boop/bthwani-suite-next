"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CpRetryButton, CpStatePanel } from "@bthwani/control-panel/components";
import { colorRoles } from "@bthwani/ui-kit";
import {
  identitySessionIsBoundToSurface,
  useIdentitySession,
} from "@bthwani/core-identity";
import {
  CONTROL_PANEL_LOGIN_ROUTE,
  resolveControlPanelReturnTo,
} from "../control-panel-routes";

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
 * Owns authentication for the governed Control Panel shell, including both
 * DSH and WLT-owned routes. The boundary authenticates the exact control-panel
 * session only; business roles and permissions remain authorization concerns
 * of the protected APIs and capability-specific UI.
 */
export function ControlPanelAuthBoundary({ children }: { readonly children: ReactNode }) {
  const { state, retryBootstrap } = useIdentitySession();
  const router = useRouter();
  const pathname = usePathname();
  const authenticatedForControlPanel = state.kind === "authenticated"
    && identitySessionIsBoundToSurface(state.identity, "control-panel");
  const wrongSurface = state.kind === "authenticated"
    && !identitySessionIsBoundToSurface(state.identity, "control-panel");

  useEffect(() => {
    if (state.kind === "signed_out" || state.kind === "error" || wrongSurface) {
      const returnTo = resolveControlPanelReturnTo(pathname);
      router.replace(`${CONTROL_PANEL_LOGIN_ROUTE}?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [state.kind, wrongSurface, pathname, router]);

  if (state.kind === "restoring" || state.kind === "authenticating") {
    return loadingPanel();
  }

  if (state.kind === "service_unavailable") {
    return (
      <div dir="rtl" style={{ padding: "2rem" }}>
        <CpStatePanel
          role="alert"
          title="خدمة الهوية غير جاهزة"
          description={state.retainedSession
            ? "تعذر التحقق من الجلسة مؤقتًا، لكن الجلسة المحفوظة لم تُحذف. أعد الفحص بعد تعافي الخدمة."
            : "تعذر الوصول إلى خدمة الهوية. لن تُعرض هذه الحالة كفشل بيانات دخول."}
        >
          <CpRetryButton onClick={() => void retryBootstrap()}>إعادة الفحص</CpRetryButton>
        </CpStatePanel>
      </div>
    );
  }

  if (state.kind === "unconfigured") {
    return loadingPanel();
  }

  if (state.kind === "signed_out" || state.kind === "error" || wrongSurface) {
    return loadingPanel();
  }

  if (authenticatedForControlPanel) {
    return <>{children}</>;
  }

  return loadingPanel();
}
