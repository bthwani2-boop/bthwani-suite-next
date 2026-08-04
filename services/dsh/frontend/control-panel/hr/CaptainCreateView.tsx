"use client";

import React, { useState } from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTabs, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useCaptainCreateAndActivationController } from "../../shared/workforce";
import { ZonePicker } from "./ZonePicker";

const VEHICLE_TYPES: Array<{ label: string; value: string }> = [
  { label: "دراجة نارية", value: "motorcycle" },
  { label: "سيارة", value: "car" },
  { label: "أخرى", value: "other" },
];

export function CaptainCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (caseId: string) => void;
  readonly inline?: boolean;
}) {
  const { state, submit, resume, reset } = useCaptainCreateAndActivationController();
  const identityRuntime = useIdentityRuntimeStatus();
  const runtimeValue = identityRuntime.state.kind === "resolved"
    ? identityRuntime.state.value
    : identityRuntime.state.kind === "checking"
      ? identityRuntime.state.previous
      : undefined;
  const identityReady = runtimeValue?.status === "HEALTHY";
  const identityReason = identityRuntime.state.kind === "unavailable"
    ? identityRuntime.state.code
    : (runtimeValue?.reasonCodes ?? ["IDENTITY_READINESS_UNPROVEN"]).join("، ");
  
  const [fullNameAr, setFullNameAr] = useState("");
  const [username, setUsername] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const createdCaseId = state.kind === "created" ? state.caseId : null;
  const isProvisioning = state.kind === "provisioning";

  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    username.trim().length > 0 &&
    phoneE164.trim().length > 0 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    !isProvisioning &&
    !createdCaseId;

  const handleSubmit = async () => {
    if (!identityReady) return;
    await submit({
      workforceKind: "captain",
      username: username.trim(),
      phoneE164: phoneE164.trim(),
      role: "workforce_captain",
      payload: {
        fullNameAr: fullNameAr.trim(),
        engagementType: "independent_contractor",
        vehicleType,
        licenseStatus: "missing",
        serviceZoneId: zoneId,
      }
    }, { issueActivationCode: false });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setUsername("");
    setPhoneE164("");
    setZoneId("");
    setVehicleType("");
  };

  const renderProgress = () => {
    if (state.kind !== "provisioning") return null;
    return (
      <div style={{ padding: "16px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "8px", marginTop: "16px" }}>
        <Text role="titleSm" style={{ fontWeight: "700", marginBottom: "8px" }}>تقدم عملية الإنشاء الموحدة</Text>
        <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
          الحالة الحالية: {state.status}
        </Text>
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          {state.status === "FAILED_AT_WORKFORCE" && (
            <CpButton variant="secondary" onClick={() => resume(state.caseId)}>محاولة استئناف العملية</CpButton>
          )}
        </div>
      </div>
    );
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        الإنشاء الموحد للكابتن. يتم إنشاء الهوية الرقمية في Identity أولاً، وبنجاحها يتم إنشاء ملف Workforce وربطهما معاً بشكل موثوق. ولا يصدر كود الدخول قبل اكتمال المتطلبات.
      </CpMutedInline>

      {!identityReady ? (
        <CpStatePanel
          role="alert"
          title="Identity غير جاهزة؛ إنشاء ملف الكابتن متوقف"
          description={identityReason}
        >
          <CpButton variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</CpButton>
        </CpStatePanel>
      ) : null}

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الهوية والبيانات الأساسية</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الاسم الكامل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم (Username) *</Text>
            <CpTextInput value={username} onChange={setUsername} placeholder="مثال: ahmed.ali" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Username" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف الأساسي *</Text>
            <CpTextInput value={phoneE164} onChange={setPhoneE164} placeholder="+966500000000" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Phone" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الخدمة والعمليات</Text>
        
        <div>
          <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>منطقة الخدمة الأساسية *</Text>
          <ZonePicker selected={zoneId} onSelect={setZoneId} disabled={Boolean(createdCaseId) || isProvisioning} />
        </div>

        <div style={{ marginTop: "8px" }}>
          <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>نوع المركبة الأساسي *</Text>
          <CpTabs
            value={vehicleType}
            onChange={setVehicleType}
            items={VEHICLE_TYPES}
            disabled={Boolean(createdCaseId) || isProvisioning}
          />
        </div>
      </div>

      {state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الكابتن" description={state.message} />
      ) : null}

      {renderProgress()}

      {createdCaseId ? (
        <CpStatePanel role="status" title="تم إنشاء ملف الكابتن المبدئي" description="يجب استكمال باقي البيانات لتفعيله.">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdCaseId)}>فتح الملف والمتابعة</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة كابتن آخر</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton
              variant="primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isProvisioning ? "جارٍ الإنشاء…" : "إنشاء الكابتن"}
            </CpButton>
          </div>
        </div>
      )}
    </div>
  );

  if (props.inline) return body;

  return (
    <EditorPageFrame
      header={
        <CpPageHeader title="إضافة كابتن (تسجيل أولي)">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default CaptainCreateView;
