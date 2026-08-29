"use client";

import { useState } from "react";
import { CpTabs } from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";
import { IdentityRuntimeHealthPanel } from "@bthwani/dsh/control-panel/dashboard";
import { hasServiceControlPanelPermission } from "@bthwani/dsh/control-panel/session";
import {
  PlatformDashboardScreen,
  SovereignLeadershipPanel,
} from "@bthwani/dsh/control-panel/platform";

type PlatformSection = "control" | "identity-health" | "leadership";

export default function PlatformPage() {
  const [section, setSection] = useState<PlatformSection>("control");
  const { state } = useIdentitySession();
  const identity = state.kind === "authenticated" ? state.identity : null;
  const canReadHealth = hasServiceControlPanelPermission(identity, "dsh", "platform:health:read");
  const canReadLeadership = hasServiceControlPanelPermission(identity, "workforce", "leadership:read");
  const canCreateLeadership = hasServiceControlPanelPermission(identity, "workforce", "leadership:create");
  const leadershipVisible = canReadLeadership || canCreateLeadership;
  const visibleSection = section === "identity-health" && !canReadHealth
    || section === "leadership" && !leadershipVisible
    ? "control"
    : section;

  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <CpTabs
          aria-label="أقسام المنصة السيادية"
          value={visibleSection}
          onChange={(value) => setSection(value as PlatformSection)}
          items={[
            { value: "control", label: "التحكم السيادي" },
            ...(canReadHealth ? [{ value: "identity-health" as const, label: "الخدمات والجاهزية — Identity" }] : []),
            ...(leadershipVisible ? [{ value: "leadership" as const, label: "القيادة والكادر السيادي" }] : []),
          ]}
        />
      </div>
      {visibleSection === "leadership" ? (
        <div style={{ padding: "16px" }}>
          <SovereignLeadershipPanel />
        </div>
      ) : visibleSection === "identity-health" ? (
        <div style={{ padding: "16px" }}>
          <IdentityRuntimeHealthPanel />
        </div>
      ) : (
        <PlatformDashboardScreen />
      )}
    </>
  );
}
