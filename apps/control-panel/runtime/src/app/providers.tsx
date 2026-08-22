"use client";

import {
  configureIdentitySession,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";
import { BthwaniQueryProvider } from "@bthwani/data-runtime";
import { BThwaniAppearanceProvider, BthwaniUiProvider, PortalLayer } from "@bthwani/ui-kit";
import type { ReactNode } from "react";

configureIdentitySession(resolveIdentityApiBaseUrl());

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BthwaniQueryProvider>
      <BthwaniUiProvider defaultTheme="light">
        <BThwaniAppearanceProvider mode="lightPremium" syncThemeMode>
          <PortalLayer>{children}</PortalLayer>
        </BThwaniAppearanceProvider>
      </BthwaniUiProvider>
    </BthwaniQueryProvider>
  );
}
