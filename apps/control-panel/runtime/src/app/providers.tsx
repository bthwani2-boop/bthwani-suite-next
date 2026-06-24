"use client";

import { BthwaniUiProvider } from "@bthwani/ui-kit";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <BthwaniUiProvider defaultTheme="light">{children}</BthwaniUiProvider>;
}
