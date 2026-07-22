"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AnalyticsDashboardScreen } from "@dsh-cp/analytics";

export default function AnalyticsPage() {
  return (
    <>
      <div style={{ padding: "12px 20px", textAlign: "right" }}>
        <Link href="/dsh/analytics/operational">فتح تحليلات SLA والأداء المتقدمة ←</Link>
      </div>
      <Suspense fallback={<div>جاري تحميل التحليلات...</div>}>
        <AnalyticsDashboardScreen />
      </Suspense>
    </>
  );
}
