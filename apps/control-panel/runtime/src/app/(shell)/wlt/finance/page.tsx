"use client";

import { Suspense } from "react";
import { FinanceDashboardScreen } from "@bthwani/dsh/control-panel/finance";

export default function FinancePage() {
  return (
    <Suspense fallback={<div>جاري تحميل المالية...</div>}>
      <FinanceDashboardScreen />
    </Suspense>
  );
}
