"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  useEmployeeDetailController,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";

export function EmployeeDetailView(props: { readonly actorId: string; readonly onBack: () => void }) {
  const controller = useEmployeeDetailController(props.actorId);
  const employee = controller.state.kind === "ready" ? controller.state.employee : null;
  const profile = employee?.employeeProfile;

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!employee) return;
    setFullNameAr(employee.fullNameAr);
    setFullNameEn(employee.fullNameEn ?? "");
    setDepartment(employee.employeeProfile?.department ?? "");
    setRole(employee.employeeProfile?.role ?? "");
    setOfficeLocation(employee.employeeProfile?.officeLocation ?? "");
    setEngagementStartDate(employee.engagementStartDate ?? "");
    setSupervisor(
      employee.employeeProfile?.supervisorActorId
        ? {
            actorId: employee.employeeProfile.supervisorActorId,
            username: employee.employeeProfile.supervisorActorId,
            active: true,
          }
        : null,
    );
  }, [employee?.actorId, employee?.version]);

  if (controller.state.kind === "loading") {
    return (
      <ScrollScreen>
        <Card style={{ padding: spacing[4] }}>
          <Text role="bodySm" tone="muted" align="center">جارٍ تحميل ملف الموظف…</Text>
        </Card>
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "error" || !employee) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <ScrollScreen>
        <WorkforceErrorState
          message={errorState?.message ?? "تعذر تحميل ملف الموظف"}
          isSessionExpired={errorState?.isSessionExpired ?? false}
          onRetry={() => void controller.reload()}
        />
        <Button label="رجوع" tone="ghost" onPress={props.onBack} />
      </ScrollScreen>
    );
  }

  const canSave = fullNameAr.trim() && department.trim() && role.trim() && !controller.actionBusy;
  const canChangeStatus = reason.trim().length >= 5 && !controller.actionBusy;

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Box style={{ alignItems: "flex-end", gap: spacing[1] }}>
            <Text role="titleSm">ملف الموظف الإداري</Text>
            <Text role="caption" tone="muted">{employee.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[employee.engagementStatus]}</Text>
          </Box>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>

        <TextField label="الاسم بالعربية *" value={fullNameAr} onChangeText={setFullNameAr} />
        <TextField label="الاسم بالإنجليزية" value={fullNameEn} onChangeText={setFullNameEn} />
        <TextField label="الإدارة أو القسم *" value={department} onChangeText={setDepartment} />
        <TextField label="المسمى الوظيفي *" value={role} onChangeText={setRole} />
        <TextField label="موقع العمل" value={officeLocation} onChangeText={setOfficeLocation} />
        <TextField label="تاريخ بداية العمل" value={engagementStartDate} onChangeText={setEngagementStartDate} placeholder="YYYY-MM-DD" />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المشرف والتسلسل الإداري</Text>
        <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} />

        {controller.actionError ? (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{controller.actionError}</Text>
        ) : null}

        <Button
          label="حفظ التعديلات"
          tone="primary"
          disabled={!canSave}
          loading={controller.actionBusy}
          onPress={() =>
            void controller.update({
              expectedVersion: employee.version,
              fullNameAr: fullNameAr.trim(),
              fullNameEn: fullNameEn.trim() || undefined,
              department: department.trim(),
              role: role.trim(),
              officeLocation: officeLocation.trim() || undefined,
              engagementStartDate: engagementStartDate.trim() || undefined,
              supervisorActorId: supervisor?.actorId,
            })
          }
        />
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right" }}>إدارة الحالة الوظيفية</Text>
        <TextField
          label="سبب الإيقاف أو إعادة التفعيل *"
          value={reason}
          onChangeText={setReason}
          placeholder="اكتب سببًا تشغيليًا واضحًا"
        />
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {employee.engagementStatus === "suspended" ? (
            <Button
              label="إعادة تفعيل الموظف"
              tone="primary"
              disabled={!canChangeStatus}
              loading={controller.actionBusy}
              onPress={() =>
                void controller.reactivate(employee.version, reason.trim()).then((ok) => {
                  if (ok) setReason("");
                })
              }
            />
          ) : (
            <Button
              label="تعليق الموظف"
              tone="danger"
              disabled={!canChangeStatus}
              loading={controller.actionBusy}
              onPress={() =>
                void controller.suspend(employee.version, reason.trim()).then((ok) => {
                  if (ok) setReason("");
                })
              }
            />
          )}
        </Box>
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="titleSm" style={{ textAlign: "right" }}>ملخص الملف</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الهاتف: {employee.phoneMasked ?? "—"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>القسم: {profile?.department ?? "—"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الدور: {profile?.role ?? "—"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الموقع: {profile?.officeLocation ?? "—"}</Text>
        <Text role="bodySm" style={{ textAlign: "right" }}>الوثائق: {profile?.documentMediaRefs.length ?? 0}</Text>
      </Card>
    </ScrollScreen>
  );
}

export default EmployeeDetailView;
