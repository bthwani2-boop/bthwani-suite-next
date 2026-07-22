"use client";

import { Suspense } from "react";
import { FinanceDashboardScreen, RepresentativeWalletLookup } from "@dsh-cp/finance";

export default function FinancePage() {
  return (
    <Suspense fallback={<div>جاري تحميل المالية...</div>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ padding: "1rem 1rem 0" }}>
          <RepresentativeWalletLookup />
        </div>
        <FinanceDashboardScreen />
      </div>
    </Suspense>
  );
}
