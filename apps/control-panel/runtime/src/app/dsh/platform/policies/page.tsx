"use client";

import {
  PlatformDashboardScreen,
  PlatformGovernanceVisual,
} from "@dsh-cp/platform";

export default function PlatformPoliciesPage() {
  return (
    <>
      <PlatformGovernanceVisual />
      <PlatformDashboardScreen initialTab="policies" />
    </>
  );
}
