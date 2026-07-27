"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTabs,
} from "@bthwani/control-panel/components";
import { OverviewPageFrame } from "@bthwani/control-panel/shell";
import {
  ADMIN_MAIN_TABS,
  ADMINISTRATION_TRUTH_NOTICE,
  administrationStatusLabel,
  useAdministrationRolesController,
  useStaffController,
  useAdminAuditController,
  type AdminMainTabId,
  type DshAdminState,
} from "../../shared/administration";

type CountableState = DshAdminState<readonly unknown[]>;

function count(state: CountableState): number {
  return state.kind === "success" ? state.data.length : 0;
}

function statePanel(state: CountableState, loadingTitle: string) {
  if (state.kind === "loading") return <CpStatePanel role="status" title={loadingTitle} />;
  if (state.kind === "error") return <CpStateView kind="error" title={state.message} />;
  return null;
}

function statusTone(status: string): CpBadgeTone {
  switch (status) {
    case "active":
    case "approved":
    case "partner_active":
    case "ops_approved":
      return "success";
    case "pending":
    case "submitted":
      return "warning";
    case "rejected":
    case "suspended":
    case "blocked":
      return "danger";
    default:
      return "neutral";
  }
}

const MAIN_TAB_ITEMS = ADMIN_MAIN_TABS.map((tab) => ({ value: tab.id, label: tab.label }));

export function AdministrationDashboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminMainTabId>("overview");
  const roles = useAdministrationRolesController("authenticated");
  const staff = useStaffController("authenticated");
  const audit = useAdminAuditController("authenticated");

  const renderOverview = () => (
    <>
      <CpKpiStrip>
        <CpKpiCard label="الأدوار المعرّفة" value={count(roles.state)} />
        <CpKpiCard label="إسنادات الأدوار المعتمدة" value={count(staff.state)} />
      </CpKpiStrip>
      <CpStatePanel
        role="status"
        title={ADMINISTRATION_TRUTH_NOTICE.title}
        description={ADMINISTRATION_TRUTH_NOTICE.description}
      />
      <section aria-label="حالة القراءة التشغيلية">
        <h2>حالة القراءة التشغيلية</h2>
        {statePanel(roles.state, "جارٍ تحميل الأدوار…")}
        {statePanel(staff.state, "جارٍ تحميل إسنادات الأدوار…")}
        {statePanel(audit.state, "جارٍ تحميل سجل التدقيق…")}
        {roles.state.kind === "success" && staff.state.kind === "success" && audit.state.kind === "success" ? (
          <CpStatePanel role="status" title="تم تحميل الحقيقة الإدارية من DSH." />
        ) : null}
      </section>
    </>
  );

  const renderRoles = () => (
    <>
      {statePanel(roles.state, "جارٍ تحميل الأدوار…")}
      {roles.state.kind === "success" && roles.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد أدوار معرفة في DSH." />
      ) : null}
      {roles.state.kind === "success" ? (
        <CpTable aria-label="الأدوار والصلاحيات">
          <thead>
            <tr>
              <CpTableHeaderCell>الدور</CpTableHeaderCell>
              <CpTableHeaderCell>الوصف</CpTableHeaderCell>
              <CpTableHeaderCell>الصلاحيات</CpTableHeaderCell>
              <CpTableHeaderCell>الأسطح</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة/النسخة</CpTableHeaderCell>
              <CpTableHeaderCell>تاريخ الإنشاء</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {roles.state.data.map((role) => (
              <tr key={role.id}>
                <CpTableCell>{role.name}</CpTableCell>
                <CpTableCell>{role.description || "—"}</CpTableCell>
                <CpTableCell>{role.permissions.length > 0 ? role.permissions.join("، ") : "لا توجد صلاحيات مرتبطة"}</CpTableCell>
                <CpTableCell>{role.surfaces.length > 0 ? role.surfaces.join("، ") : "—"}</CpTableCell>
                <CpTableCell>
                  <CpBadge tone={role.active ? "success" : "neutral"}>{role.active ? "فعال" : "غير فعال"}</CpBadge>{" "}
                  <CpMutedInline tight>v{role.version}</CpMutedInline>
                </CpTableCell>
                <CpTableCell>{role.createdAt}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </>
  );

  const renderUsers = () => (
    <>
      <section aria-label="إسنادات الأدوار المعتمدة">
        <h2>إسنادات الأدوار المعتمدة</h2>
        {statePanel(staff.state, "جارٍ تحميل الإسنادات…")}
        {staff.state.kind === "success" && staff.state.data.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد إسنادات أدوار معتمدة." />
        ) : null}
        {staff.state.kind === "success" && staff.state.data.length > 0 ? (
          <CpTable aria-label="إسنادات الأدوار">
            <thead>
              <tr>
                <CpTableHeaderCell>الموظف</CpTableHeaderCell>
                <CpTableHeaderCell>الدور</CpTableHeaderCell>
                <CpTableHeaderCell>المعتمد</CpTableHeaderCell>
                <CpTableHeaderCell>وقت الاعتماد</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {staff.state.data.map((member) => (
                <tr key={member.id}>
                  <CpTableCell>{member.actorId}</CpTableCell>
                  <CpTableCell>{member.roleName}</CpTableCell>
                  <CpTableCell>{member.assignedBy || "—"}</CpTableCell>
                  <CpTableCell>{member.assignedAt}</CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        ) : null}
      </section>
    </>
  );

  const renderApprovalChain = () => (
    <CpStatePanel
      role="status"
      title="جميع طفرات إسناد الأدوار تمر عبر Maker / Checker"
      description="أنشئ الطلب وراجعه من الطابور الحاكم أدناه. لا توجد مسارات Runtime مباشرة لإسناد الدور أو إنشاء حقائق موازية."
    />
  );

  const renderAudit = () => (
    <>
      {statePanel(audit.state, "جارٍ تحميل سجل التدقيق…")}
      {audit.state.kind === "success" && audit.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد أحداث تدقيق إدارية." />
      ) : null}
      {audit.state.kind === "success" ? (
        <CpTable aria-label="سجل التدقيق الإداري">
          <thead>
            <tr>
              <CpTableHeaderCell>الوقت</CpTableHeaderCell>
              <CpTableHeaderCell>المنفذ</CpTableHeaderCell>
              <CpTableHeaderCell>العملية</CpTableHeaderCell>
              <CpTableHeaderCell>الهدف</CpTableHeaderCell>
              <CpTableHeaderCell>الحساسية</CpTableHeaderCell>
              <CpTableHeaderCell>مرجع الارتباط</CpTableHeaderCell>
              <CpTableHeaderCell>التفاصيل المنقحة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {audit.state.data.map((entry) => (
              <tr key={entry.id}>
                <CpTableCell>{entry.createdAt}</CpTableCell>
                <CpTableCell>{entry.actorId}</CpTableCell>
                <CpTableCell>{entry.action}</CpTableCell>
                <CpTableCell>{entry.targetId || "—"}</CpTableCell>
                <CpTableCell>{entry.sensitivity}</CpTableCell>
                <CpTableCell>{entry.correlationId || "—"}</CpTableCell>
                <CpTableCell>{entry.detail || "—"}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </>
  );

  const content = tab === "overview" ? renderOverview()
    : tab === "roles-permissions" ? renderRoles()
      : tab === "users" ? renderUsers()
        : tab === "approval-chain" ? renderApprovalChain()
          : renderAudit();

  return (
    <OverviewPageFrame
      dir="rtl"
      header={<CpPageHeader title="الإدارة والصلاحيات" />}
      toolbar={<CpTabs items={MAIN_TAB_ITEMS} value={tab} onChange={(value) => setTab(value as AdminMainTabId)} aria-label="أقسام الإدارة" />}
    >
      {content}
    </OverviewPageFrame>
  );
}
