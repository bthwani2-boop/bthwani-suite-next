"use client";

import React, { useEffect, useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStateView, CpTextInput } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useFieldAgentDetailController,
  type SupervisorCandidate } from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { ProviderOperationalCorePanel } from "./ProviderOperationalCorePanel";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";

import { ZonePicker } from "./ZonePicker";

export function FieldAgentDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const agent = controller.state.kind === "ready" ? controller.state.agent : null;

  const [fullNameAr, setFullNameAr] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        const mediaRef = await uploadProviderMedia(agent.actorId, "field", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream" });
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

  const profile = agent.fieldProfile;
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
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <CpMutedInline>
          الميداني مقدم خدمة مستقل بلا وردية أو حضور. التفعيل وإصدار كود الدخول من صلاحية قسم الشراكات بعد اكتمال بوابة التفعيل.
        </CpMutedInline>

        <section style={{
          padding: "24px",
          border: "1px solid var(--bthwani-control-panel-border)",
          borderRadius: "16px",
          background: "var(--bthwani-control-panel-surface)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <Text role="titleMd" style={{ marginBottom: "8px" }}>المعلومات الأساسية</Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Text role="bodySm" style={{ fontWeight: 600 }}>الاسم بالعربية *</Text>
              <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم بالعربية" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Text role="bodySm" style={{ fontWeight: 600 }}>تاريخ بداية الارتباط</Text>
              <CpTextInput type="date" value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" aria-label="تاريخ بداية الارتباط" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} />
            </div>
          </div>
          <div style={{ height: "1px", background: "var(--bthwani-control-panel-border)", margin: "8px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Text role="bodySm" style={{ fontWeight: 600 }}>مسؤول المتابعة والمشرف المباشر</Text>
            <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} />
          </div>
          {controller.actionError ? <CpStateView kind="error" title={controller.actionError} /> : null}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <CpButton
              variant="primary"
              disabled={!canSave}
              onClick={() =>
                void controller.update({
                  expectedVersion: agent.version,
                  fullNameAr: fullNameAr.trim(),
                  engagementStartDate: engagementStartDate.trim() || undefined,
                  serviceZoneId: zoneId,
                  supervisorActorId: supervisor?.actorId })
              }
            >
              {controller.actionBusy ? "جارٍ الحفظ…" : "حفظ الملف التشغيلي"}
            </CpButton>
          </div>
        </section>

        <section style={{
          padding: "24px",
          border: "1px solid var(--bthwani-control-panel-border)",
          borderRadius: "16px",
          background: "var(--bthwani-control-panel-surface)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <Text role="titleMd">الصورة والوثائق</Text>
          <div style={{ display: "flex", gap: "24px" }}>
            <Text role="bodySm">
              <span style={{ color: "var(--bthwani-control-panel-text-muted)" }}>الصورة:</span>{" "}
              <span style={{ fontWeight: 600 }}>{agent.photoMediaRef ? "مرتبطة" : "مفقودة"}</span>
            </Text>
            <Text role="bodySm">
              <span style={{ color: "var(--bthwani-control-panel-text-muted)" }}>الوثائق:</span>{" "}
              <span style={{ fontWeight: 600 }}>{profile?.documentMediaRefs.length ?? 0}</span>
            </Text>
          </div>
          {uploadError ? <CpStateView kind="error" title={uploadError} /> : null}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("photo")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع صورة شخصية"}
            </CpButton>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("document")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة"}
            </CpButton>
          </div>
        </section>

        <ProviderOperationalCorePanel actorId={agent.actorId} kind="field" />
        <ProviderActivationWorkspace providerKind="field" initialActorId={agent.actorId} entrySource="hr" />
      </div>
    </DetailPageFrame>
  );
}

export default FieldAgentDetailView;
