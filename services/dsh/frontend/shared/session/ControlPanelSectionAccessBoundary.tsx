"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CpStatePanel } from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  canReadDshNavItem,
  resolveDshNavigationItem,
} from "../../control-panel/navigation";

/**
 * Enforces the same section read contract used by the shell navigation.
 * Backend permission checks remain authoritative for every API and mutation;
 * this boundary prevents a URL/deep-link from rendering an unauthorized
 * section before any business controller is mounted.
 */
export function ControlPanelSectionAccessBoundary({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useIdentitySession();
  const item = resolveDshNavigationItem(pathname);

  if (!item) return <>{children}</>;
  if (state.kind !== "authenticated") return null;
  if (canReadDshNavItem(state.identity, item)) return <>{children}</>;

  return (
    <div dir="rtl" style={{ padding: "2rem" }}>
      <CpStatePanel
        role="alert"
        title="الوصول إلى هذا القسم غير متاح"
        description="لا تملك جلسة لوحة التحكم صلاحية قراءة أي مساحة تشغيلية داخل هذا القسم."
      />
    </div>
  );
}
