"use client";

import { PlatformPoliciesScreen } from "@dsh-cp/platform";
import { DshPage } from "../../../shell";

export default function PlatformPage() {
  return (
    <DshPage activeSection="platform" sectionLabel="سياسات المنصة">
      <PlatformPoliciesScreen />
    </DshPage>
  );
}
