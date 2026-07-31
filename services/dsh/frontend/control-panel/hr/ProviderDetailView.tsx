"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpDescriptionList,
  CpDescriptionRow,
  CpMutedInline,
  CpPageHeader,
  CpStateView } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  ENGAGEMENT_TYPE_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainDetailController,
  useFieldAgentDetailController,
  useServiceZoneReference,
  useWorkforceReferenceData } from "../../shared/workforce";
import type { ProviderKind, LicenseStatus } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";
import { ProviderOperationalCorePanel } from "./ProviderOperationalCorePanel";

export function ProviderDetailView(props: { readonly actorId: string; readonly kind: ProviderKind; readonly onBack: () => void }) {
  if (props.kind === "captain") {
    return <CaptainDetailBody actorId={props.actorId} onBack={props.onBack} />;
  }
  return <FieldAgentDetailBody actorId={props.actorId} onBack={props.onBack} />;
}

type LicenseStatusLabelAr = Record<LicenseStatus, string>;
const LICENSE_STATUS_LABEL_AR: LicenseStatusLabelAr = {
  missing: "مفقودة",
  pending_review: "بانتظار المراجعة",
  valid: "صالحة ومقبولة",
  expired: "منتهية الصلاحية",
  rejected: "مرفوضة" };

function isCurrentOrFutureDate(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
}

function FieldAgentDetailBody(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const reference = useWorkforceReferenceData();
  const zones = useServiceZoneReference();

  if (controller.state.kind === "loading") return <LoadingScreen />;

  if (controller.state.kind === "error") {
    return (
      <DetailPageFrame
        stateView={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <WorkforceErrorState
              message={controller.state.message}
              isSessionExpired={controller.state.isSessionExpired}
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

  const agent = controller.state.agent;
  const rows: Array<[string, string]> = [
    ["الاسم", agent.fullNameAr],
    ["رقم الميداني", agent.workforceCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[agent.workforceKind]],
    ["الهاتف", agent.phoneMasked ?? "—"],
    ["نوع الارتباط", ENGAGEMENT_TYPE_LABEL_AR[agent.engagementType]],
    ["تاريخ البداية", agent.engagementStartDate || "—"],
    ["منطقة الخدمة", zones.zoneLabel(agent.fieldProfile?.serviceZoneId)],
    ["مدينة التشغيل", reference.cityLabel(agent.fieldProfile?.cityCode)],
    ["مسؤول المتابعة", agent.fieldProfile?.supervisorActorId || "—"],
    ["حالة الارتباط", ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]],
  ];

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title="ملف الميداني">
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <CpDescriptionList>
          {rows.map(([label, value]) => (
            <CpDescriptionRow key={label} label={label}>{value}</CpDescriptionRow>
          ))}
        </CpDescriptionList>
        {reference.error || zones.error ? (
          <CpMutedInline>تعذر تحميل بعض المسميات المرجعية؛ المعرفات المعروضة تبقى من البيانات السيادية نفسها.</CpMutedInline>
        ) : null}

        <ProviderOperationalCorePanel actorId={agent.actorId} kind="field" />
        <ProviderActivationWorkspace providerKind="field" initialActorId={agent.actorId} entrySource="hr" />
      </div>
    </DetailPageFrame>
  );
}

function CaptainDetailBody(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useCaptainDetailController(props.actorId);
  const reference = useWorkforceReferenceData();
  const zones = useServiceZoneReference();
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (controller.state.kind === "loading") return <LoadingScreen />;

  if (controller.state.kind === "error") {
    return (
      <DetailPageFrame
        stateView={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <WorkforceErrorState
              message={controller.state.message}
              isSessionExpired={controller.state.isSessionExpired}
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

  const captain = controller.state.captain;
  const profile = captain.captainProfile;
  const documentCount = profile?.documentMediaRefs.length ?? 0;
  const hasValidExpiry = isCurrentOrFutureDate(profile?.licenseExpiresAt);
  const licenceApprovalBlockers = [
    ...(documentCount > 0 ? [] : ["يجب رفع وثيقة رخصة أو إثبات واحد على الأقل"]),
    ...(hasValidExpiry ? [] : ["يجب إدخال تاريخ انتهاء صالح وغير منتهٍ"]),
  ];
  const canApproveLicence = licenceApprovalBlockers.length === 0;

  const rows: Array<[string, string]> = [
    ["الاسم", captain.fullNameAr],
    ["رقم الكابتن", captain.workforceCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[captain.workforceKind]],
    ["الهاتف", captain.phoneMasked ?? "—"],
    ["منطقة الخدمة", zones.zoneLabel(profile?.serviceZoneId)],
    ["مدينة التشغيل", reference.cityLabel(profile?.operatingCityCode)],
    ["نوع المركبة", profile?.vehicleType || "—"],
    ["رقم المركبة", profile?.vehicleIdentifier || "—"],
    ["حالة الرخصة", LICENSE_STATUS_LABEL_AR[profile?.licenseStatus ?? "missing"]],
    ["تاريخ انتهاء الرخصة", profile?.licenseExpiresAt || "—"],
    ["مسؤول المتابعة", profile?.supervisorActorId || "—"],
    ["حالة الارتباط", ENGAGEMENT_STATUS_LABEL_AR[captain.engagementStatus]],
  ];

  const handleUpdateLicense = async (status: LicenseStatus) => {
    await controller.update({ expectedVersion: captain.version, licenseStatus: status });
  };

  const pickAndUpload = async () => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadError(null);
      setUploadBusy(true);
      const objectUrl = URL.createObjectURL(file);
      try {
        await uploadProviderMedia(props.actorId, "captain", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream" });
        await controller.reload();
      } catch {
        setUploadError("تعذر رفع الملف — حاول مجددًا");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setUploadBusy(false);
      }
    };
    input.click();
  };

  const isBusy = controller.actionBusy || uploadBusy;

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title="ملف الكابتن">
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <CpDescriptionList>
          {rows.map(([label, value]) => (
            <CpDescriptionRow key={label} label={label}>{value}</CpDescriptionRow>
          ))}
        </CpDescriptionList>
        {reference.error || zones.error ? (
          <CpMutedInline>تعذر تحميل بعض المسميات المرجعية؛ المعرفات المعروضة تبقى من البيانات السيادية نفسها.</CpMutedInline>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">الوثائق المرفوعة</Text>
          {uploadError ? <CpStateView kind="error" title={uploadError} /> : null}
          <CpMutedInline>{documentCount > 0 ? `${documentCount} ملف مرفوع` : "لا توجد ملفات مرفوعة بعد"}</CpMutedInline>
          <CpButton variant="secondary" disabled={isBusy} onClick={() => void pickAndUpload()}>
            {uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة"}
          </CpButton>
        </div>

        {profile?.licenseStatus !== "valid" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Text role="titleSm">مراجعة رخصة القيادة</Text>
            <Text role="bodySm">الحالة الحالية: {LICENSE_STATUS_LABEL_AR[profile?.licenseStatus ?? "missing"]}</Text>
            <CpMutedInline>
              اعتماد الرخصة لا يتاح إلا بعد وجود وثيقة وتاريخ انتهاء صالح. قاعدة Workforce تفرض الشرط نفسه عند استدعاء API مباشرة.
            </CpMutedInline>
            {!canApproveLicence ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {licenceApprovalBlockers.map((reason) => <CpMutedInline key={reason}>• {reason}</CpMutedInline>)}
              </div>
            ) : null}
            {controller.actionError ? <CpStateView kind="error" title={controller.actionError} /> : null}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <CpButton variant="primary" disabled={isBusy || !canApproveLicence} onClick={() => void handleUpdateLicense("valid")}>اعتماد الرخصة</CpButton>
              <CpButton variant="danger" disabled={isBusy} onClick={() => void handleUpdateLicense("rejected")}>رفض الرخصة</CpButton>
              <CpButton variant="secondary" disabled={isBusy} onClick={() => void handleUpdateLicense("missing")}>طلب استكمال</CpButton>
            </div>
          </div>
        ) : null}

        <ProviderOperationalCorePanel actorId={captain.actorId} kind="captain" />
        <ProviderActivationWorkspace providerKind="captain" initialActorId={captain.actorId} entrySource="hr" />
      </div>
    </DetailPageFrame>
  );
}

function LoadingScreen() {
  return (
    <DetailPageFrame stateView={<CpStateView kind="loading" title="جارٍ تحميل الملف…" />}>
      <div />
    </DetailPageFrame>
  );
}

export default ProviderDetailView;
