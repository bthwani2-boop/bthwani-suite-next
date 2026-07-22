"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useCaptainDetailController,
  type LicenseStatus,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";
import { WorkforceScopeManager } from "./WorkforceScopeManager";
import { ZonePicker } from "./ZonePicker";

const LICENSE_LABEL: Record<LicenseStatus, string> = {
  missing: "مفقودة",
  pending_review: "بانتظار المراجعة",
  valid: "صالحة",
  expired: "منتهية",
  rejected: "مرفوضة",
};

export function CaptainDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useCaptainDetailController(props.actorId);
  const captain = controller.state.kind === "ready" ? controller.state.captain : null;

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleIdentifier, setVehicleIdentifier] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [operatingScopeCode, setOperatingScopeCode] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!captain) return;
    const profile = captain.captainProfile;
    setFullNameAr(captain.fullNameAr);
    setFullNameEn(captain.fullNameEn ?? "");
    setZoneId(profile?.serviceZoneId ?? "");
    setVehicleType(profile?.vehicleType ?? "");
    setVehicleIdentifier(profile?.vehicleIdentifier ?? "");
    setLicenseExpiresAt(profile?.licenseExpiresAt ?? "");
    setOperatingScopeCode(profile?.operatingScopeCode ?? "");
    setEngagementStartDate(captain.engagementStartDate ?? "");
    setSupervisor(
      profile?.supervisorActorId
        ? { actorId: profile.supervisorActorId, username: profile.supervisorActorId, active: true }
        : null,
    );
  }, [captain?.actorId, captain?.version]);

  if (controller.state.kind === "loading") {
    return (
      <ScrollScreen>
        <Card style={{ padding: spacing[4] }}><Text role="bodySm" tone="muted" align="center">جارٍ تحميل ملف الكابتن…</Text></Card>
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "error" || !captain) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <ScrollScreen>
        <WorkforceErrorState
          message={errorState?.message ?? "تعذر تحميل ملف الكابتن"}
          isSessionExpired={errorState?.isSessionExpired ?? false}
          onRetry={() => void controller.reload()}
        />
        <Button label="رجوع" tone="ghost" onPress={props.onBack} />
      </ScrollScreen>
    );
  }

  const profile = captain.captainProfile;
  const documentCount = profile?.documentMediaRefs.length ?? 0;
  const expiry = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
  const validExpiry = Boolean(expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() >= new Date(new Date().toDateString()).getTime());
  const canApproveLicense = documentCount > 0 && validExpiry;

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
        const mediaRef = await uploadProviderMedia(captain.actorId, "captain", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        if (purpose === "photo") {
          await controller.update({ expectedVersion: captain.version, photoMediaRef: mediaRef });
        } else {
          await appendProviderDocument("captain", captain.actorId, captain.version, mediaRef);
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

  const updateLicenseStatus = (licenseStatus: LicenseStatus) =>
    controller.update({
      expectedVersion: captain.version,
      licenseStatus,
      licenseExpiresAt: licenseExpiresAt.trim() || undefined,
    });

  const canSave =
    fullNameAr.trim().length > 0 &&
    zoneId.length > 0 &&
    vehicleType.trim().length > 0 &&
    vehicleIdentifier.trim().length > 0 &&
    !controller.actionBusy;

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Box style={{ alignItems: "flex-end", gap: spacing[1] }}>
            <Text role="titleSm">ملف الكابتن</Text>
            <Text role="caption" tone="muted">{captain.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[captain.engagementStatus]}</Text>
          </Box>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>

        <TextField label="الاسم بالعربية *" value={fullNameAr} onChangeText={setFullNameAr} />
        <TextField label="الاسم بالإنجليزية" value={fullNameEn} onChangeText={setFullNameEn} />
        <TextField label="تاريخ بداية الارتباط" value={engagementStartDate} onChangeText={setEngagementStartDate} placeholder="YYYY-MM-DD" />
        <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} />
        <TextField label="نوع المركبة *" value={vehicleType} onChangeText={setVehicleType} />
        <TextField label="رقم أو لوحة المركبة *" value={vehicleIdentifier} onChangeText={setVehicleIdentifier} />
        <TextField label="نطاق التشغيل" value={operatingScopeCode} onChangeText={setOperatingScopeCode} />
        <TextField label="تاريخ انتهاء الرخصة" value={licenseExpiresAt} onChangeText={setLicenseExpiresAt} placeholder="YYYY-MM-DD" />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المشرف</Text>
        <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} />
        {controller.actionError ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{controller.actionError}</Text> : null}

        <Button
          label="حفظ الملف التشغيلي"
          tone="primary"
          disabled={!canSave}
          loading={controller.actionBusy}
          onPress={() =>
            void controller.update({
              expectedVersion: captain.version,
              fullNameAr: fullNameAr.trim(),
              fullNameEn: fullNameEn.trim() || undefined,
              engagementStartDate: engagementStartDate.trim() || undefined,
              serviceZoneId: zoneId,
              vehicleType: vehicleType.trim(),
              vehicleIdentifier: vehicleIdentifier.trim(),
              licenseExpiresAt: licenseExpiresAt.trim() || undefined,
              operatingScopeCode: operatingScopeCode.trim() || undefined,
              supervisorActorId: supervisor?.actorId,
            })
          }
        />
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right" }}>الصورة ووثائق الرخصة</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الصورة: {captain.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الوثائق: {documentCount}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>حالة الرخصة: {LICENSE_LABEL[profile?.licenseStatus ?? "missing"]}</Text>
        {uploadError ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{uploadError}</Text> : null}
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          <Button label="رفع صورة شخصية" tone="secondary" loading={uploadBusy} disabled={uploadBusy} onPress={() => pickFile("photo")} />
          <Button label="رفع وثيقة رخصة" tone="secondary" loading={uploadBusy} disabled={uploadBusy} onPress={() => pickFile("document")} />
        </Box>
        {!canApproveLicense ? (
          <Text role="caption" tone="warning" style={{ textAlign: "right" }}>
            اعتماد الرخصة يتطلب وثيقة مرتبطة وتاريخ انتهاء صالحًا.
          </Text>
        ) : null}
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          <Button label="اعتماد الرخصة" tone="primary" disabled={!canApproveLicense || controller.actionBusy} onPress={() => void updateLicenseStatus("valid")} />
          <Button label="رفض الرخصة" tone="danger" disabled={controller.actionBusy} onPress={() => void updateLicenseStatus("rejected")} />
          <Button label="طلب استكمال" tone="secondary" disabled={controller.actionBusy} onPress={() => void updateLicenseStatus("missing")} />
        </Box>
      </Card>

      <WorkforceScopeManager actorId={captain.actorId} actorRole="captain" />
      <ProviderActivationWorkspace providerKind="captain" initialActorId={captain.actorId} entrySource="hr" />
    </ScrollScreen>
  );
}

export default CaptainDetailView;
