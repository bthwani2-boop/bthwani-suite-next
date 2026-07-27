"use client";

import { useState } from "react";
import { CpTabs } from "@bthwani/control-panel/components";
import {
  PlatformDashboardScreen,
  SovereignLeadershipPanel,
} from "@dsh-cp/platform";

type PlatformSection = "control" | "leadership";

export default function PlatformPage() {
  const [section, setSection] = useState<PlatformSection>("control");

  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <CpTabs
          aria-label="أقسام المنصة السيادية"
          value={section}
          onChange={(value) => setSection(value as PlatformSection)}
          items={[
            { value: "control", label: "التحكم السيادي" },
            { value: "leadership", label: "القيادة والكادر السيادي" },
          ]}
        />
      </div>
      {section === "leadership" ? (
        <div style={{ padding: "16px" }}>
          <SovereignLeadershipPanel />
        </div>
      ) : (
        <PlatformDashboardScreen />
      )}
    </>
  );
}
