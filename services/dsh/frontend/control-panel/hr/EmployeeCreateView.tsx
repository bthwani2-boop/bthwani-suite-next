"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";

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

  const content = (
    <Card style={{ padding: spacing[4], gap: spacing[3] }}>
      {!props.inline && (
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>إضافة موظف إداري</Text>
          {props.onBack ? <Button label="رجوع" tone="ghost" onPress={props.onBack} /> : null}
        </Box>
      )}

      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        ينشئ Workforce الرقم الوظيفي تلقائيًا، بينما تحتفظ Identity برقم الهاتف والدور والجلسات.
      </Text>

      <TextField label="الاسم الكامل بالعربية *" value={fullNameAr} onChangeText={setFullNameAr} disabled={Boolean(created)} />
      <TextField label="الاسم بالإنجليزية" value={fullNameEn} onChangeText={setFullNameEn} disabled={Boolean(created)} />
      <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" disabled={Boolean(created)} />
      <TextField label="الإدارة أو القسم *" value={department} onChangeText={setDepartment} placeholder="العمليات" disabled={Boolean(created)} />
      <TextField label="المسمى الوظيفي *" value={role} onChangeText={setRole} placeholder="مشرف عمليات" disabled={Boolean(created)} />
      <TextField label="موقع العمل" value={officeLocation} onChangeText={setOfficeLocation} placeholder="المقر الرئيسي" disabled={Boolean(created)} />
      <TextField label="تاريخ بداية العمل" value={engagementStartDate} onChangeText={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={Boolean(created)} />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التسلسل الإداري</Text>
      <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(created)} />

      {controller.state.kind === "error" ? (
        <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{controller.state.message}</Text>
      ) : null}

      {created ? (
        <Box style={{ gap: spacing[2] }}>
          <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>
            تم إنشاء الموظف الإداري برقم {created.workforceCode}.
          </Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            <Button label="فتح الملف" tone="primary" onPress={() => props.onCreated(created)} />
            <Button label="إضافة موظف آخر" tone="secondary" onPress={reset} />
          </Box>
        </Box>
      ) : (
        <Button
          label="إنشاء الموظف الإداري"
          tone="primary"
          disabled={!canSubmit}
          loading={controller.state.kind === "submitting"}
          onPress={() =>
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
        />
      )}
    </Card>
  );

  return props.inline ? content : <ScrollScreen>{content}</ScrollScreen>;
}

export default EmployeeCreateView;
