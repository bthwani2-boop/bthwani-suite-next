"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CpRetryButton, CpStatePanel } from "@bthwani/control-panel/components";
import { colorRoles } from "@bthwani/ui-kit";
import {
  identitySessionAuthorizesSurface,
  useIdentitySession,
} from "@bthwani/core-identity";

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

function isControlPanelIdentityAuthorized(state: ReturnType<typeof useIdentitySession>["state"]): boolean {
  return state.kind === "authenticated"
    && identitySessionAuthorizesSurface(state.identity, "operator", "control-panel");
}

/**
 * Owns the single sign-on boundary for every /dsh/* route (except
 * /dsh/login itself, which renders outside this component). Identity outages
 * never redirect to login or clear a retained session; only proven signed-out,
 * invalid-session, or a session not bound to the operator control-panel surface
 * does so.
 */
export function ControlPanelAuthBoundary({ children }: { readonly children: ReactNode }) {
  const { state, retryBootstrap } = useIdentitySession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      state.kind === "signed_out" ||
      state.kind === "error" ||
      (state.kind === "authenticated" && !isControlPanelIdentityAuthorized(state))
    ) {
      const returnTo = pathname && pathname.startsWith(DSH_ROUTE_PREFIX) ? pathname : DSH_DASHBOARD_ROUTE;
      router.replace(`${DSH_LOGIN_ROUTE}?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [state, pathname, router]);

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

  if (
    state.kind === "signed_out" ||
    state.kind === "error" ||
    (state.kind === "authenticated" && !isControlPanelIdentityAuthorized(state))
  ) {
    return loadingPanel();
  }

  return <>{children}</>;
}
