"use client";

import { CatalogDashboardScreen } from "@dsh-cp/catalogs/CatalogDashboardScreen";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";


export default function DshCatalogsPage() {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم</strong>} serviceLabel={<span>اعتماد الكتالوجات</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="catalogs"
          onSectionPress={handleSectionPress}
        />
      }
      main={<CatalogDashboardScreen />}
    />
  );
}

