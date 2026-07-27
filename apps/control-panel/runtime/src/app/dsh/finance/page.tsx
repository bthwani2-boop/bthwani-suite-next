"use client";

import { Suspense } from "react";
import { FinanceDashboardScreen, RepresentativeWalletLookup } from "@dsh-cp/finance";

export default function FinancePage() {
  return (
    <Suspense fallback={<div>جاري تحميل المالية...</div>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <FinanceDashboardScreen />
        <div style={{ padding: "0 1rem 1rem" }}>
          <RepresentativeWalletLookup />
        </div>
      </div>
    </Suspense>
  );
}
