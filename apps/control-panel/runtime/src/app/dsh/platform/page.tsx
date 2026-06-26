"use client";

import { PlatformPoliciesScreen } from "@dsh-cp/platform";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function PlatformPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>سياسات المنصة</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="platform"
          onSectionPress={handleSectionPress}
        />
      }
      main={<PlatformPoliciesScreen />}
    />
  );
}

