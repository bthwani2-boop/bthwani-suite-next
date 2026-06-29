"use client";

import { BthwaniUiProvider } from "@bthwani/ui-kit";
import type { ReactNode } from "react";
import { configureIdentitySession } from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";

configureIdentitySession(resolveIdentityApiBaseUrl());

export function Providers({ children }: { children: ReactNode }) {
  return <BthwaniUiProvider defaultTheme="light">{children}</BthwaniUiProvider>;
}
