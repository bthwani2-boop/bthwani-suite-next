"use client";

import { useState } from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Button, Text } from "@bthwani/ui-kit";

import { useEmployeeCreateController, type SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";

export function EmployeeCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (actorId: string) => void;
  readonly inline?: boolean;
}) {
  const controller = useEmployeeCreateController();
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
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const createdEmployee = controller.state.kind === "created" ? controller.state.employee : null;
  const isSubmitting = controller.state.kind === "submitting";
  const formLocked = Boolean(createdEmployee) || isSubmitting;

  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    username.trim().length > 0 &&
    phoneE164.trim().length > 0 &&
    department.trim().length > 0 &&
    role.trim().length > 0 &&
    !isSubmitting &&
    !createdEmployee;

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
          <Button variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</Button>
        </CpStatePanel>
      ) : null}

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الهوية والبيانات الأساسية</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={formLocked} aria-label="الاسم الكامل بالعربية" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={formLocked} aria-label="الاسم بالإنجليزية" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم (Username) *</Text>
            <CpTextInput value={username} onChange={setUsername} placeholder="مثال: ahmed.ali" disabled={formLocked} aria-label="Username" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف الأساسي *</Text>
            <CpTextInput value={phoneE164} onChange={setPhoneE164} placeholder="+966500000000" disabled={formLocked} aria-label="Phone" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>بيانات العمل والتوظيف</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الإدارة أو القسم *</Text>
            <CpTextInput value={department} onChange={setDepartment} placeholder="العمليات" disabled={formLocked} aria-label="الإدارة أو القسم" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>المسمى الوظيفي *</Text>
            <CpTextInput value={role} onChange={setRole} placeholder="مشرف عمليات" disabled={formLocked} aria-label="المسمى الوظيفي" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>موقع العمل</Text>
            <CpTextInput value={officeLocation} onChange={setOfficeLocation} placeholder="المقر الرئيسي" disabled={formLocked} aria-label="موقع العمل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>تاريخ بداية العمل</Text>
            <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={formLocked} aria-label="تاريخ بداية العمل" />
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>التسلسل الإداري والإشراف</Text>
        <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={formLocked} />
      </div>

      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الموظف الإداري" description={controller.state.message} />
      ) : null}

      {createdEmployee ? (
        <CpStatePanel role="status" title="تم إنشاء الموظف الإداري بنجاح." description="جاهز للتفعيل">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <Button variant="primary" onClick={() => props.onCreated(createdEmployee.actorId)}>متابعة</Button>
            <Button variant="secondary" onClick={reset}>إضافة موظف آخر</Button>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <Button
              variant="primary"
              disabled={!canSubmit}
              onClick={() => {
                if (!identityReady) return;
                void controller.submit({
                  fullNameAr: fullNameAr.trim(),
                  username: username.trim(),
                  phoneE164: phoneE164.trim(),
                  engagementType: "employee",
                  ...(engagementStartDate.trim() ? { engagementStartDate: engagementStartDate.trim() } : {}),
                  department: department.trim(),
                  role: role.trim(),
                  ...(fullNameEn.trim() ? { fullNameEn: fullNameEn.trim() } : {}),
                  ...(officeLocation.trim() ? { officeLocation: officeLocation.trim() } : {}),
                  ...(supervisor ? { supervisorActorId: supervisor.actorId } : {}) });
              }}
            >
              {isSubmitting ? "جارٍ الإنشاء…" : "إنشاء الموظف الإداري"}
            </Button>
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
          {props.onBack ? <Button variant="ghost" onClick={props.onBack}>رجوع</Button> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

