"use client";

import { AdministrationDashboardScreen } from "@dsh-cp/administration";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function AdministrationPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>الإدارة والصلاحيات</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="administration"
          onSectionPress={handleSectionPress}
        />
      }
      main={<AdministrationDashboardScreen />}
    />
  );
}

