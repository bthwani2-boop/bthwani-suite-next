"use client";

import {
  configureIdentitySession,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";
import { BthwaniQueryProvider } from "@bthwani/data-runtime";
import { configureBthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import { createBthwaniBrowserSensitiveStorage } from "@bthwani/data-runtime/browser-sensitive-storage";
import { BThwaniAppearanceProvider, BthwaniUiProvider, PortalLayer } from "@bthwani/ui-kit";
import type { ReactNode } from "react";

configureIdentitySession(resolveIdentityApiBaseUrl());
configureBthwaniSensitiveStorage(createBthwaniBrowserSensitiveStorage());

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
