"use client";

import { AnalyticsDashboardScreen } from "@dsh-cp/analytics";
import { DshPage } from "../../../shell";

export default function AnalyticsPage() {
  return (
    <DshPage activeSection="analytics" sectionLabel="التحليلات والتقارير">
      <AnalyticsDashboardScreen />
    </DshPage>
  );
}
