"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProviderKind } from "../../shared/workforce";
import { Box, Button, Card, Header, ScrollScreen, spacing } from "@bthwani/ui-kit";
import { ProviderActivationWorkspace } from "../shared";
import { ProviderListView } from "./ProviderListView";
import { ProviderTypeSelectView } from "./ProviderTypeSelectView";
import { FieldAgentCreateView } from "./FieldAgentCreateView";
import { CaptainCreateView } from "./CaptainCreateView";
import { ProviderDetailView } from "./ProviderDetailView";
import { WorkforceReferenceView } from "./WorkforceReferenceView";

function WorkforceHrScreenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") || "list";
  const kind = (searchParams.get("kind") as ProviderKind) || "field";
  const actorId = searchParams.get("actorId") || "";

  const navigateTo = (newView: string, newKind?: ProviderKind, newActorId?: string) => {
    const params = new URLSearchParams();
    params.set("view", newView);
    if (newKind) params.set("kind", newKind);
    if (newActorId) params.set("actorId", newActorId);
    router.push(`?${params.toString()}`);
  };

  if (view === "type-select") {
    return (
      <ProviderTypeSelectView
        onBack={() => navigateTo("list")}
        onSelect={(providerKind) => navigateTo("create", providerKind)}
      />
    );
  }
  if (view === "create" && kind === "captain") {
    return (
      <CaptainCreateView
        onBack={() => navigateTo("type-select")}
        onCreated={(captain) => navigateTo("detail", "captain", captain.actorId)}
      />
    );
  }
  if (view === "create") {
    return (
      <FieldAgentCreateView
        onBack={() => navigateTo("type-select")}
        onCreated={(agent) => navigateTo("detail", "field", agent.actorId)}
      />
    );
  }
  if (view === "detail") {
    return (
      <ProviderDetailView
        actorId={actorId}
        kind={kind}
        onBack={() => navigateTo("list")}
      />
    );
  }
  if (view === "reference") {
    return <WorkforceReferenceView onBack={() => navigateTo("list")} />;
  }
  if (view === "activation") {
    return (
      <ScrollScreen>
        <Card style={{ padding: spacing[4], gap: spacing[3] }}>
          <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Header
              title="تفعيل حسابات التطبيق"
              subtitle="أصدر أكواد التفعيل، أوقف الحسابات، أو أعد تفعيلها لمقدمي الخدمات."
            />
            <Button label="رجوع" tone="ghost" onPress={() => navigateTo("list")} />
          </Box>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
            <Button
              label="تفعيل الميداني"
              tone={kind === "field" ? "primary" : "secondary"}
              onPress={() => navigateTo("activation", "field")}
            />
            <Button
              label="تفعيل الكباتن"
              tone={kind === "captain" ? "primary" : "secondary"}
              onPress={() => navigateTo("activation", "captain")}
            />
          </Box>
        </Card>

        <ProviderActivationWorkspace
          providerKind={kind}
          entrySource="hr"
        />
      </ScrollScreen>
    );
  }
  return (
    <ProviderListView
      onCreate={() => navigateTo("type-select")}
      onOpen={(actorIdVal, providerKindVal) => navigateTo("detail", providerKindVal, actorIdVal)}
      onReference={() => navigateTo("reference")}
      onActivation={() => navigateTo("activation", "field")}
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
