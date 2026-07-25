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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CpMutedInline>
        ينشئ Workforce الرقم الوظيفي تلقائيًا، بينما تحتفظ Identity برقم الهاتف والدور والجلسات.
      </CpMutedInline>

      <div>
        <Text role="bodySm">الاسم الكامل بالعربية *</Text>
        <CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={Boolean(created)} aria-label="الاسم الكامل بالعربية" />
      </div>
      <div>
        <Text role="bodySm">الاسم بالإنجليزية</Text>
        <CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={Boolean(created)} aria-label="الاسم بالإنجليزية" />
      </div>
      <div>
        <Text role="bodySm">رقم الهاتف *</Text>
        <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(created)} aria-label="رقم الهاتف" />
      </div>
      <div>
        <Text role="bodySm">الإدارة أو القسم *</Text>
        <CpTextInput value={department} onChange={setDepartment} placeholder="العمليات" disabled={Boolean(created)} aria-label="الإدارة أو القسم" />
      </div>
      <div>
        <Text role="bodySm">المسمى الوظيفي *</Text>
        <CpTextInput value={role} onChange={setRole} placeholder="مشرف عمليات" disabled={Boolean(created)} aria-label="المسمى الوظيفي" />
      </div>
      <div>
        <Text role="bodySm">موقع العمل</Text>
        <CpTextInput value={officeLocation} onChange={setOfficeLocation} placeholder="المقر الرئيسي" disabled={Boolean(created)} aria-label="موقع العمل" />
      </div>
      <div>
        <Text role="bodySm">تاريخ بداية العمل</Text>
        <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={Boolean(created)} aria-label="تاريخ بداية العمل" />
      </div>

      <Text role="bodySm" style={{ fontWeight: "bold" }}>التسلسل الإداري</Text>
      <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(created)} />

      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الموظف الإداري" description={controller.state.message} />
      ) : null}

      {created ? (
        <CpStatePanel role="status" title={`تم إنشاء الموظف الإداري برقم ${created.workforceCode}.`}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(created)}>فتح الملف</CpButton>
            <CpButton variant="secondary" onClick={reset}>إضافة موظف آخر</CpButton>
          </div>
        </CpStatePanel>
      ) : (
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
