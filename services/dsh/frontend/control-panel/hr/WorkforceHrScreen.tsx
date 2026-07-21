"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProviderKind } from "../../shared/workforce";
import { Box, Button, Card, Header, ScrollScreen, Text, spacing } from "@bthwani/ui-kit";

import { ProviderListView } from "./ProviderListView";
import { FieldAgentCreateView } from "./FieldAgentCreateView";
import { CaptainCreateView } from "./CaptainCreateView";
import { EmployeeCreateView } from "./EmployeeCreateView";
import { ProviderDetailView } from "./ProviderDetailView";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { WorkforceReferenceView } from "./WorkforceReferenceView";

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
      <ScrollScreen>
        <Card style={{ padding: spacing[4], gap: spacing[3] }}>
          <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Header
              title="إضافة عضو Workforce"
              subtitle="أنشئ مقدم خدمة ميدانيًا أو كابتنًا أو موظفًا إداريًا من المصدر السيادي نفسه."
            />
            <Button label="رجوع" tone="ghost" onPress={() => navigateTo("list")} />
          </Box>
          <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>نوع العضو:</Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            <Button label="كابتن" tone={kind === "captain" ? "primary" : "secondary"} onPress={() => navigateTo("create", "captain")} />
            <Button label="ميداني" tone={kind === "field" ? "primary" : "secondary"} onPress={() => navigateTo("create", "field")} />
            <Button label="موظف إداري" tone={kind === "employee" ? "primary" : "secondary"} onPress={() => navigateTo("create", "employee")} />
          </Box>
        </Card>

        {kind === "captain" ? (
          <CaptainCreateView inline onCreated={(captain) => navigateTo("detail", "captain", captain.actorId)} />
        ) : kind === "employee" ? (
          <EmployeeCreateView inline onCreated={(employee) => navigateTo("detail", "employee", employee.actorId)} />
        ) : (
          <FieldAgentCreateView inline onCreated={(agent) => navigateTo("detail", "field", agent.actorId)} />
        )}
      </ScrollScreen>
    );
  }

  if (view === "detail") {
    return kind === "employee" ? (
      <EmployeeDetailView actorId={actorId} onBack={() => navigateTo("list")} />
    ) : (
      <ProviderDetailView actorId={actorId} kind={kind} onBack={() => navigateTo("list")} />
    );
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
