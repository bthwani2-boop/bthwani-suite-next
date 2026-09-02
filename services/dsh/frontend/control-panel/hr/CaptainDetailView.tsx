"use client";

import React, { useEffect, useState } from "react";
import { CpMutedInline, CpPageHeader, CpStateView, CpTabs, CpTextInput } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Button, Text } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  useCaptainDetailController,
  type LicenseStatus,
  type SupervisorCandidate } from "../../shared/workforce";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { ProviderOperationalCorePanel } from "./ProviderOperationalCorePanel";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";
import { useIdentitySession } from "@bthwani/core-identity";
import { CaptainFleetMembershipsPanel } from "./CaptainFleetMembershipsPanel";

import { ZonePicker } from "./ZonePicker";

const LICENSE_LABEL: Record<LicenseStatus, string> = {
  missing: "مفقودة",
  pending_review: "بانتظار المراجعة",
  valid: "صالحة",
  expired: "منتهية",
  rejected: "مرفوضة" };

const licenseStatusLabel = (status: string | undefined): string => {
  if (status && Object.hasOwn(LICENSE_LABEL, status)) return LICENSE_LABEL[status as LicenseStatus];
  return LICENSE_LABEL.missing;
};

export function CaptainDetailView(props: { readonly actorId: string; readonly onBack: () => void; readonly canUpdate: boolean }) {
  const controller = useCaptainDetailController(props.actorId);
  const captain = controller.state.kind === "ready" ? controller.state.captain : null;

  const [activeTab, setActiveTab] = useState("profile");
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

  const { state: identityState } = useIdentitySession();
  const operatorContextId = identityState.kind === "authenticated"
    ? identityState.identity.operatorContextId
    : "";

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
      <DetailPageFrame stateView={<CpStateView kind="loading" title="جارٍ تحميل ملف الكابتن…" />}>
        <div />
      </DetailPageFrame>
    );
  }

  if (controller.state.kind === "error" || !captain) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <DetailPageFrame
        stateView={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <WorkforceErrorState
              message={errorState?.message ?? "تعذر تحميل ملف الكابتن"}
              isSessionExpired={errorState?.isSessionExpired ?? false}
              onRetry={() => void controller.reload()}
            />
            <Button variant="ghost" onClick={props.onBack}>رجوع</Button>
          </div>
        }
      >
        <div />
      </DetailPageFrame>
    );
  }

  const profile = captain.captainProfile;
  const documentCount = profile?.documentMediaRefs.length ?? 0;
  const expiry = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
  const validExpiry = Boolean(expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() >= new Date(new Date().toDateString()).getTime());
  const canApproveLicense = documentCount > 0 && validExpiry;

  const pickFile = (purpose: "photo" | "document") => {
    if (!props.canUpdate) return;
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
        const mediaRef = await uploadProviderMedia(captain.actorId, "captains", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream" }, operatorContextId);
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
      ...(licenseExpiresAt.trim() ? { licenseExpiresAt: licenseExpiresAt.trim() } : {}) });

  const canSave =
    props.canUpdate &&
    fullNameAr.trim().length > 0 &&
    zoneId.length > 0 &&
    vehicleType.trim().length > 0 &&
    vehicleIdentifier.trim().length > 0 &&
    !controller.actionBusy;

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title="ملف الكابتن">
          <CpMutedInline tight>{captain.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[captain.engagementStatus]}</CpMutedInline>
          <Button variant="ghost" onClick={props.onBack}>رجوع</Button>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!props.canUpdate ? <CpStateView kind="error" title="هذا الملف للقراءة فقط" /> : null}
        <CpTabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { label: "الملف الأساسي", value: "profile" },
            { label: "الوثائق والرخصة", value: "media" },
            { label: "التشغيل والربط", value: "ops" },
          ]}
        />
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <Text role="bodySm">الاسم بالعربية *</Text>
              <CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={!props.canUpdate} aria-label="الاسم بالعربية" />
            </div>
            <div>
              <Text role="bodySm">الاسم بالإنجليزية</Text>
              <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={!props.canUpdate} aria-label="الاسم بالإنجليزية" />
            </div>
            <div>
              <Text role="bodySm">تاريخ بداية الارتباط</Text>
              <CpTextInput type="date" value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={!props.canUpdate} aria-label="تاريخ بداية الارتباط" />
            </div>
            <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} disabled={!props.canUpdate} />
            <div>
              <Text role="bodySm">نوع المركبة *</Text>
              <CpTextInput value={vehicleType} onChange={setVehicleType} disabled={!props.canUpdate} aria-label="نوع المركبة" />
            </div>
            <div>
              <Text role="bodySm">رقم أو لوحة المركبة *</Text>
              <CpTextInput value={vehicleIdentifier} onChange={setVehicleIdentifier} disabled={!props.canUpdate} aria-label="رقم أو لوحة المركبة" />
            </div>
            <div>
              <Text role="bodySm">نطاق التشغيل</Text>
              <CpTextInput value={operatingScopeCode} onChange={setOperatingScopeCode} disabled={!props.canUpdate} aria-label="نطاق التشغيل" />
            </div>
            <div>
              <Text role="bodySm">تاريخ انتهاء الرخصة</Text>
              <CpTextInput type="date" value={licenseExpiresAt} onChange={setLicenseExpiresAt} placeholder="YYYY-MM-DD" disabled={!props.canUpdate} aria-label="تاريخ انتهاء الرخصة" />
            </div>

            <Text role="bodySm" style={{ fontWeight: "bold" }}>المشرف</Text>
            <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} disabled={!props.canUpdate} />
            {controller.actionError ? <CpStateView kind="error" title={controller.actionError} /> : null}

            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() =>
                void controller.update({
                  expectedVersion: captain.version,
                  fullNameAr: fullNameAr.trim(),
                  ...(fullNameEn.trim() ? { fullNameEn: fullNameEn.trim() } : {}),
                  ...(engagementStartDate.trim() ? { engagementStartDate: engagementStartDate.trim() } : {}),
                  serviceZoneId: zoneId,
                  vehicleType: vehicleType.trim(),
                  vehicleIdentifier: vehicleIdentifier.trim(),
                  ...(licenseExpiresAt.trim() ? { licenseExpiresAt: licenseExpiresAt.trim() } : {}),
                  ...(operatingScopeCode.trim() ? { operatingScopeCode: operatingScopeCode.trim() } : {}),
                  ...(supervisor?.actorId ? { supervisorActorId: supervisor.actorId } : {}) })
              }
            >
              {controller.actionBusy ? "جارٍ الحفظ…" : "حفظ الملف التشغيلي"}
            </Button>
          </div>
        )}

        {activeTab === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Text role="titleSm">الصورة ووثائق الرخصة</Text>
            <Text role="bodySm">الصورة: {captain.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
            <Text role="bodySm">الوثائق: {documentCount}</Text>
            <Text role="bodySm">حالة الرخصة: {licenseStatusLabel(profile?.licenseStatus)}</Text>
            {uploadError ? <CpStateView kind="error" title={uploadError} /> : null}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button variant="secondary" disabled={uploadBusy || !props.canUpdate} onClick={() => pickFile("photo")}>
                {uploadBusy ? "جارٍ الرفع…" : "رفع صورة شخصية"}
              </Button>
              <Button variant="secondary" disabled={uploadBusy || !props.canUpdate} onClick={() => pickFile("document")}>
                {uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة رخصة"}
              </Button>
            </div>
            {!canApproveLicense ? (
              <CpMutedInline>اعتماد الرخصة يتطلب وثيقة مرتبطة وتاريخ انتهاء صالحًا.</CpMutedInline>
            ) : null}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button variant="primary" disabled={!canApproveLicense || !props.canUpdate || controller.actionBusy} onClick={() => void updateLicenseStatus("valid")}>اعتماد الرخصة</Button>
              <Button variant="danger" disabled={!props.canUpdate || controller.actionBusy} onClick={() => void updateLicenseStatus("rejected")}>رفض الرخصة</Button>
              <Button variant="secondary" disabled={!props.canUpdate || controller.actionBusy} onClick={() => void updateLicenseStatus("missing")}>طلب استكمال</Button>
            </div>
          </div>
        )}

        {activeTab === "ops" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <ProviderOperationalCorePanel actorId={captain.actorId} kind="captain" canUpdate={props.canUpdate} />
            <CaptainFleetMembershipsPanel actorId={captain.actorId} />
            <ProviderActivationWorkspace providerKind="captain" initialActorId={captain.actorId} entrySource="hr" />
          </div>
        )}
      </div>
    </DetailPageFrame>
  );
}

export default CaptainDetailView;
