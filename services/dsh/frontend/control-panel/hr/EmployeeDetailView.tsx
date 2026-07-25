"use client";

import React, { useEffect, useState } from "react";
import {
  CpButton,
  CpDescriptionList,
  CpDescriptionRow,
  CpPageHeader,
  CpMutedInline,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";

import {
  ENGAGEMENT_STATUS_LABEL_AR,
  appendProviderDocument,
  uploadEmployeeMedia,
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
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      <DetailPageFrame stateView={<CpStatePanel role="status" title="جارٍ تحميل ملف الموظف…" />}>
        <div />
      </DetailPageFrame>
    );
  }

  if (controller.state.kind === "error" || !employee) {
    const errorState = controller.state.kind === "error" ? controller.state : null;
    return (
      <DetailPageFrame
        stateView={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <WorkforceErrorState
              message={errorState?.message ?? "تعذر تحميل ملف الموظف"}
              isSessionExpired={errorState?.isSessionExpired ?? false}
              onRetry={() => void controller.reload()}
            />
            <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
          </div>
        }
      >
        <div />
      </DetailPageFrame>
    );
  }

  const canSave =
    fullNameAr.trim().length > 0 &&
    department.trim().length > 0 &&
    role.trim().length > 0 &&
    !controller.actionBusy;
  const canChangeStatus = reason.trim().length >= 5 && !controller.actionBusy;

  const pickFile = (purpose: "photo" | "document") => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = purpose === "photo" ? "image/*" : "image/*,application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadBusy(true);
      setUploadError(null);
      const objectUrl = URL.createObjectURL(file);
      try {
        const mediaRef = await uploadEmployeeMedia(employee.actorId, {
          uri: objectUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        if (purpose === "photo") {
          await controller.update({ expectedVersion: employee.version, photoMediaRef: mediaRef });
        } else {
          await appendProviderDocument("employee", employee.actorId, employee.version, mediaRef);
          await controller.reload();
        }
      } catch {
        setUploadError("تعذر رفع الملف وربطه بملف الموظف.");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setUploadBusy(false);
      }
    };
    input.click();
  };

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title="ملف الموظف الإداري">
          <CpMutedInline tight>{employee.workforceCode} · {ENGAGEMENT_STATUS_LABEL_AR[employee.engagementStatus]}</CpMutedInline>
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <Text role="bodySm">الاسم بالعربية *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم بالعربية" />
          </div>
          <div>
            <Text role="bodySm">الاسم بالإنجليزية</Text>
            <CpTextInput value={fullNameEn} onChange={setFullNameEn} aria-label="الاسم بالإنجليزية" />
          </div>
          <div>
            <Text role="bodySm">الإدارة أو القسم *</Text>
            <CpTextInput value={department} onChange={setDepartment} aria-label="الإدارة أو القسم" />
          </div>
          <div>
            <Text role="bodySm">المسمى الوظيفي *</Text>
            <CpTextInput value={role} onChange={setRole} aria-label="المسمى الوظيفي" />
          </div>
          <div>
            <Text role="bodySm">موقع العمل</Text>
            <CpTextInput value={officeLocation} onChange={setOfficeLocation} aria-label="موقع العمل" />
          </div>
          <div>
            <Text role="bodySm">تاريخ بداية العمل</Text>
            <CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" aria-label="تاريخ بداية العمل" />
          </div>

          <Text role="bodySm" style={{ fontWeight: "bold" }}>المشرف والتسلسل الإداري</Text>
          <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} />
          {controller.actionError ? <CpStatePanel role="alert" title={controller.actionError} /> : null}

          <CpButton
            variant="primary"
            disabled={!canSave}
            onClick={() =>
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
          >
            {controller.actionBusy ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </CpButton>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">الصورة والوثائق الوظيفية</Text>
          <Text role="bodySm">الصورة: {employee.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
          <Text role="bodySm">الوثائق: {profile?.documentMediaRefs.length ?? 0}</Text>
          {uploadError ? <CpStatePanel role="alert" title={uploadError} /> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("photo")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع صورة شخصية"}
            </CpButton>
            <CpButton variant="secondary" disabled={uploadBusy} onClick={() => pickFile("document")}>
              {uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة وظيفية"}
            </CpButton>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Text role="titleSm">إدارة الحالة الوظيفية</Text>
          <div>
            <Text role="bodySm">سبب الإيقاف أو إعادة التفعيل *</Text>
            <CpTextInput value={reason} onChange={setReason} placeholder="اكتب سببًا تشغيليًا واضحًا" aria-label="سبب الإيقاف أو إعادة التفعيل" />
          </div>
          {employee.engagementStatus === "suspended" ? (
            <CpButton
              variant="primary"
              disabled={!canChangeStatus}
              onClick={() => void controller.reactivate(employee.version, reason.trim()).then((ok) => { if (ok) setReason(""); })}
            >
              {controller.actionBusy ? "جارٍ التنفيذ…" : "إعادة تفعيل الموظف"}
            </CpButton>
          ) : (
            <CpButton
              variant="danger"
              disabled={!canChangeStatus}
              onClick={() => void controller.suspend(employee.version, reason.trim()).then((ok) => { if (ok) setReason(""); })}
            >
              {controller.actionBusy ? "جارٍ التنفيذ…" : "تعليق الموظف"}
            </CpButton>
          )}
        </div>

        <div>
          <Text role="titleSm">ملخص الملف</Text>
          <CpDescriptionList>
            <CpDescriptionRow label="الهاتف">{employee.phoneMasked ?? "—"}</CpDescriptionRow>
            <CpDescriptionRow label="القسم">{profile?.department ?? "—"}</CpDescriptionRow>
            <CpDescriptionRow label="الدور">{profile?.role ?? "—"}</CpDescriptionRow>
            <CpDescriptionRow label="الموقع">{profile?.officeLocation ?? "—"}</CpDescriptionRow>
          </CpDescriptionList>
        </div>
      </div>
    </DetailPageFrame>
  );
}

export default EmployeeDetailView;
