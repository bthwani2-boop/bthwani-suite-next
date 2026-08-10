"use client";

import React, { useState } from "react";
import { useIdentityRuntimeStatus, useIdentitySession } from "@bthwani/core-identity";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  useEmployeeCreateController,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";

export function EmployeeCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (caseId: string) => void;
  readonly inline?: boolean;
}) {
  const controller = useEmployeeCreateController();
  const identityRuntime = useIdentityRuntimeStatus();
  const { state: identityState } = useIdentitySession();
  const operatorContextId = identityState.kind === "authenticated"
    ? identityState.identity.operatorContextId
    : "";
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
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const createdCaseId = controller.state.kind === "created" ? controller.state.caseId : null;
  const isProvisioning = controller.state.kind === "provisioning";

  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    username.trim().length > 0 &&
    phoneE164.trim().length > 0 &&
    department.trim().length > 0 &&
    role.trim().length > 0 &&
    !isProvisioning &&
    !createdCaseId;

  const reset = () => {
    controller.reset();
    setFullNameAr("");
    setFullNameEn("");
    setUsername("");
    setPhoneE164("");
    setDepartment("");
    setRole("");
    setOfficeLocation("");
    setEngagementStartDate("");
    setSupervisor(null);
  };

  const renderProgress = () => {
    if (controller.state.kind !== "provisioning") return null;
    const provisioningState = controller.state;
    return (
      <div style={{ padding: "16px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "8px", marginTop: "16px" }}>
        <Text role="titleSm" style={{ fontWeight: "700", marginBottom: "8px" }}>تقدم عملية الإنشاء الموحدة</Text>
        <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
          الحالة الحالية: {provisioningState.status}
        </Text>
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          {provisioningState.status === "FAILED_AT_WORKFORCE" && (
            <CpButton variant="secondary" onClick={() => controller.resume(provisioningState.caseId)}>محاولة استئناف العملية</CpButton>
          )}
        </div>
      </div>
    );
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        الإنشاء الموحد (Orchestrated Provisioning): يتم إنشاء الهوية الرقمية في Identity أولاً، وبنجاحها يتم إنشاء ملف Workforce وربطهما معاً بشكل موثوق.
      </CpMutedInline>

      {!identityReady ? (
        <CpStatePanel
          role="alert"
          title="Identity غير جاهزة؛ إنشاء الموظف الإداري متوقف"
          description={"السبب: " + identityReason}
        >
          <CpButton variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</CpButton>
        </CpStatePanel>
      ) : null}

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الهوية والبيانات الأساسية</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الاسم الكامل بالعربية" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الاسم بالإنجليزية" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم (Username) *</Text>
            <CpTextInput value={username} onChange={setUsername} placeholder="مثال: ahmed.ali" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Username" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف الأساسي *</Text>
            <CpTextInput value={phoneE164} onChange={setPhoneE164} placeholder="+966500000000" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="Phone" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>بيانات العمل والتوظيف</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الإدارة أو القسم *</Text>
            <CpTextInput value={department} onChange={setDepartment} placeholder="العمليات" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="الإدارة أو القسم" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>المسمى الوظيفي *</Text>
            <CpTextInput value={role} onChange={setRole} placeholder="مشرف عمليات" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="المسمى الوظيفي" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>موقع العمل</Text>
            <CpTextInput value={officeLocation} onChange={setOfficeLocation} placeholder="المقر الرئيسي" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="موقع العمل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>تاريخ بداية العمل</Text>
            <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={Boolean(createdCaseId) || isProvisioning} aria-label="تاريخ بداية العمل" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>التسلسل الإداري والإشراف</Text>
        <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdCaseId) || isProvisioning} />
      </div>

      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الموظف الإداري" description={controller.state.message} />
      ) : null}

      {renderProgress()}

      {createdCaseId ? (
        <CpStatePanel role="status" title="تم إنشاء الموظف الإداري بنجاح." description="جاهز للتفعيل">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdCaseId)}>متابعة</CpButton>
            <CpButton variant="secondary" onClick={reset}>إضافة موظف آخر</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton
              variant="primary"
              disabled={!canSubmit}
              onClick={() => {
                if (!identityReady) return;
                void controller.submit({
                  workforceKind: "employee",
                  username: username.trim(),
                  phoneE164: phoneE164.trim(),
                  role: "workforce_employee", // Assuming base role
                  operatorContextId,
                  payload: {
                    fullNameAr: fullNameAr.trim(),
                    department: department.trim(),
                    role: role.trim(),
                    ...(fullNameEn.trim() ? { fullNameEn: fullNameEn.trim() } : {}),
                    ...(officeLocation.trim() ? { officeLocation: officeLocation.trim() } : {}),
                    ...(engagementStartDate.trim() ? { engagementStartDate: engagementStartDate.trim() } : {}),
                    ...(supervisor ? { supervisorActorId: supervisor.actorId } : {}),
                  }
                });
              }}
            >
              {isProvisioning ? "جارٍ الإنشاء الموحد…" : "إنشاء الموظف الإداري"}
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
        <CpPageHeader title="إضافة موظف إداري">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default EmployeeCreateView;
