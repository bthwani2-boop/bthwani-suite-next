"use client";

import React, { useEffect, useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useFieldAgentDetailController,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";
import { WorkforceScopeManager } from "./WorkforceScopeManager";
import { ZonePicker } from "./ZonePicker";

export function FieldAgentDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const agent = controller.state.kind === "ready" ? controller.state.agent : null;

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    setFullNameAr(agent.fullNameAr);
    setFullNameEn(agent.fullNameEn ?? "");
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
      <DetailPageFrame stateView={<CpStatePanel role="status" title="جارٍ تحميل ملف الميداني…" />}>
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
          mimeType: file.type || "application/octet-stream",
        });
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
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <CpMutedInline>
          الميداني مقدم خدمة مستقل بلا وردية أو حضور. التفعيل وإصدار كود الدخول من صلاحية قسم الشراكات بعد اكتمال بوابة التفعيل.
        </CpMutedInline>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <Text role="bodySm">الاسم بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم بالعربية" />
          </div>
          <div>
            <Text role="bodySm">الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} aria-label="الاسم بالإنجليزية" />
          </div>
          <div>
            <Text role="bodySm">تاريخ بداية الارتباط</Text>
            <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" aria-label="تاريخ بداية الارتباط" />
          </div>
          <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} />

          <Text role="bodySm" style={{ fontWeight: "bold" }}>مسؤول المتابعة</Text>
          <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} />
          {controller.actionError ? <CpStatePanel role="alert" title={controller.actionError} /> : null}

          <CpButton
            variant="primary"
            disabled={!canSave}
            onClick={() =>
              void controller.update({
                expectedVersion: agent.version,
                fullNameAr: fullNameAr.trim(),
                fullNameEn: fullNameEn.trim() || undefined,
                engagementStartDate: engagementStartDate.trim() || undefined,
                serviceZoneId: zoneId,
                supervisorActorId: supervisor?.actorId,
              })
            }
          >
            {controller.actionBusy ? "جارٍ الحفظ…" : "حفظ الملف التشغيلي"}
          </CpButton>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">الصورة والوثائق</Text>
          <Text role="bodySm">الصورة: {agent.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
          <Text role="bodySm">الوثائق: {profile?.documentMediaRefs.length ?? 0}</Text>
          {uploadError ? <CpStatePanel role="alert" title={uploadError} /> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("photo")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع صورة شخصية"}
            </CpButton>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("document")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة"}
            </CpButton>
          </div>
        </div>

        <WorkforceScopeManager actorId={agent.actorId} actorRole="field" />
      </div>
    </DetailPageFrame>
  );
}

export default FieldAgentDetailView;
