"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProviderKind } from "../../shared/workforce";
import { CpButton, CpPageHeader, CpTabs } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";

import { ProviderListView } from "./ProviderListView";
import { FieldAgentCreateView } from "./FieldAgentCreateView";
import { CaptainCreateView } from "./CaptainCreateView";
import { EmployeeCreateView } from "./EmployeeCreateView";
import { FieldAgentDetailView } from "./FieldAgentDetailView";
import { CaptainDetailView } from "./CaptainDetailView";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { WorkforceReferenceView } from "./WorkforceReferenceView";

const KIND_TABS: Array<{ label: string; value: ProviderKind }> = [
  { label: "كابتن", value: "captain" },
  { label: "ميداني", value: "field" },
  { label: "موظف إداري", value: "employee" },
];

function WorkforceHrScreenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") || "list";
  const rawKind = searchParams.get("kind");
  const kind: ProviderKind = rawKind === "captain" || rawKind === "employee" ? rawKind : "field";
  const actorId = searchParams.get("actorId") || "";

  const navigateTo = (newView: string, newKind?: ProviderKind, newActorId?: string) => {
    const params = new URLSearchParams();
    params.set("view", newView);
    if (newKind) params.set("kind", newKind);
    if (newActorId) params.set("actorId", newActorId);
    router.push(`?${params.toString()}`);
  };

  if (view === "create" || view === "manage" || view === "type-select" || view === "activation") {
    return (
      <EditorPageFrame
        header={
          <CpPageHeader title="إضافة عضو Workforce">
            <CpButton variant="ghost" onClick={() => navigateTo("list")}>رجوع</CpButton>
          </CpPageHeader>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <CpTabs aria-label="نوع العضو" value={kind} onChange={(value) => navigateTo("create", value as ProviderKind)} items={KIND_TABS} />

          {kind === "captain" ? (
            <CaptainCreateView inline onCreated={(captain) => navigateTo("detail", "captain", captain.actorId)} />
          ) : kind === "employee" ? (
            <EmployeeCreateView inline onCreated={(employee) => navigateTo("detail", "employee", employee.actorId)} />
          ) : (
            <FieldAgentCreateView inline onCreated={(agent) => navigateTo("detail", "field", agent.actorId)} />
          )}
        </div>
      </EditorPageFrame>
    );
  }

  if (view === "detail") {
    if (kind === "employee") return <EmployeeDetailView actorId={actorId} onBack={() => navigateTo("list")} />;
    if (kind === "captain") return <CaptainDetailView actorId={actorId} onBack={() => navigateTo("list")} />;
    return <FieldAgentDetailView actorId={actorId} onBack={() => navigateTo("list")} />;
  }

  if (view === "reference") {
    return <WorkforceReferenceView onBack={() => navigateTo("list")} />;
  }

  return (
    <ProviderListView
      onCreate={() => navigateTo("create", "field")}
      onOpen={(actorIdVal, providerKindVal) => navigateTo("detail", providerKindVal, actorIdVal)}
      onReference={() => navigateTo("reference")}
      onActivation={() => navigateTo("create", "field")}
    />
  );
}

export function WorkforceHrScreen() {
  return (
    <Suspense fallback={null}>
      <WorkforceHrScreenInner />
    </Suspense>
  );
}

export default WorkforceHrScreen;
