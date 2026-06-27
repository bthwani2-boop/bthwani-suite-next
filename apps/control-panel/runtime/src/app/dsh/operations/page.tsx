"use client";

import { Suspense } from "react";
import { OperationsHubScreen } from "@dsh-cp/operations/OperationsHubScreen";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";

export default function DshOperationsPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم</strong>} serviceLabel={<span>العمليات</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="operations"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <Suspense fallback={<div>جاري التحميل...</div>}>
          <OperationsHubScreen />
        </Suspense>
      }
    />
  );
}

