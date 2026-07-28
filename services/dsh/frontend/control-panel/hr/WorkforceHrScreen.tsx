"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProviderKind } from "../../shared/workforce";
import { CpBadge, CpButton, CpPageHeader, CpTabs } from "@bthwani/control-panel/components";
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

  if (view === "create") {
    if (kind === "employee") {
      return (
        <EditorPageFrame header={<CpPageHeader title="إضافة موظف إداري"><CpButton variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</CpButton></CpPageHeader>}>
          <EmployeeCreateView inline onCreated={(employee) => navigateTo("created-success", "employee", employee.actorId)} />
        </EditorPageFrame>
      );
    }
    if (kind === "captain") {
      return (
        <EditorPageFrame header={<CpPageHeader title="إضافة كابتن"><CpButton variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</CpButton></CpPageHeader>}>
          <CaptainCreateView inline onCreated={(captain) => navigateTo("created-success", "captain", captain.actorId)} />
        </EditorPageFrame>
      );
    }
    return (
      <EditorPageFrame header={<CpPageHeader title="إضافة ميداني"><CpButton variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</CpButton></CpPageHeader>}>
        <FieldAgentCreateView inline onCreated={(agent) => navigateTo("created-success", "field", agent.actorId)} />
      </EditorPageFrame>
    );
  }

  if (view === "created-success") {
    return (
      <EditorPageFrame header={<CpPageHeader title="تمت الإضافة بنجاح"><CpButton variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع للقائمة</CpButton></CpPageHeader>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", justifyContent: "center", padding: "64px 20px" }}>
          <CpBadge tone="success" size="lg">تمت إضافة {kind === "captain" ? "الكابتن" : "الميداني"} بنجاح!</CpBadge>
          <CpButton variant="primary" size="lg" onClick={() => navigateTo("detail", kind, actorId)}>
            تفعيل
          </CpButton>
        </div>
      </EditorPageFrame>
    );
  }

  if (view === "detail") {
    if (kind === "employee") return <EmployeeDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} />;
    if (kind === "captain") return <CaptainDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} />;
    return <FieldAgentDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} />;
  }

  if (view === "reference") {
    return <WorkforceReferenceView onBack={() => navigateTo("list", kind)} />;
  }

  // view === "list"
  return (
    <EditorPageFrame
      header={
        <CpPageHeader title="مقدمي الخدمة">
          <CpButton variant="primary" onClick={() => navigateTo("create", kind)}>إضافة {kind === "captain" ? "كابتن" : kind === "field" ? "ميداني" : "موظف"}</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <CpTabs aria-label="نوع مقدم الخدمة" value={kind} onChange={(value) => navigateTo("list", value as ProviderKind)} items={KIND_TABS} />

        <div style={{ marginTop: "16px" }}>
          <ProviderListView
            forcedKind={kind}
            onCreate={() => navigateTo("create", kind)}
            onOpen={(actorIdVal, providerKindVal) => navigateTo("detail", providerKindVal, actorIdVal)}
            onReference={() => navigateTo("reference")}
            onActivation={() => navigateTo("create", kind)}
          />
        </div>
      </div>
    </EditorPageFrame>
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
