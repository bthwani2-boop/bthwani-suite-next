"use client";

import {
  PlatformDashboardScreen,
  PlatformGovernanceVisual,
} from "@dsh-cp/platform";

export default function PlatformPage() {
  return (
    <>
      <PlatformGovernanceVisual />
      <PlatformDashboardScreen />
    </>
  );
}
