"use client";

import { BthwaniUiProvider, BThwaniAppearanceProvider, PortalLayer } from "@bthwani/ui-kit";
import type { ReactNode } from "react";
import { configureIdentitySession } from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "@bthwani/dsh/control-panel/session";

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
