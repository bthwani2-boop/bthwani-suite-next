"use client";

import { Suspense } from "react";
import { AnalyticsDashboardScreen } from "@dsh-cp/analytics";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>جاري تحميل التحليلات...</div>}>
      <AnalyticsDashboardScreen />
    </Suspense>
  );
}
