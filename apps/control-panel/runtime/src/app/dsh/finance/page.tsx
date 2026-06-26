"use client";

import { FinanceDashboardScreen } from "@dsh-cp/finance";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function FinancePage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>المالية والتسويات</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="finance"
          onSectionPress={handleSectionPress}
        />
      }
      main={<FinanceDashboardScreen />}
    />
  );
}

