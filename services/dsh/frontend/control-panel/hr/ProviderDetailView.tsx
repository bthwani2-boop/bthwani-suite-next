"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, spacing } from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  ENGAGEMENT_TYPE_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainDetailController,
  useFieldAgentDetailController,
  useServiceZoneReference,
  useWorkforceReferenceData,
} from "../../shared/workforce";
import type { ProviderKind, LicenseStatus } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { uploadProviderMedia } from "../../shared/media/field-document-media";
import { ProviderActivationWorkspace } from "../shared";

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
  rejected: "مرفوضة",
};

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
      <ScrollScreen>
        <WorkforceErrorState
          message={controller.state.message}
          isSessionExpired={controller.state.isSessionExpired}
          onRetry={() => void controller.reload()}
        />
        <Box style={{ alignItems: "center", marginTop: spacing[2] }}>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
      </ScrollScreen>
    );
  }

  const agent = controller.state.agent;
  const rows: Array<[string, string]> = [
    ["الاسم", agent.fullNameAr],
    ["رقم مقدم الخدمة", agent.workforceCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[agent.workforceKind]],
    ["الهاتف", agent.phoneMasked ?? "—"],
    ["نوع الارتباط", ENGAGEMENT_TYPE_LABEL_AR[agent.engagementType]],
    ["تاريخ البداية", agent.engagementStartDate || "—"],
    ["منطقة الخدمة السيادية", zones.zoneLabel(agent.fieldProfile?.serviceZoneId)],
    ["مدينة التشغيل المشتقة", reference.cityLabel(agent.fieldProfile?.cityCode)],
    ["الوردية", reference.shiftLabel(agent.fieldProfile?.shiftCode)],
    ["المشرف", agent.fieldProfile?.supervisorActorId || "—"],
    ["حالة الارتباط", ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]],
  ];

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>ملف مقدم الخدمة</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        {rows.map(([label, value]) => (
          <Box key={label} style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
            <Text role="bodySm" tone="muted">{label}</Text>
            <Text role="bodyStrong">{value}</Text>
          </Box>
        ))}
        {(reference.error || zones.error) && (
          <Text role="caption" tone="warning" style={{ textAlign: "right" }}>
            تعذر تحميل بعض المسميات المرجعية؛ المعرفات المعروضة تبقى من البيانات السيادية نفسها.
          </Text>
        )}
      </Card>

      <ProviderActivationWorkspace
        providerKind="field"
        initialActorId={agent.actorId}
        entrySource="hr"
      />
    </ScrollScreen>
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
      <ScrollScreen>
        <WorkforceErrorState
          message={controller.state.message}
          isSessionExpired={controller.state.isSessionExpired}
          onRetry={() => void controller.reload()}
        />
        <Box style={{ alignItems: "center", marginTop: spacing[2] }}>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
      </ScrollScreen>
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
    ["رقم مقدم الخدمة", captain.workforceCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[captain.workforceKind]],
    ["الهاتف", captain.phoneMasked ?? "—"],
    ["منطقة الخدمة السيادية", zones.zoneLabel(profile?.serviceZoneId)],
    ["مدينة التشغيل المشتقة", reference.cityLabel(profile?.operatingCityCode)],
    ["نوع المركبة", profile?.vehicleType || "—"],
    ["رقم المركبة", profile?.vehicleIdentifier || "—"],
    ["حالة الرخصة", LICENSE_STATUS_LABEL_AR[profile?.licenseStatus ?? "missing"]],
    ["تاريخ انتهاء الرخصة", profile?.licenseExpiresAt || "—"],
    ["المشرف", profile?.supervisorActorId || "—"],
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
          mimeType: file.type || "application/octet-stream",
        });
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
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>ملف مقدم الخدمة</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        {rows.map(([label, value]) => (
          <Box key={label} style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
            <Text role="bodySm" tone="muted">{label}</Text>
            <Text role="bodyStrong">{value}</Text>
          </Box>
        ))}
        {(reference.error || zones.error) && (
          <Text role="caption" tone="warning" style={{ textAlign: "right" }}>
            تعذر تحميل بعض المسميات المرجعية؛ المعرفات المعروضة تبقى من البيانات السيادية نفسها.
          </Text>
        )}
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>الوثائق المرفوعة</Text>
        {uploadError && <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{uploadError}</Text>}
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          {documentCount > 0 ? `${documentCount} ملف مرفوع` : "لا توجد ملفات مرفوعة بعد"}
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button label="رفع وثيقة" tone="secondary" loading={uploadBusy} disabled={isBusy} onPress={() => void pickAndUpload()} />
        </Box>
      </Card>

      {profile?.licenseStatus !== "valid" && (
        <Card style={{ padding: spacing[4], gap: spacing[2] }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>مراجعة رخصة القيادة والعمل</Text>
          <Text role="bodySm" style={{ textAlign: "right" }}>
            الحالة الحالية: {LICENSE_STATUS_LABEL_AR[profile?.licenseStatus ?? "missing"]}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            اعتماد الرخصة لا يتاح إلا بعد وجود وثيقة وتاريخ انتهاء صالح. قاعدة Workforce تفرض الشرط نفسه حتى عند استدعاء API مباشرة.
          </Text>

          {!canApproveLicence && (
            <Box style={{ gap: spacing[1] }}>
              {licenceApprovalBlockers.map((reason) => (
                <Text key={reason} role="caption" tone="warning" style={{ textAlign: "right" }}>• {reason}</Text>
              ))}
            </Box>
          )}

          {controller.actionError && (
            <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{controller.actionError}</Text>
          )}

          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[1], flexWrap: "wrap" }}>
            <Button
              label="اعتماد الرخصة (صالحة)"
              tone="primary"
              loading={controller.actionBusy}
              disabled={isBusy || !canApproveLicence}
              onPress={() => void handleUpdateLicense("valid")}
            />
            <Button
              label="رفض الرخصة"
              tone="danger"
              loading={controller.actionBusy}
              disabled={isBusy}
              onPress={() => void handleUpdateLicense("rejected")}
            />
            <Button
              label="طلب استكمال"
              tone="secondary"
              loading={controller.actionBusy}
              disabled={isBusy}
              onPress={() => void handleUpdateLicense("missing")}
            />
          </Box>
        </Card>
      )}

      <ProviderActivationWorkspace
        providerKind="captain"
        initialActorId={captain.actorId}
        entrySource="hr"
      />
    </ScrollScreen>
  );
}

function LoadingScreen() {
  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4] }}>
        <Text role="bodySm" tone="muted" align="center">جارٍ تحميل الملف…</Text>
      </Card>
    </ScrollScreen>
  );
}

export default ProviderDetailView;
