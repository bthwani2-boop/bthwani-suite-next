"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Card, ScrollScreen, Text, spacing } from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  ENGAGEMENT_TYPE_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainDetailController,
  useFieldAgentDetailController,
  useWorkforceReferenceData,
} from "../../shared/workforce";
import type { ProviderKind } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { buildPartnersHref } from "../../shared/partner/partner-registry";
import { buildOperationsHref } from "../../shared/operations/operations-registry";
import { uploadProviderMedia } from "../../shared/media/field-document-media";

export function ProviderDetailView(props: { readonly actorId: string; readonly kind: ProviderKind; readonly onBack: () => void }) {
  if (props.kind === "captain") {
    return <CaptainDetailBody actorId={props.actorId} onBack={props.onBack} />;
  }
  return <FieldAgentDetailBody actorId={props.actorId} onBack={props.onBack} />;
}

function FieldAgentDetailBody(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const reference = useWorkforceReferenceData();
  const router = useRouter();

  if (controller.state.kind === "loading") {
    return <LoadingScreen />;
  }
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
    ["رقم مقدم الخدمة", agent.providerCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[agent.providerKind]],
    ["الهاتف", agent.phoneMasked ?? "—"],
    ["نوع الارتباط", ENGAGEMENT_TYPE_LABEL_AR[agent.engagementType]],
    ["تاريخ البداية", agent.engagementStartDate || "—"],
    ["نطاق الخدمة", reference.cityLabel(agent.fieldProfile?.cityCode)],
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
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>حالة الدخول</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>
          {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          إصدار كود التفعيل والإيقاف وإعادة التفعيل تتم من شاشة تفعيل الميداني.
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button
            label="الانتقال إلى إدارة التفعيل"
            tone="primary"
            onPress={() => router.push(buildPartnersHref("activation", { subGroup: "field_activation" }))}
          />
        </Box>
      </Card>
    </ScrollScreen>
  );
}

function CaptainDetailBody(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useCaptainDetailController(props.actorId);
  const reference = useWorkforceReferenceData();
  const router = useRouter();
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (controller.state.kind === "loading") {
    return <LoadingScreen />;
  }
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
  const rows: Array<[string, string]> = [
    ["الاسم", captain.fullNameAr],
    ["رقم مقدم الخدمة", captain.providerCode],
    ["النوع", PROVIDER_KIND_LABEL_AR[captain.providerKind]],
    ["الهاتف", captain.phoneMasked ?? "—"],
    ["نطاق الخدمة", reference.cityLabel(profile?.operatingCityCode)],
    ["نوع المركبة", profile?.vehicleType || "—"],
    ["رقم المركبة", profile?.vehicleIdentifier || "—"],
    ["حالة الرخصة", profile?.licenseStatus || "—"],
    ["تاريخ انتهاء الرخصة", profile?.licenseExpiresAt || "—"],
    ["المشرف", profile?.supervisorActorId || "—"],
    ["حالة الارتباط", ENGAGEMENT_STATUS_LABEL_AR[captain.engagementStatus]],
  ];

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
      try {
        const objectUrl = URL.createObjectURL(file);
        await uploadProviderMedia(props.actorId, "captain", {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        URL.revokeObjectURL(objectUrl);
        await controller.reload();
      } catch {
        setUploadError("تعذر رفع الملف — حاول مجددًا");
      } finally {
        setUploadBusy(false);
      }
    };
    input.click();
  };

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
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>الوثائق</Text>
        {uploadError && (
          <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{uploadError}</Text>
        )}
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          {(profile?.documentMediaRefs.length ?? 0) > 0
            ? `${profile?.documentMediaRefs.length} ملف مرفوع`
            : "لا توجد ملفات مرفوعة بعد"}
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button label="رفع وثيقة" tone="secondary" loading={uploadBusy} disabled={uploadBusy} onPress={() => void pickAndUpload()} />
        </Box>
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>حالة الدخول</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>
          {ENGAGEMENT_STATUS_LABEL_AR[captain.engagementStatus]}
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          إصدار كود التفعيل والإيقاف وإعادة التفعيل تتم من شاشة تفعيل الكباتن في العمليات.
        </Text>
        <Box style={{ alignItems: "flex-end" }}>
          <Button
            label="الانتقال إلى إدارة التفعيل"
            tone="primary"
            onPress={() => router.push(buildOperationsHref("dispatch-capacity", { subGroup: "captains" }))}
          />
        </Box>
      </Card>
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
