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
          title={<strong>لوحة التحكم — DSH</strong>}
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
