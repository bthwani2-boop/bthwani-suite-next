"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  useEmployeeCreateController,
  type Employee,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";

export function EmployeeCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (employee: Employee) => void;
  readonly inline?: boolean;
}) {
  const controller = useEmployeeCreateController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const created = controller.state.kind === "created" ? controller.state.employee : null;
  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    department.trim().length > 0 &&
    role.trim().length > 0 &&
    controller.state.kind !== "submitting" &&
    !created;

  const reset = () => {
    controller.reset();
    setFullNameAr("");
    setFullNameEn("");
    setPhone("");
    setDepartment("");
    setRole("");
    setOfficeLocation("");
    setEngagementStartDate("");
    setSupervisor(null);
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        ينشئ Workforce الرقم الوظيفي تلقائيًا، بينما تحتفظ Identity برقم الهاتف والدور والجلسات.
      </CpMutedInline>

      {/* Basic Info Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>البيانات الأساسية</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={Boolean(created)} aria-label="الاسم الكامل بالعربية" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={Boolean(created)} aria-label="الاسم بالإنجليزية" />
          </div>
        </div>

        <div>
          <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف *</Text>
          <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(created)} aria-label="رقم الهاتف" />
        </div>
      </div>

      {/* Work Info Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>بيانات العمل والتوظيف</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الإدارة أو القسم *</Text>
            <CpTextInput value={department} onChange={setDepartment} placeholder="العمليات" disabled={Boolean(created)} aria-label="الإدارة أو القسم" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>المسمى الوظيفي *</Text>
            <CpTextInput value={role} onChange={setRole} placeholder="مشرف عمليات" disabled={Boolean(created)} aria-label="المسمى الوظيفي" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>موقع العمل</Text>
            <CpTextInput value={officeLocation} onChange={setOfficeLocation} placeholder="المقر الرئيسي" disabled={Boolean(created)} aria-label="موقع العمل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>تاريخ بداية العمل</Text>
            <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={Boolean(created)} aria-label="تاريخ بداية العمل" />
          </div>
        </div>
      </div>

      {/* Supervision Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>التسلسل الإداري والإشراف</Text>
        <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(created)} />
      </div>

      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الموظف الإداري" description={controller.state.message} />
      ) : null}

      {/* Action Bar */}
      {created ? (
        <CpStatePanel role="status" title={`تم إنشاء الموظف الإداري برقم ${created.workforceCode}.`}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(created)}>فتح الملف</CpButton>
            <CpButton variant="secondary" onClick={reset}>إضافة موظف آخر</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton
              variant="primary"
              disabled={!canSubmit}
              onClick={() =>
                void controller.submit({
                  fullNameAr: fullNameAr.trim(),
                  fullNameEn: fullNameEn.trim() || undefined,
                  phoneE164: phone.trim(),
                  engagementType: "employee",
                  engagementStartDate: engagementStartDate.trim() || undefined,
                  department: department.trim(),
                  role: role.trim(),
                  officeLocation: officeLocation.trim() || undefined,
                  supervisorActorId: supervisor?.actorId,
                })
              }
            >
              {controller.state.kind === "submitting" ? "جارٍ الإنشاء…" : "إنشاء الموظف الإداري"}
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
