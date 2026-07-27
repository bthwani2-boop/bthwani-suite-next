"use client";

import {
  PlatformDashboardScreen,
  PlatformGovernanceVisual,
} from "@dsh-cp/platform";

// PlatformPoliciesScreen was the former standalone page. This compatibility
// route now opens the same content as a tab inside the unified sovereign surface.
export default function PlatformPoliciesPage() {
  return (
    <>
      <PlatformGovernanceVisual />
      <PlatformDashboardScreen initialTab="policies" />
    </>
  );
}
