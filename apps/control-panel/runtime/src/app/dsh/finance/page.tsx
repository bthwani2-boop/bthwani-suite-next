"use client";

import { FinanceDashboardScreen } from "@dsh-cp/finance";
import { DshPage } from "../../../shell";

export default function FinancePage() {
  return (
    <DshPage activeSection="finance" sectionLabel="المالية والتسويات">
      <FinanceDashboardScreen />
    </DshPage>
  );
}
