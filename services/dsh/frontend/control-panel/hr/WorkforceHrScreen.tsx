"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { useState } from "react";
import type { ProviderKind } from "../../shared/workforce";
import { ProviderListView } from "./ProviderListView";
import { ProviderTypeSelectView } from "./ProviderTypeSelectView";
import { FieldAgentCreateView } from "./FieldAgentCreateView";
import { CaptainCreateView } from "./CaptainCreateView";
import { ProviderDetailView } from "./ProviderDetailView";
import { WorkforceReferenceView } from "./WorkforceReferenceView";

type HrView =
  | { kind: "list" }
  | { kind: "type-select" }
  | { kind: "create"; providerKind: ProviderKind }
  | { kind: "detail"; actorId: string; providerKind: ProviderKind }
  | { kind: "reference" };

export function WorkforceHrScreen() {
  const [view, setView] = useState<HrView>({ kind: "list" });

  if (view.kind === "type-select") {
    return (
      <ProviderTypeSelectView
        onBack={() => setView({ kind: "list" })}
        onSelect={(providerKind) => setView({ kind: "create", providerKind })}
      />
    );
  }
  if (view.kind === "create" && view.providerKind === "captain") {
    return (
      <CaptainCreateView
        onBack={() => setView({ kind: "type-select" })}
        onCreated={(captain) => setView({ kind: "detail", actorId: captain.actorId, providerKind: "captain" })}
      />
    );
  }
  if (view.kind === "create") {
    return (
      <FieldAgentCreateView
        onBack={() => setView({ kind: "type-select" })}
        onCreated={(agent) => setView({ kind: "detail", actorId: agent.actorId, providerKind: "field" })}
      />
    );
  }
  if (view.kind === "detail") {
    return (
      <ProviderDetailView actorId={view.actorId} kind={view.providerKind} onBack={() => setView({ kind: "list" })} />
    );
  }
  if (view.kind === "reference") {
    return <WorkforceReferenceView onBack={() => setView({ kind: "list" })} />;
  }
  return (
    <ProviderListView
      onCreate={() => setView({ kind: "type-select" })}
      onOpen={(actorId, providerKind) => setView({ kind: "detail", actorId, providerKind })}
      onReference={() => setView({ kind: "reference" })}
    />
  );
}

export default WorkforceHrScreen;
