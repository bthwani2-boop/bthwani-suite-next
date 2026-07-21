"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useFieldAgentDetailController,
  useWorkforceReferenceData,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

export function FieldAgentDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const reference = useWorkforceReferenceData(true);
  const agent = controller.state.kind === "ready" ? controller.state.agent : null;

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    setFullNameAr(agent.fullNameAr);
    setFullNameEn(agent.fullNameEn ?? "");
    setZoneId(agent.fieldProfile?.serviceZoneId ?? "");
    setShiftCode(agent.fieldProfile?.shiftCode ?? "");
    setEngagementStartDate(agent.engagementStartDate ?? "");
    setSupervisor(
      agent.fieldProfile?.supervisorActorId
        ? { actorId: agent.fieldProfile.supervisorActorId, username: agent.fieldProfile.supervisorActorId, active: true }
        : null,
    );
  }, [agent?.actorId, agent?.version]);

  if (controller.state.kind === "loading") {
    return (
      <ScrollScreen>
        <Card style={{ padding: spacing[4] }}><Text role="bodySm" tone="muted" align="center">جارٍ تحميل ملف الميداني…</Text></Card>
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "error" || !agent) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <ScrollScreen>
        <WorkforceErrorState
          message={errorState?.message ?? "تعذر تحميل ملف الميداني"}
          isSessionExpired={errorState?.isSessionExpired ?? false}
          onRetry={() => void controller.reload()}
        />
        <Button label="رجوع" tone="ghost" onPress={props.onBack} />
      </ScrollScreen>
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
  const canSave = fullNameAr.trim() && zoneId && shiftCode && !controller.actionBusy;

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Box style={{ alignItems: "flex-end", gap: spacing[1] }}>
            <Text role="titleSm">ملف مقدم الخدمة الميداني</Text>
            <Text role="caption" tone="muted">{agent.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}</Text>
          </Box>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>

        <TextField label="الاسم بالعربية *" value={fullNameAr} onChangeText={setFullNameAr} />
        <TextField label="الاسم بالإنجليزية" value={fullNameEn} onChangeText={setFullNameEn} />
        <TextField label="تاريخ بداية الارتباط" value={engagementStartDate} onChangeText={setEngagementStartDate} placeholder="YYYY-MM-DD" />

        <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الوردية</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {reference.shifts.filter((shift) => shift.active !== false).map((shift) => (
            <Button
              key={shift.code}
              label={shift.nameAr}
              tone={shiftCode === shift.code ? "primary" : "ghost"}
              onPress={() => setShiftCode(shift.code)}
            />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المشرف</Text>
        <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} />

        {controller.actionError ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{controller.actionError}</Text> : null}

        <Button
          label="حفظ الملف التشغيلي"
          tone="primary"
          disabled={!canSave}
          loading={controller.actionBusy}
          onPress={() =>
            void controller.update({
              expectedVersion: agent.version,
              fullNameAr: fullNameAr.trim(),
              fullNameEn: fullNameEn.trim() || undefined,
              engagementStartDate: engagementStartDate.trim() || undefined,
              serviceZoneId: zoneId,
              shiftCode,
              supervisorActorId: supervisor?.actorId,
            })
          }
        />
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right" }}>الصورة والوثائق</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الصورة: {agent.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الوثائق: {profile?.documentMediaRefs.length ?? 0}</Text>
        {uploadError ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{uploadError}</Text> : null}
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          <Button label="رفع صورة شخصية" tone="secondary" loading={uploadBusy} disabled={uploadBusy} onPress={() => pickFile("photo")} />
          <Button label="رفع وثيقة مهنية" tone="secondary" loading={uploadBusy} disabled={uploadBusy} onPress={() => pickFile("document")} />
        </Box>
      </Card>

      <ProviderActivationWorkspace providerKind="field" initialActorId={agent.actorId} entrySource="hr" />
    </ScrollScreen>
  );
}

export default FieldAgentDetailView;
