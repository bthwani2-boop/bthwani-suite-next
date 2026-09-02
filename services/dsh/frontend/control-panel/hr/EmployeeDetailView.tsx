"use client";

import React, { useEffect, useState } from "react";
import { CpDescriptionList, CpDescriptionRow, CpPageHeader, CpMutedInline, CpStateView, CpTextInput, CpTabs } from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import { Button, Text } from "@bthwani/ui-kit";

import { ENGAGEMENT_STATUS_LABEL_AR, appendProviderDocument, getEmployeeGovernance, putEmployeeGovernance, uploadEmployeeMedia, useEmployeeDetailController, type EmployeeEmploymentClass, type EmployeeGovernanceProfile, type EmployeeGuaranteeStatus, type EmployeeGuaranteeType, type SupervisorCandidate } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";
import { SupervisorPicker } from "./SupervisorPicker";

const selectStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--bthwani-control-panel-border)",
  background: "var(--bthwani-control-panel-surface)",
  color: "var(--bthwani-control-panel-text)" };

function splitScopes(value: string): string[] {
  return [...new Set(value.split(/[،,\n]/).map((item) => item.trim()).filter(Boolean))];
}

export function EmployeeDetailView(props: { readonly actorId: string; readonly onBack: () => void; readonly canUpdate: boolean; readonly canSuspend: boolean; readonly canReactivate: boolean }) {
  const controller = useEmployeeDetailController(props.actorId);
  const employee = controller.state.kind === "ready" ? controller.state.employee : null;
  const profile = employee?.employeeProfile;

  const [activeTab, setActiveTab] = useState("profile");
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

  const [governance, setGovernance] = useState<EmployeeGovernanceProfile | null>(null);
  const [governanceBusy, setGovernanceBusy] = useState(false);
  const [governanceError, setGovernanceError] = useState<string | null>(null);
  const [positionTitle, setPositionTitle] = useState("");
  const [jobGrade, setJobGrade] = useState("");
  const [employmentClass, setEmploymentClass] = useState<EmployeeEmploymentClass>("staff");
  const [guaranteeType, setGuaranteeType] = useState<EmployeeGuaranteeType>("none");
  const [guaranteeStatus, setGuaranteeStatus] = useState<EmployeeGuaranteeStatus>("not_required");
  const [guaranteeReference, setGuaranteeReference] = useState("");
  const [responsibilityScopes, setResponsibilityScopes] = useState("");
  const [managedDepartmentCodes, setManagedDepartmentCodes] = useState("");
  const [governanceNotes, setGovernanceNotes] = useState("");

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
            active: true }
        : null,
    );
  }, [employee?.actorId, employee?.version]);

  useEffect(() => {
    if (!employee?.actorId) return;
    let cancelled = false;
    setGovernanceBusy(true);
    setGovernanceError(null);
    void getEmployeeGovernance(employee.actorId)
      .then((result) => {
        if (cancelled) return;
        setGovernance(result);
        setPositionTitle(result.positionTitle || employee.employeeProfile?.role || "");
        setJobGrade(result.jobGrade);
        setEmploymentClass(result.employmentClass);
        setGuaranteeType(result.guaranteeType);
        setGuaranteeStatus(result.guaranteeStatus);
        setGuaranteeReference(result.guaranteeReference ?? "");
        setResponsibilityScopes(result.responsibilityScopes.join("، "));
        setManagedDepartmentCodes(result.managedDepartmentCodes.join("، "));
        setGovernanceNotes(result.notes ?? "");
      })
      .catch((cause) => {
        if (!cancelled) setGovernanceError(cause instanceof Error ? cause.message : "تعذر تحميل نطاق مسؤولية الموظف");
      })
      .finally(() => {
        if (!cancelled) setGovernanceBusy(false);
      });
    return () => { cancelled = true; };
  }, [employee?.actorId]);

  const saveGovernance = async () => {
    if (!props.canUpdate || !employee || !positionTitle.trim()) return;
    setGovernanceBusy(true);
    setGovernanceError(null);
    try {
      const result = await putEmployeeGovernance(employee.actorId, {
        expectedVersion: governance?.version ?? 0,
        positionTitle: positionTitle.trim(),
        jobGrade: jobGrade.trim(),
        employmentClass,
        guaranteeType,
        guaranteeStatus,
        guaranteeReference: guaranteeReference.trim(),
        responsibilityScopes: splitScopes(responsibilityScopes),
        managedDepartmentCodes: splitScopes(managedDepartmentCodes),
        notes: governanceNotes.trim() });
      setGovernance(result);
    } catch (cause) {
      setGovernanceError(cause instanceof Error ? cause.message : "تعذر حفظ نطاق مسؤولية الموظف");
    } finally {
      setGovernanceBusy(false);
    }
  };

  if (controller.state.kind === "loading") {
    return (
      <DetailPageFrame stateView={<CpStateView kind="loading" title="جارٍ تحميل ملف الموظف…" />}>
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
            <Button variant="ghost" onClick={props.onBack}>رجوع</Button>
          </div>
        }
      >
        <div />
      </DetailPageFrame>
    );
  }

  const canSave =
    props.canUpdate &&
    fullNameAr.trim().length > 0 &&
    department.trim().length > 0 &&
    role.trim().length > 0 &&
    !controller.actionBusy;
  const canChangeStatus = reason.trim().length >= 5 && !controller.actionBusy && (employee.engagementStatus === "suspended" ? props.canReactivate : props.canSuspend);

  const pickFile = (purpose: "photo" | "document") => {
    if (!props.canUpdate) return;
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
          mimeType: file.type || "application/octet-stream" });
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
          <Button variant="ghost" onClick={props.onBack}>رجوع</Button>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!props.canUpdate && !props.canSuspend && !props.canReactivate ? <CpStateView kind="error" title="هذا الملف للقراءة فقط" /> : null}
        <CpTabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { label: "الملف الأساسي", value: "profile" },
            { label: "الوثائق والصور", value: "media" },
            { label: "التنظيم والحالة", value: "governance" },
          ]}
        />

        {activeTab === "profile" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div><Text role="bodySm">الاسم بالعربية *</Text><CpTextInput value={fullNameAr} onChange={setFullNameAr} disabled={!props.canUpdate} aria-label="الاسم بالعربية" /></div>
              <div><Text role="bodySm">الاسم بالإنجليزية</Text><CpTextInput value={fullNameEn} onChange={setFullNameEn} disabled={!props.canUpdate} aria-label="الاسم بالإنجليزية" /></div>
              <div><Text role="bodySm">الإدارة أو القسم *</Text><CpTextInput value={department} onChange={setDepartment} disabled={!props.canUpdate} aria-label="الإدارة أو القسم" /></div>
              <div><Text role="bodySm">المسمى الوظيفي المختصر *</Text><CpTextInput value={role} onChange={setRole} disabled={!props.canUpdate} aria-label="المسمى الوظيفي" /></div>
              <div><Text role="bodySm">موقع العمل</Text><CpTextInput value={officeLocation} onChange={setOfficeLocation} disabled={!props.canUpdate} aria-label="موقع العمل" /></div>
              <div><Text role="bodySm">تاريخ بداية العمل</Text><CpTextInput value={engagementStartDate} onChange={setEngagementStartDate} placeholder="YYYY-MM-DD" disabled={!props.canUpdate} aria-label="تاريخ بداية العمل" /></div>

              <Text role="bodySm" style={{ fontWeight: "bold" }}>المشرف والتسلسل الإداري</Text>
              <SupervisorPicker kind="employee" selected={supervisor} onSelect={setSupervisor} disabled={!props.canUpdate} />
              {controller.actionError ? <CpStateView kind="error" title={controller.actionError} /> : null}
              <Button
                variant="primary"
                disabled={!canSave}
                onClick={() => void controller.update({
                  expectedVersion: employee.version,
                  fullNameAr: fullNameAr.trim(),
                  ...(fullNameEn.trim() ? { fullNameEn: fullNameEn.trim() } : {}),
                  department: department.trim(),
                  role: role.trim(),
                  ...(officeLocation.trim() ? { officeLocation: officeLocation.trim() } : {}),
                  ...(engagementStartDate.trim() ? { engagementStartDate: engagementStartDate.trim() } : {}),
                  ...(supervisor?.actorId ? { supervisorActorId: supervisor.actorId } : {}) })}
              >
                {controller.actionBusy ? "جارٍ الحفظ…" : "حفظ البيانات الأساسية"}
              </Button>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Text role="titleSm">ملخص الملف</Text>
              <CpDescriptionList>
                <CpDescriptionRow label="الهاتف">{employee.phoneMasked ?? "—"}</CpDescriptionRow>
                <CpDescriptionRow label="القسم">{profile?.department ?? "—"}</CpDescriptionRow>
                <CpDescriptionRow label="الدور">{profile?.role ?? "—"}</CpDescriptionRow>
                <CpDescriptionRow label="الموقع">{profile?.officeLocation ?? "—"}</CpDescriptionRow>
                <CpDescriptionRow label="الفئة الإدارية">{governance?.employmentClass ?? "—"}</CpDescriptionRow>
                <CpDescriptionRow label="حالة الضمانة">{governance?.guaranteeStatus ?? "—"}</CpDescriptionRow>
              </CpDescriptionList>
            </div>
          </>
        )}

        {activeTab === "governance" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: 16, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 12 }}>
              <Text role="titleSm">المنصب والضمانة ونطاق المسؤولية</Text>
              <CpMutedInline>هذه بيانات تنظيمية فقط. الأدوار والصلاحيات التنفيذية تُدار حصريًا بواسطة Identity ولا يمكن تحريرها من ملف Workforce.</CpMutedInline>
              <div><Text role="bodySm">المسمى الرسمي *</Text><CpTextInput value={positionTitle} onChange={setPositionTitle} disabled={!props.canUpdate} aria-label="المسمى الرسمي" /></div>
              <div><Text role="bodySm">الدرجة الوظيفية</Text><CpTextInput value={jobGrade} onChange={setJobGrade} disabled={!props.canUpdate} aria-label="الدرجة الوظيفية" /></div>
              <select value={employmentClass} onChange={(event) => setEmploymentClass(event.target.value as EmployeeEmploymentClass)} disabled={!props.canUpdate} style={selectStyle} aria-label="الفئة الإدارية">
                <option value="staff">موظف</option><option value="coordinator">منسق</option><option value="department_manager">مدير قسم</option><option value="executive">إدارة تنفيذية</option><option value="project_manager">مدير المشروع</option>
              </select>
              <select value={guaranteeType} onChange={(event) => setGuaranteeType(event.target.value as EmployeeGuaranteeType)} disabled={!props.canUpdate} style={selectStyle} aria-label="نوع الضمانة">
                <option value="none">لا توجد ضمانة</option><option value="personal">ضمانة شخصية</option><option value="financial">ضمانة مالية</option><option value="institutional">ضمانة جهة</option>
              </select>
              <select value={guaranteeStatus} onChange={(event) => setGuaranteeStatus(event.target.value as EmployeeGuaranteeStatus)} disabled={!props.canUpdate} style={selectStyle} aria-label="حالة الضمانة">
                <option value="not_required">غير مطلوبة</option><option value="pending">قيد الاستكمال</option><option value="active">سارية</option><option value="released">مفرج عنها</option><option value="forfeited">مصادرة بقرار</option>
              </select>
              <div><Text role="bodySm">مرجع الضمانة</Text><CpTextInput value={guaranteeReference} onChange={setGuaranteeReference} disabled={!props.canUpdate} aria-label="مرجع الضمانة" /></div>
              <div><Text role="bodySm">نطاقات المسؤولية</Text><CpTextInput value={responsibilityScopes} onChange={setResponsibilityScopes} disabled={!props.canUpdate} placeholder="العمليات، الكباتن، جودة الخدمة" aria-label="نطاقات المسؤولية" /></div>
              <div><Text role="bodySm">رموز الأقسام المُدارة</Text><CpTextInput value={managedDepartmentCodes} onChange={setManagedDepartmentCodes} disabled={!props.canUpdate} placeholder="operations, partners" aria-label="الأقسام المدارة" /></div>
              <div><Text role="bodySm">ملاحظات القرار</Text><CpTextInput value={governanceNotes} onChange={setGovernanceNotes} disabled={!props.canUpdate} aria-label="ملاحظات القرار" /></div>
              {governanceError ? <CpStateView kind="error" title={governanceError} /> : null}
              <Button variant="primary" disabled={!props.canUpdate || governanceBusy || positionTitle.trim().length === 0} onClick={() => void saveGovernance()}>
                {governanceBusy ? "جارٍ الحفظ…" : "حفظ نطاق المسؤولية"}
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Text role="titleSm">إدارة الحالة الوظيفية</Text>
              <div><Text role="bodySm">سبب الإيقاف أو إعادة التفعيل *</Text><CpTextInput value={reason} onChange={setReason} disabled={employee.engagementStatus === "suspended" ? !props.canReactivate : !props.canSuspend} placeholder="اكتب سببًا تشغيليًا واضحًا" aria-label="سبب الإيقاف أو إعادة التفعيل" /></div>
              {employee.engagementStatus === "suspended" && props.canReactivate ? (
                <Button variant="primary" disabled={!canChangeStatus} onClick={() => void controller.reactivate(employee.version, reason.trim()).then((ok) => { if (ok) setReason(""); })}>{controller.actionBusy ? "جارٍ التنفيذ…" : "إعادة تفعيل الموظف"}</Button>
              ) : employee.engagementStatus !== "suspended" && props.canSuspend ? (
                <Button variant="danger" disabled={!canChangeStatus} onClick={() => void controller.suspend(employee.version, reason.trim()).then((ok) => { if (ok) setReason(""); })}>{controller.actionBusy ? "جارٍ التنفيذ…" : "تعليق الموظف"}</Button>
              ) : <CpMutedInline>لا تملك صلاحية تغيير الحالة الوظيفية.</CpMutedInline>}
            </div>
          </>
        )}

        {activeTab === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Text role="titleSm">الصورة والوثائق الوظيفية</Text>
            <Text role="bodySm">الصورة: {employee.photoMediaRef ? "مرتبطة" : "مفقودة"}</Text>
            <Text role="bodySm">الوثائق: {profile?.documentMediaRefs.length ?? 0}</Text>
            {uploadError ? <CpStateView kind="error" title={uploadError} /> : null}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button variant="secondary" disabled={uploadBusy || !props.canUpdate} onClick={() => pickFile("photo")}>{uploadBusy ? "جارٍ الرفع…" : "رفع صورة شخصية"}</Button>
              <Button variant="secondary" disabled={uploadBusy || !props.canUpdate} onClick={() => pickFile("document")}>{uploadBusy ? "جارٍ الرفع…" : "رفع وثيقة وظيفية"}</Button>
            </div>
          </div>
        )}
      </div>
    </DetailPageFrame>
  );
}

