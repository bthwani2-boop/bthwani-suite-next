"use client";

import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";
import { MarketingDashboardScreen } from "@dsh-cp/marketing/MarketingDashboardScreen";

export default function MarketingPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>التسويق والاكتشاف</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="marketing"
          onSectionPress={handleSectionPress}
        />
      }
      main={<MarketingDashboardScreen />}
    />
  );
}
