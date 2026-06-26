"use client";

import { CheckoutActivityScreen } from "@dsh-cp/operations/CheckoutActivityScreen";
import { DshPage } from "../../../shell";

export default function DshOperationsPage() {
  return (
    <DshPage activeSection="operations" sectionLabel="العمليات">
      <CheckoutActivityScreen />
    </DshPage>
  );
}
