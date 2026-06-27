"use client";

import { SupportDashboardScreen } from "@dsh-cp/support";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function DshSupportPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>الدعم والمساعدة</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="support"
          onSectionPress={handleSectionPress}
        />
      }
      main={<SupportDashboardScreen />}
    />
  );
}
