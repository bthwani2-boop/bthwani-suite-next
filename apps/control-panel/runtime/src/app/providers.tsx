"use client";

import { BthwaniUiProvider, BThwaniAppearanceProvider, PortalLayer } from "@bthwani/ui-kit";
import type { ReactNode } from "react";
import { configureIdentitySession } from "@bthwani/core-identity";

function resolveIdentityApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    const next = process.env["NEXT_PUBLIC_IDENTITY_API_BASE_URL"];
    if (next && next.trim().length > 0) return next.trim();
  }
  return "http://localhost:58085";
}

configureIdentitySession(resolveIdentityApiBaseUrl());

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BthwaniUiProvider defaultTheme="light">
      <BThwaniAppearanceProvider mode="lightPremium" syncThemeMode>
        <PortalLayer>
          {children}
        </PortalLayer>
      </BThwaniAppearanceProvider>
    </BthwaniUiProvider>
  );
}
