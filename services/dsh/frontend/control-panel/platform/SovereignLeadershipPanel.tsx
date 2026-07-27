"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CpBadge,
  CpButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import {
  createSovereignLeader,
  listSovereignLeadership,
  workforceErrorMessage,
  type LeadershipEmploymentClass,
  type LeadershipPermissionBundle,
  type SovereignLeadershipCreationResult,
  type SovereignLeadershipRecord,
} from "../../shared/workforce";

const CLASS_LABELS: Record<LeadershipEmploymentClass, string> = {
  project_manager: "مدير المشروع",
  coordinator: "منسق المنصة",
  executive: "إدارة تنفيذية",
  department_manager: "مدير قسم",
};

const BUNDLE_LABELS: Record<LeadershipPermissionBundle, string> = {
  platform_owner: "مالك المنصة ومدير المشروع",
  platform_coordinator: "منسق المنصة",
  operations_manager: "مدير العمليات",
  partners_manager: "مدير الشركاء",
  finance_manager: "مدير المالية",
  support_manager: "مدير الدعم",
  hr_manager: "مدير الموارد البشرية",
};

const DEPARTMENTS = [
  { value: "dashboard", label: "الرئيسية (Dashboard)" },
  { value: "operations", label: "العمليات (Operations)" },
  { value: "analytics", label: "التحليلات (Analytics)" },
  { value: "partners", label: "الشركاء والمتاجر (Partners)" },
  { value: "catalogs", label: "اعتماد الكتالوجات (Catalogs)" },
  { value: "marketing", label: "التسويق والاكتشاف (Marketing)" },
  { value: "finance", label: "المالية والتسويات (Finance)" },
  { value: "support", label: "الدعم والمساعدة (Support)" },
  { value: "platform", label: "المنصة السيادية (Platform)" },
  { value: "administration", label: "الإدارة والصلاحيات (Administration)" },
  { value: "hr", label: "الموارد البشرية (HR)" },
];
const OFFICE_LOCATIONS = ["المقر الرئيسي", "صنعاء", "عدن", "تعز", "الحديدة", "حضرموت", "أخرى"];

const selectStyle = {
  width: "100%",
  minHeight: "42px",
  borderRadius: "8px",
  border: "1px solid var(--bthwani-control-panel-border)",
  background: "var(--bthwani-control-panel-surface)",
  color: "var(--bthwani-control-panel-text)",
  padding: "0 12px",
} as const;

function defaultBundleForClass(value: LeadershipEmploymentClass): LeadershipPermissionBundle {
  if (value === "project_manager") return "platform_owner";
  if (value === "coordinator" || value === "executive") return "platform_coordinator";
  return "operations_manager";
}

export function SovereignLeadershipPanel() {
  const [records, setRecords] = useState<readonly SovereignLeadershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<SovereignLeadershipCreationResult | null>(null);

  const [fullNameAr, setFullNameAr] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [department, setDepartment] = useState("operations");
  const [jobGrade, setJobGrade] = useState("");
  const [employmentClass, setEmploymentClass] = useState<LeadershipEmploymentClass>("department_manager");
  const [permissionBundle, setPermissionBundle] = useState<LeadershipPermissionBundle>("operations_manager");
  const [officeLocation, setOfficeLocation] = useState("");
  const [assignmentStartsOn, setAssignmentStartsOn] = useState("");
  const [assignmentEndsOn, setAssignmentEndsOn] = useState("");
  const [notes, setNotes] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRecords(await listSovereignLeadership());
    } catch (error) {
      setLoadError(workforceErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canSubmit = useMemo(
    () => fullNameAr.trim().length > 0 && phoneE164.trim().length >= 9 && department.trim().length > 1 && !submitting,
    [department, fullNameAr, phoneE164, submitting],
  );

  const positionTitle = useMemo(() => {
    if (employmentClass === "project_manager") return "مدير المشروع";
    if (employmentClass === "coordinator") return "منسق المنصة";
    if (employmentClass === "executive") return "إدارة تنفيذية";
    
    const dept = DEPARTMENTS.find(d => d.value === department);
    if (dept) return `مدير ${dept.label.split(" (")[0]}`;
    return "مدير قسم";
  }, [employmentClass, department]);

  const changeClass = (value: LeadershipEmploymentClass) => {
    setEmploymentClass(value);
    const bundle = defaultBundleForClass(value);
    setPermissionBundle(bundle);
    if (value === "project_manager") {
      setDepartment("platform");
    } else if (value === "coordinator" || value === "executive") {
      setDepartment("platform");
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setCreated(null);
    try {
      const trimmedJobGrade = jobGrade.trim();
      const trimmedOfficeLocation = officeLocation.trim();
      const trimmedStartsOn = assignmentStartsOn.trim();
      const trimmedEndsOn = assignmentEndsOn.trim();
      const trimmedNotes = notes.trim();
      const result = await createSovereignLeader({
        fullNameAr: fullNameAr.trim(),
        phoneE164: phoneE164.trim(),
        department: department.trim(),
        positionTitle: positionTitle.trim(),
        employmentClass,
        permissionBundle,
        guaranteeType: "none",
        guaranteeStatus: "not_required",
        responsibilityScopes: [department.trim()],
        ...(trimmedJobGrade ? { jobGrade: trimmedJobGrade } : {}),
        ...(trimmedOfficeLocation ? { officeLocation: trimmedOfficeLocation } : {}),
        ...(trimmedStartsOn ? { assignmentStartsOn: trimmedStartsOn } : {}),
        ...(trimmedEndsOn ? { assignmentEndsOn: trimmedEndsOn } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      setCreated(result);
      setFullNameAr("");
      setPhoneE164("");
      setJobGrade("");
      setOfficeLocation("");
      setAssignmentStartsOn("");
      setAssignmentEndsOn("");
      setNotes("");
      await reload();
    } catch (error) {
      setSubmitError(workforceErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <CpStatePanel
        role="status"
        title="القيادة والكادر السيادي"
        description="ينشئ مدير المشروع المنسقين ومديري الأقسام هنا. تحفظ Workforce التكليف الإداري، بينما تمنح Identity حزمة الصلاحيات الفعلية وتصدر دعوة تفعيل لوحة التحكم."
        code="SOVEREIGN_LEADERSHIP_BOUND"
      />

      <section style={{ padding: "20px", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Text role="titleMd">إضافة موظف قيادي</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px" }}>
          <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم الكامل بالعربية" placeholder="الاسم الكامل بالعربية" />
          <CpTextInput value={phoneE164} onChange={setPhoneE164} aria-label="رقم الهاتف" placeholder="777123456" />
          
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>الفئة الإدارية</span>
            <select value={employmentClass} onChange={(event) => changeClass(event.target.value as LeadershipEmploymentClass)} style={selectStyle}>
              {Object.entries(CLASS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>القسم</span>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} style={selectStyle} disabled={employmentClass !== "department_manager"}>
              <option value="">اختر القسم...</option>
              {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>حزمة الصلاحيات</span>
            <select value={permissionBundle} onChange={(event) => setPermissionBundle(event.target.value as LeadershipPermissionBundle)} style={selectStyle} disabled={employmentClass !== "department_manager"}>
              {Object.entries(BUNDLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>موقع العمل</span>
            <select value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} style={selectStyle}>
              <option value="">موقع العمل (اختياري)</option>
              {OFFICE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </label>
          
          <CpTextInput value={assignmentStartsOn} onChange={setAssignmentStartsOn} type="date" aria-label="بداية التكليف" placeholder="YYYY-MM-DD بداية التكليف" />
          <CpTextInput value={assignmentEndsOn} onChange={setAssignmentEndsOn} type="date" aria-label="نهاية التكليف" placeholder="YYYY-MM-DD نهاية اختيارية" />
        </div>
        <CpTextInput value={notes} onChange={setNotes} aria-label="ملاحظات التكليف" placeholder="ملاحظات أو مرجع قرار التكليف" />
        {submitError ? <CpStatePanel role="alert" title="تعذر إنشاء التكليف القيادي" description={submitError} /> : null}
        {created ? (
          <CpStatePanel
            role="status"
            title={`تم إنشاء ${created.leadership.employee.fullNameAr}`}
            description={`كود تفعيل لوحة التحكم: ${created.activation.code} — ينتهي في ${created.activation.expiresAt}`}
            code={`actor=${created.leadership.employee.actorId}`}
          />
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CpButton variant="primary" disabled={!canSubmit} onClick={() => void submit()}>
            {submitting ? "جارٍ الإنشاء والتفويض…" : "إنشاء الموظف القيادي وإصدار الدعوة"}
          </CpButton>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <Text role="titleMd">الكادر القيادي الحالي</Text>
          <CpButton variant="secondary" onClick={() => void reload()} disabled={loading}>تحديث</CpButton>
        </div>
        {loading ? <CpStatePanel role="status" title="جارٍ تحميل الكادر القيادي…" /> : null}
        {loadError ? <CpStatePanel role="alert" title="تعذر تحميل الكادر القيادي" description={loadError} /> : null}
        {!loading && !loadError && records.length === 0 ? <CpStatePanel role="status" title="لا توجد تكليفات قيادية فعالة بعد" /> : null}
        {!loading && !loadError && records.length > 0 ? (
          <CpTable aria-label="الكادر القيادي السيادي">
            <thead>
              <tr>
                <CpTableHeaderCell>الاسم</CpTableHeaderCell>
                <CpTableHeaderCell>المنصب</CpTableHeaderCell>
                <CpTableHeaderCell>القسم</CpTableHeaderCell>
                <CpTableHeaderCell>الحزمة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>مدة التكليف</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.employee.actorId}>
                  <CpTableCell>{record.employee.fullNameAr}</CpTableCell>
                  <CpTableCell>{record.governance.positionTitle}</CpTableCell>
                  <CpTableCell>{record.assignment.departmentScope}</CpTableCell>
                  <CpTableCell>{BUNDLE_LABELS[record.assignment.permissionBundle]}</CpTableCell>
                  <CpTableCell><CpBadge tone="success">{record.assignment.assignmentStatus}</CpBadge></CpTableCell>
                  <CpTableCell>{record.assignment.startsOn}{record.assignment.endsOn ? ` — ${record.assignment.endsOn}` : " — مفتوح"}</CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        ) : null}
      </section>
    </div>
  );
}

export default SovereignLeadershipPanel;
