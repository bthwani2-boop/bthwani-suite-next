"use client";

import { Suspense } from "react";
import { OperationalAnalyticsExtensionsScreen } from "@bthwani/dsh/control-panel/analytics";

export default function OperationalAnalyticsPage() {
  return (
    <Suspense fallback={<div>جاري تحميل تحليلات التشغيل...</div>}>
      <OperationalAnalyticsExtensionsScreen />
    </Suspense>
  );
}
