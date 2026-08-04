"use client";

import React, { useState } from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useFieldAgentCreateAndActivationController } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";

export function FieldAgentCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (caseId: string) => void;
  readonly inline?: boolean;
}) {
  const { state, submit, resume, reset } = useFieldAgentCreateAndActivationController();
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
  const [fullNameEn, setFullNameEn] = useState("");
  const [username, setUsername] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [supervisorActorId, setSupervisorActorId] = useState("");

  const createdCaseId = state.kind === "created" ? state.caseId : null;
  const isProvisioning = state.kind === "provisioning";

  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    username.trim().length > 0 &&
    phoneE164.trim().length > 0 &&
    !isProvisioning &&
    !createdCaseId;

  const handleSubmit = async () => {
    if (!identityReady) return;
    await submit({
      workforceKind: "field_agent",
      username: username.trim(),
      phoneE164: phoneE164.trim(),
      role: "workforce_field_agent",
      payload: {
        fullNameAr: fullNameAr.trim(),
        fullNameEn: fullNameEn.trim() || undefined,
        officeLocation: officeLocation.trim() || undefined,
        supervisorActorId: supervisorActorId || undefined,
        engagementType: "employee",
      }
    }, { issueActivationCode: false });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setFullNameEn("");
    setUsername("");
    setPhoneE164("");
    setOfficeLocation("");
    setSupervisorActorId("");
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
        الإنشاء الموحد للوكيل الميداني (Orchestrated Provisioning). يتم إنشاء الهوية الرقمية في Identity أولاً، وبنجاحها يتم إنشاء ملف Workforce وربطهما معاً بشكل موثوق. ولا يصدر كود الدخول قبل اكتمال المتطلبات.
      </CpMutedInline>

      {!identityReady ? (
        <CpStatePanel
          role="alert"
          title="Identity غير جاهزة؛ إنشاء الوكيل الميداني متوقف"
          description={السبب: .}
        >
          <CpButton variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</CpButton>
        </CpStatePanel>
      ) : null}

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الهوية والبيانات الأساسية</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="عبدالله فهد" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الاسم الكامل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الاسم بالإنجليزية" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم (Username) *</Text>
            <CpTextInput value={username} onChange={setUsername} placeholder="مثال: abdullah.fahad" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Username" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف الأساسي *</Text>
            <CpTextInput value={phoneE164} onChange={setPhoneE164} placeholder="+966500000000" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Phone" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>موقع العمل</Text>
        <div>
          <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الموقع الأساسي</Text>
          <CpTextInput value={officeLocation} onChange={setOfficeLocation} placeholder="مركز الدعم الشرقي" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="موقع العمل" />
        </div>
      </div>

      {state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الوكيل الميداني" description={state.message} />
      ) : null}

      {renderProgress()}

      {createdCaseId ? (
        <CpStatePanel role="status" title="تم إنشاء ملف الوكيل الميداني المبدئي" description="جاهز للإعداد.">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdCaseId)}>فتح الملف والمتابعة</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة وكيل آخر</CpButton>
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
              {isProvisioning ? "جارٍ الإنشاء…" : "إنشاء الوكيل الميداني"}
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
        <CpPageHeader title="إضافة وكيل ميداني">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default FieldAgentCreateView;
