"use client";
import { Button } from "@bthwani/ui-kit";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIdentitySession } from "@bthwani/core-identity";
import type { ProviderKind } from "../../shared/workforce";
import { CpBadge, CpPageHeader, CpStatePanel, CpTabs } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

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

function providerKindLabel(kind: ProviderKind): string {
  if (kind === "captain") return "الكابتن";
  if (kind === "employee") return "الموظف";
  return "الميداني";
}

function WorkforceHrScreenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: identityState } = useIdentitySession();
  const identity = identityState.kind === "authenticated" ? identityState.identity : null;
  const canCreate = hasServiceControlPanelPermission(identity, "workforce", "provider:create");
  const canUpdate = hasServiceControlPanelPermission(identity, "workforce", "provider:update");
  const canSuspend = hasServiceControlPanelPermission(identity, "workforce", "provider:suspend");
  const canReactivate = hasServiceControlPanelPermission(identity, "workforce", "provider:reactivate");
  const canManageReference = hasServiceControlPanelPermission(identity, "workforce", "reference:manage");

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
    if (!canCreate) {
      return <EditorPageFrame header={<CpPageHeader title="إضافة مقدم خدمة"><Button variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</Button></CpPageHeader>}><CpStatePanel role="alert" title="الإنشاء غير متاح" description="لا تملك جلسة لوحة التحكم صلاحية provider:create على Workforce." /></EditorPageFrame>;
    }
    if (kind === "employee") {
      return (
        <EditorPageFrame header={<CpPageHeader title="إضافة موظف إداري"><Button variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</Button></CpPageHeader>}>
          <EmployeeCreateView inline onCreated={(caseId) => navigateTo("created-success", "employee", caseId)} />
        </EditorPageFrame>
      );
    }
    if (kind === "captain") {
      return (
        <EditorPageFrame header={<CpPageHeader title="إضافة كابتن"><Button variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</Button></CpPageHeader>}>
          <CaptainCreateView inline onCreated={(caseId) => navigateTo("created-success", "captain", caseId)} />
        </EditorPageFrame>
      );
    }
    return (
      <EditorPageFrame header={<CpPageHeader title="إضافة ميداني"><Button variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع</Button></CpPageHeader>}>
        <FieldAgentCreateView inline onCreated={(caseId) => navigateTo("created-success", "field", caseId)} />
      </EditorPageFrame>
    );
  }

  if (view === "created-success") {
    return (
      <EditorPageFrame header={<CpPageHeader title="تمت الإضافة بنجاح"><Button variant="ghost" onClick={() => navigateTo("list", kind)}>رجوع للقائمة</Button></CpPageHeader>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", justifyContent: "center", padding: "64px 20px" }}>
          <CpBadge tone="success">تمت إضافة {providerKindLabel(kind)} بنجاح!</CpBadge>
          <Button variant="primary" onClick={() => navigateTo("detail", kind, actorId)}>
            تفعيل
          </Button>
        </div>
      </EditorPageFrame>
    );
  }

  if (view === "detail") {
    if (kind === "employee") return <EmployeeDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} canUpdate={canUpdate} canSuspend={canSuspend} canReactivate={canReactivate} />;
    if (kind === "captain") return <CaptainDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} canUpdate={canUpdate} />;
    return <FieldAgentDetailView actorId={actorId} onBack={() => navigateTo("list", kind)} canUpdate={canUpdate} />;
  }

  if (view === "reference") {
    return <WorkforceReferenceView onBack={() => navigateTo("list", kind)} canManage={canManageReference} />;
  }

  // view === "list"
  return (
    <EditorPageFrame
      header={
        <CpPageHeader title="مقدمي الخدمة">
          {canCreate ? <Button variant="primary" onClick={() => navigateTo("create", kind)}>إضافة {kind === "captain" ? "كابتن" : kind === "field" ? "ميداني" : "موظف"}</Button> : null}
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <CpTabs aria-label="نوع مقدم الخدمة" value={kind} onChange={(value) => navigateTo("list", value as ProviderKind)} items={KIND_TABS} />

        <div style={{ marginTop: "16px" }}>
          <ProviderListView
            forcedKind={kind}
            canCreate={canCreate}
            onCreate={() => navigateTo("create", kind)}
            onOpen={(actorIdVal, providerKindVal) => navigateTo("detail", providerKindVal, actorIdVal)}
            onReference={() => navigateTo("reference")}
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
