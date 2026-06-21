"use client";

import { StoreManagementScreen } from "@dsh-cp/partners/stores/StoreManagementScreen";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
} from "@bthwani/app-shell";

export default function DshStoresPage() {
  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<span style={{ fontWeight: 700 }}>لوحة التحكم — DSH</span>}
          serviceLabel={<span>partners / stores</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            {
              section: "partners",
              label: "المتاجر",
            },
          ]}
          activeSection="partners"
        />
      }
      main={<StoreManagementScreen />}
    />
  );
}
