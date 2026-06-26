"use client";

import { SupportHubScreen } from "@dsh-cp/support";
import { DshPage } from "../../../shell";

export default function SupportPage() {
  return (
    <DshPage activeSection="support" sectionLabel="الدعم والمساعدة">
      <SupportHubScreen />
    </DshPage>
  );
}
