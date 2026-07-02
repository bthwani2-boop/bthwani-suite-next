"use client";

import ControlPanelDshClosureHubScreen from "@dsh-cp/dashboard";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function DshDashboardPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم</strong>} serviceLabel={<span>لوحة البيانات</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="dashboard"
          onSectionPress={handleSectionPress}
        />
      }
      main={<ControlPanelDshClosureHubScreen />}
    />
  );
}
