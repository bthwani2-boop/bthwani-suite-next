"use client";

import { CatalogApprovalScreen } from "@dsh-cp/catalogs/CatalogApprovalScreen";
import { DshPage } from "../../../shell";

export default function DshCatalogsPage() {
  return (
    <DshPage activeSection="catalogs" sectionLabel="اعتماد الكتالوجات">
      <CatalogApprovalScreen />
    </DshPage>
  );
}
