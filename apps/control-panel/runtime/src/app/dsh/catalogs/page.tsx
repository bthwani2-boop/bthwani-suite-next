import { CatalogApprovalScreen } from "@dsh-cp/catalogs/CatalogApprovalScreen";
import {
  ControlPanelNavigation,
  ControlPanelShell,
  ControlPanelTopBar,
} from "@bthwani/app-shell";

export default function DshCatalogsPage() {
  return (
    <ControlPanelShell
      dir="rtl"
      topBar={<ControlPanelTopBar title={<strong>لوحة التحكم — DSH</strong>} serviceLabel={<span>catalogs / approvals</span>} />}
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={[
            { section: "partners", label: "المتاجر" },
            { section: "catalogs", label: "اعتماد الكتالوجات" },
          ]}
          activeSection="catalogs"
        />
      }
      main={<CatalogApprovalScreen />}
    />
  );
}
