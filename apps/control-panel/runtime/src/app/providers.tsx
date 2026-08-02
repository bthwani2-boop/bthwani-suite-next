"use client";

import {
  configureIdentitySession,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";
import { BThwaniAppearanceProvider, BthwaniUiProvider, PortalLayer } from "@bthwani/ui-kit";
import type { ReactNode } from "react";

configureIdentitySession(resolveIdentityApiBaseUrl());

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BthwaniUiProvider defaultTheme="light">
      <BThwaniAppearanceProvider mode="lightPremium" syncThemeMode>
        <PortalLayer>{children}</PortalLayer>
      </BThwaniAppearanceProvider>
    </BthwaniUiProvider>
  );
}
