"use client";

import ControlPanelHrScreen from "@dsh-cp/hr";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function DshHrPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم</strong>} serviceLabel={<span>الموارد البشرية</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="hr"
          onSectionPress={handleSectionPress}
        />
      }
      main={<ControlPanelHrScreen />}
    />
  );
}
