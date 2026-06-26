"use client";

import { StoreManagementScreen } from "@dsh-cp/partners/stores/StoreManagementScreen";
import { DshPage } from "../../../../shell";

export default function DshStoresPage() {
  return (
    <DshPage activeSection="partners" sectionLabel="الشركاء / إدارة المتاجر">
      <StoreManagementScreen />
    </DshPage>
  );
}
