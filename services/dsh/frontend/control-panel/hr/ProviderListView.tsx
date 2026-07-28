"use client";

import React, { useMemo, useState } from "react";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
  CpSearchInput,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTabs,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainListController,
  useEmployeeListController,
  useFieldAgentListController,
  useWorkforceReferenceData,
} from "../../shared/workforce";
import type { EngagementStatus, FieldAgent, ProviderKind } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";

type TypeFilter = "all" | ProviderKind;

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "الكل", value: "" },
  { label: "بانتظار التفعيل", value: "pending_activation" },
  { label: "نشط", value: "active" },
  { label: "موقوف", value: "suspended" },
];

const TYPE_TABS: Array<{ label: string; value: TypeFilter }> = [
  { label: "الكل", value: "all" },
  { label: "ميداني", value: "field" },
  { label: "كابتن", value: "captain" },
  { label: "موظف إداري", value: "employee" },
];

function statusTone(status: EngagementStatus): CpBadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "pending_activation":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "neutral";
  }
}

export function ProviderListView(props: {
  readonly forcedKind?: ProviderKind;
  readonly onCreate: () => void;
  readonly onOpen: (actorId: string, kind: ProviderKind) => void;
  readonly onReference: () => void;
  readonly onActivation: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(props.forcedKind || "all");
  const fieldList = useFieldAgentListController();
  const captainList = useCaptainListController();
  const employeeList = useEmployeeListController();
  const reference = useWorkforceReferenceData();

  const status = fieldList.status;
  const setStatus = (value: EngagementStatus | undefined) => {
    fieldList.setStatus(value);
    captainList.setStatus(value);
    employeeList.setStatus(value);
  };
  const query = fieldList.query;
  const setQuery = (value: string) => {
    fieldList.setQuery(value);
    captainList.setQuery(value);
    employeeList.setQuery(value);
  };

  const combined = useMemo(() => {
    const field: FieldAgent[] = fieldList.state.kind === "ready" ? [...fieldList.state.fieldAgents] : [];
    const captains: FieldAgent[] = captainList.state.kind === "ready" ? [...captainList.state.captains] : [];
    const employees: FieldAgent[] = employeeList.state.kind === "ready" ? [...employeeList.state.employees] : [];

    const activeFilter = props.forcedKind || typeFilter;

    const rows = activeFilter === "field"
      ? field
      : activeFilter === "captain"
        ? captains
        : activeFilter === "employee"
          ? employees
          : [...field, ...captains, ...employees];
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [fieldList.state, captainList.state, employeeList.state, typeFilter, props.forcedKind]);

  const loading = fieldList.state.kind === "loading" || captainList.state.kind === "loading" || employeeList.state.kind === "loading";
  const errorState = fieldList.state.kind === "error"
    ? fieldList.state
    : captainList.state.kind === "error"
      ? captainList.state
      : employeeList.state.kind === "error"
        ? employeeList.state
        : null;

  const counts = useMemo(() => {
    const rows = [
      ...(fieldList.state.kind === "ready" ? fieldList.state.fieldAgents : []),
      ...(captainList.state.kind === "ready" ? captainList.state.captains : []),
      ...(employeeList.state.kind === "ready" ? employeeList.state.employees : []),
    ];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.engagementStatus === "pending_activation").length,
      active: rows.filter((r) => r.engagementStatus === "active").length,
      suspended: rows.filter((r) => r.engagementStatus === "suspended").length,
    };
  }, [fieldList.state, captainList.state, employeeList.state]);

  const reload = () => {
    void fieldList.reload();
    void captainList.reload();
    void employeeList.reload();
  };

  const stateView = loading ? (
    <CpStateView kind="loading" title="جارٍ تحميل سجل Workforce…" />
  ) : errorState?.kind === "error" ? (
    <WorkforceErrorState message={errorState.message} isSessionExpired={errorState.isSessionExpired} onRetry={reload} />
  ) : combined.length === 0 ? (
    <CpStatePanel role="status" title="لا توجد نتائج مطابقة." />
  ) : undefined;
  const header = (
    <CpPageHeader title="سجل Workforce الموحد">
      <CpButton variant="primary" onClick={props.onCreate}>إضافة عضو</CpButton>
      <CpButton variant="secondary" onClick={props.onActivation}>تفعيل مقدمي الخدمة</CpButton>
      <CpButton variant="ghost" onClick={props.onReference}>المدن والورديات</CpButton>
    </CpPageHeader>
  );

  const filterBar = (
    <CpFilterBar label="فلاتر Workforce">
      <CpSearchInput value={query} onChange={setQuery} placeholder="FLD-000123 أو CAP-000123 أو EMP-000123" aria-label="بحث بالاسم أو الرقم الوظيفي" wide />
      {!props.forcedKind && (
        <CpTabs aria-label="النوع" value={typeFilter} onChange={(value) => setTypeFilter(value as TypeFilter)} items={TYPE_TABS} />
      )}
      <CpTabs aria-label="الحالة" value={status ?? ""} onChange={(value) => setStatus(value === "" ? undefined : (value as EngagementStatus))} items={STATUS_TABS} />
    </CpFilterBar>
  );

  const toolbar = (
    <CpKpiStrip>
      <CpKpiCard label="إجمالي" value={counts.total} />
      <CpKpiCard label="بانتظار التفعيل" value={counts.pending} />
      <CpKpiCard label="نشط" value={counts.active} />
      <CpKpiCard label="موقوف" value={counts.suspended} />
    </CpKpiStrip>
  );

  return (
    <DataTablePageFrame
      header={props.forcedKind ? undefined : header}
      filters={filterBar}
      toolbar={props.forcedKind ? undefined : toolbar}
      stateView={stateView}
    >
      <CpTable aria-label={props.forcedKind ? `سجل ${props.forcedKind}` : "سجل Workforce"}>
        <thead>
          <tr>
            <CpTableHeaderCell>الاسم</CpTableHeaderCell>
            <CpTableHeaderCell>الرقم الوظيفي</CpTableHeaderCell>
            <CpTableHeaderCell>النوع</CpTableHeaderCell>
            <CpTableHeaderCell>القسم / المدينة</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {combined.map((member) => (
            <tr key={member.actorId}>
              <CpTableCell>{member.fullNameAr}</CpTableCell>
              <CpTableCell>{member.workforceCode}</CpTableCell>
              <CpTableCell>{PROVIDER_KIND_LABEL_AR[member.workforceKind]}</CpTableCell>
              <CpTableCell>
                {member.workforceKind === "employee"
                  ? member.employeeProfile?.department || "بدون قسم"
                  : reference.cityLabel(member.fieldProfile?.cityCode ?? member.captainProfile?.operatingCityCode)}
              </CpTableCell>
              <CpTableCell>
                <CpBadge tone={statusTone(member.engagementStatus)}>{ENGAGEMENT_STATUS_LABEL_AR[member.engagementStatus]}</CpBadge>
              </CpTableCell>
              <CpTableCell>
                <CpButton variant="secondary" onClick={() => props.onOpen(member.actorId, member.workforceKind)}>فتح</CpButton>
              </CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
      {!loading && !errorState ? <CpMutedInline tight>{combined.length} سجل</CpMutedInline> : null}
    </DataTablePageFrame>
  );
}

export default ProviderListView;
