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
  getSovereignLeadershipReferenceData,
  listSovereignLeadership,
  workforceErrorMessage,
  type EmployeePermissionBundleDescriptor,
  type LeadershipEmploymentClass,
  type SovereignLeadershipCreationResult,
  type SovereignLeadershipRecord,
  type SovereignLeadershipReferenceData,
} from "../../shared/workforce";

const selectStyle = {
  width: "100%",
  minHeight: "42px",
  borderRadius: "8px",
  border: "1px solid var(--bthwani-control-panel-border)",
  background: "var(--bthwani-control-panel-surface)",
  color: "var(--bthwani-control-panel-text)",
  padding: "0 12px",
} as const;

const fieldLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
} as const;

function assignmentDateError(startsOn: string, endsOn: string): string | null {
  const start = startsOn.trim();
  const end = endsOn.trim();
  if (!start || !end) return null;
  return end < start ? "تاريخ نهاية التكليف يجب أن يساوي تاريخ البداية أو يأتي بعده" : null;
}

function bundleForCode(
  references: SovereignLeadershipReferenceData | null,
  code: string,
): EmployeePermissionBundleDescriptor | undefined {
  return references?.permissionBundles.find((bundle) => bundle.code === code);
}

export function SovereignLeadershipPanel() {
  const [records, setRecords] = useState<readonly SovereignLeadershipRecord[]>([]);
  const [references, setReferences] = useState<SovereignLeadershipReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<SovereignLeadershipCreationResult | null>(null);

  const [fullNameAr, setFullNameAr] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [department, setDepartment] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [jobGrade, setJobGrade] = useState("");
  const [employmentClass, setEmploymentClass] = useState<LeadershipEmploymentClass | "">("");
  const [permissionBundle, setPermissionBundle] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [assignmentStartsOn, setAssignmentStartsOn] = useState("");
  const [assignmentEndsOn, setAssignmentEndsOn] = useState("");
  const [notes, setNotes] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const copyActivationCode = async (code: string) => {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [leadership, referenceData] = await Promise.all([
        listSovereignLeadership(),
        getSovereignLeadershipReferenceData(),
      ]);
      setRecords(leadership);
      setReferences(referenceData);
    } catch (error) {
      setLoadError(workforceErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const availableBundles = useMemo(
    () => references?.permissionBundles.filter((bundle) =>
      employmentClass !== "" && bundle.allowedEmploymentClasses.includes(employmentClass),
    ) ?? [],
    [employmentClass, references],
  );

  const selectedBundle = useMemo(
    () => bundleForCode(references, permissionBundle),
    [permissionBundle, references],
  );

  useEffect(() => {
    if (!employmentClass) {
      setPermissionBundle("");
      return;
    }
    if (!availableBundles.some((bundle) => bundle.code === permissionBundle)) {
      setPermissionBundle(availableBundles.length === 1 ? availableBundles[0]!.code : "");
    }
  }, [availableBundles, employmentClass, permissionBundle]);

  useEffect(() => {
    if (selectedBundle?.defaultDepartmentScope && !selectedBundle.departmentSelectionAllowed) {
      setDepartment(selectedBundle.defaultDepartmentScope);
    }
  }, [selectedBundle]);

  const dateError = useMemo(
    () => assignmentDateError(assignmentStartsOn, assignmentEndsOn),
    [assignmentEndsOn, assignmentStartsOn],
  );

  const canSubmit = useMemo(
    () =>
      fullNameAr.trim().length > 0 &&
      phoneE164.trim().length >= 9 &&
      positionTitle.trim().length > 0 &&
      employmentClass !== "" &&
      permissionBundle.trim().length > 0 &&
      department.trim().length > 1 &&
      dateError === null &&
      !submitting,
    [dateError, department, employmentClass, fullNameAr, permissionBundle, phoneE164, positionTitle, submitting],
  );

  const submit = async () => {
    const currentDateError = assignmentDateError(assignmentStartsOn, assignmentEndsOn);
    if (currentDateError) {
      setSubmitError(currentDateError);
      return;
    }
    if (!canSubmit || employmentClass === "") return;
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
      setDepartment("");
      setPositionTitle("");
      setJobGrade("");
      setEmploymentClass("");
      setPermissionBundle("");
      setOfficeLocation("");
      setAssignmentStartsOn("");
      setAssignmentEndsOn("");
      setNotes("");
      setCodeCopied(false);
      await reload();
    } catch (error) {
      setSubmitError(workforceErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const bundleLabel = (code: string) =>
    references?.permissionBundles.find((bundle) => bundle.code === code)?.nameAr ?? code;
  const departmentLabel = (code: string) =>
    references?.departments.find((item) => item.code === code)?.nameAr ?? code;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <CpStatePanel
        role="status"
        title="القيادة والكادر السيادي"
        description="يحفظ Workforce التكليف والهيكل الإداري، بينما يملك Identity حزم الصلاحيات الفعلية والجلسات. تأتي جميع الخيارات من السجلات الحاكمة ولا تُعرّف داخل الشاشة."
        code="IDENTITY_WORKFORCE_BOUNDARY_ENFORCED"
      />

      <section style={{ padding: "20px", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Text role="titleMd">إضافة موظف قيادي</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px" }}>
          <CpTextInput value={fullNameAr} onChange={setFullNameAr} aria-label="الاسم الكامل بالعربية" placeholder="الاسم الكامل بالعربية" />
          <CpTextInput value={phoneE164} onChange={setPhoneE164} aria-label="رقم الهاتف" placeholder="+967777123456" />

          <label style={fieldLabelStyle}>
            <span>الفئة الإدارية</span>
            <select value={employmentClass} onChange={(event) => setEmploymentClass(event.target.value as LeadershipEmploymentClass | "")} style={selectStyle} disabled={!references}>
              <option value="">اختر الفئة...</option>
              {references?.employmentClasses.map((item) => <option key={item.code} value={item.code}>{item.nameAr}</option>)}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            <span>حزمة الصلاحيات</span>
            <select value={permissionBundle} onChange={(event) => setPermissionBundle(event.target.value)} style={selectStyle} disabled={!employmentClass || availableBundles.length <= 1}>
              <option value="">اختر الحزمة...</option>
              {availableBundles.map((bundle) => <option key={bundle.code} value={bundle.code}>{bundle.nameAr}</option>)}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            <span>القسم</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)} style={selectStyle} disabled={!references || Boolean(selectedBundle && !selectedBundle.departmentSelectionAllowed)}>
              <option value="">اختر القسم...</option>
              {references?.departments.map((item) => <option key={item.code} value={item.code}>{item.nameAr}</option>)}
            </select>
          </label>

          <CpTextInput value={positionTitle} onChange={setPositionTitle} aria-label="المسمى الوظيفي الرسمي" placeholder="المسمى الوظيفي الرسمي" />
          <CpTextInput value={jobGrade} onChange={setJobGrade} aria-label="الدرجة الوظيفية" placeholder="الدرجة الوظيفية (اختيارية)" />

          <label style={fieldLabelStyle}>
            <span>موقع العمل</span>
            <select value={officeLocation} onChange={(event) => setOfficeLocation(event.target.value)} style={selectStyle} disabled={!references}>
              <option value="">موقع العمل (اختياري)</option>
              {references?.officeLocations.map((location) => <option key={location.code} value={location.nameAr}>{location.nameAr}</option>)}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            <span>بداية التكليف</span>
            <CpTextInput value={assignmentStartsOn} onChange={setAssignmentStartsOn} type="date" aria-label="بداية التكليف" placeholder="YYYY-MM-DD" />
          </label>
          <label style={fieldLabelStyle}>
            <span>نهاية التكليف (اختيارية)</span>
            <CpTextInput value={assignmentEndsOn} onChange={setAssignmentEndsOn} type="date" aria-label="نهاية التكليف" placeholder="YYYY-MM-DD" />
          </label>
        </div>
        <CpTextInput value={notes} onChange={setNotes} aria-label="ملاحظات التكليف" placeholder="ملاحظات أو مرجع قرار التكليف" />
        {dateError ? <CpStatePanel role="alert" title="تواريخ التكليف غير صالحة" description={dateError} /> : null}
        {submitError ? <CpStatePanel role="alert" title="تعذر إنشاء التكليف القيادي" description={submitError} /> : null}
        {created ? (
          <CpStatePanel
            role="status"
            title={`تم إنشاء ${created.leadership.employee.fullNameAr}`}
            code={`actor=${created.leadership.employee.actorId}`}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <span>كود تفعيل لوحة التحكم: <strong>{created.activation.code}</strong> — ينتهي في {created.activation.expiresAt}</span>
              <CpButton variant="secondary" aria-label="نسخ كود التفعيل" onClick={() => void copyActivationCode(created.activation.code)}>
                {codeCopied ? "تم النسخ" : "نسخ الكود"}
              </CpButton>
            </div>
          </CpStatePanel>
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
                  <CpTableCell>{departmentLabel(record.assignment.departmentScope)}</CpTableCell>
                  <CpTableCell>{bundleLabel(record.assignment.permissionBundle)}</CpTableCell>
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
