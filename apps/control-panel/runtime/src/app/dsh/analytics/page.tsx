"use client";

import { Suspense } from "react";
import { AnalyticsDashboardScreen } from "@dsh-cp/analytics";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function AnalyticsPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>التحليلات</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="analytics"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <Suspense fallback={<div>جاري تحميل التحليلات...</div>}>
          <AnalyticsDashboardScreen />
        </Suspense>
      }
    />
  );
}
