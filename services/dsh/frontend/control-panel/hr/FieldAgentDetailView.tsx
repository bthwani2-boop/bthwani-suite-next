"use client";

import React, { useEffect, useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStateView, CpTabs, CpTextInput } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useFieldAgentDetailController,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { ProviderOperationalCorePanel } from "./ProviderOperationalCorePanel";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";
import { useIdentitySession } from "@bthwani/core-identity";

export function FieldAgentDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const agent = controller.state.kind === "ready" ? controller.state.agent : null;
  const profile = agent?.fieldProfile;

  const [activeTab, setActiveTab] = useState("profile");
  const [fullNameAr, setFullNameAr] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { state: identityState } = useIdentitySession();
  const operatorContextId = identityState.kind === "active" ? identityState.identity.actorId : "";

  useEffect(() => {
    if (!agent) return;
    setFullNameAr(agent.fullNameAr);
    setZoneId(agent.fieldProfile?.serviceZoneId ?? "");
    setEngagementStartDate(agent.engagementStartDate ?? "");
    setSupervisor(
      agent.fieldProfile?.supervisorActorId
        ? { actorId: agent.fieldProfile.supervisorActorId, username: agent.fieldProfile.supervisorActorId, active: true }
        : null,
    );
  }, [agent?.actorId, agent?.version]);

  if (controller.state.kind === "loading") {
    return (
      <DetailPageFrame stateView={<CpStateView kind="loading" title="جارٍ تحميل ملف الميداني…" />}>
        <div />
      </DetailPageFrame>
    );
  }

  if (controller.state.kind === "error" || !agent) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <DetailPageFrame
        stateView={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <WorkforceErrorState
              message={errorState?.message ?? "تعذر تحميل ملف الميداني"}
              isSessionExpired={errorState?.isSessionExpired ?? false}
              onRetry={() => void controller.reload()}
            />
            <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
          </div>
        }
      >
        <div />
      </DetailPageFrame>
    );
  }

  const pickFile = (purpose: "photo" | "document") => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = purpose === "photo" ? "image/*" : "image/*,application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadBusy(true);
      setUploadError(null);
      const objectUrl = URL.createObjectURL(file);
      try {
        const mediaRef = await uploadProviderMedia(agent.actorId, "field-agents", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
        }, operatorContextId);
        if (purpose === "photo") {
          await controller.update({ expectedVersion: agent.version, photoMediaRef: mediaRef });
        } else {
          await appendProviderDocument("field", agent.actorId, agent.version, mediaRef);
          await controller.reload();
        }
      } catch {
        setUploadError("تعذر رفع الملف وربطه بملف Workforce.");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setUploadBusy(false);
      }
    };
    input.click();
  };

  const canSave = fullNameAr.trim().length > 0 && zoneId.length > 0 && !controller.actionBusy;

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title="ملف الميداني">
          <CpMutedInline tight>{agent.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}</CpMutedInline>
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <CpTabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { label: "الملف الأساسي", value: "profile" },
            { label: "الوثائق والصور", value: "media" },
            { label: "التشغيل والربط", value: "ops" },
          ]}
        />
        {activeTab === "profile" && (
          <section style={{
            padding: "24px",
            border: "1px solid var(--bthwani-control-panel-border)",
            borderRadius: "16px",
            background: "var(--bthwani-control-panel-surface)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <Text role="titleMd">البيانات الأساسية</Text>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Text role="bodySm" style={{ marginBottom: "8px", display: "block" }}>الاسم بالعربية *</Text>
                <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم بالعربية" />
              </div>
              <div>
                <Text role="bodySm" style={{ marginBottom: "8px", display: "block" }}>تاريخ بداية الارتباط</Text>
                <CpTextInput type="date" value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" aria-label="تاريخ بداية الارتباط" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} />
            </div>
        <ProviderActivationWorkspace providerKind="field" initialActorId={agent.actorId} entrySource="hr" />
      </div>
    </DetailPageFrame>
  );
}

export default FieldAgentDetailView;
