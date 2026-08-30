"use client";

import React, { useState } from "react";
import {
  CpKpiCard,
  CpKpiStrip,
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
  useAdministrationRolesController,
  useStaffController,
  useAdminAuditController,
  type AdminMainTabId,
  type DshAdminState,
  type DshRolePermission,
} from "../../shared/administration";
import { useIdentitySession } from "@bthwani/core-identity";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

type CountableState = DshAdminState<readonly unknown[]>;

function countValue(state: CountableState, allowed: boolean): number | string {
  if (!allowed) return "غير مصرح";
  return state.kind === "success" ? state.data.length : "—";
}

function statePanel(state: CountableState, loadingTitle: string) {
  if (state.kind === "loading") return <CpStatePanel role="status" title={loadingTitle} />;
  if (state.kind === "error") return <CpStateView kind="error" title={state.message} />;
  return null;
}

function permissionLabel(permission: DshRolePermission): string {
  return permission;
}

export function AdministrationDashboardScreen() {
  const [tab, setTab] = useState<AdminMainTabId>("overview");
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canReadRoles = hasServiceControlPanelPermission(identity, "dsh", "administration.role.read");
  const canReadStaff = hasServiceControlPanelPermission(identity, "dsh", "administration.staff.read");
  const canReadAudit = hasServiceControlPanelPermission(identity, "dsh", "administration.audit.read");
  const canReview = hasServiceControlPanelPermission(identity, "dsh", "administration.role.approve")
    || hasServiceControlPanelPermission(identity, "dsh", "administration.staff.approve")
    || hasServiceControlPanelPermission(identity, "dsh", "administration.rollback.approve");
  const roles = useAdministrationRolesController("authenticated", canReadRoles);
  const staff = useStaffController("authenticated", canReadStaff);
  const audit = useAdminAuditController("authenticated", canReadAudit);
  const mainTabItems = ADMIN_MAIN_TABS
    .filter((item) => item.id === "overview"
      || (item.id === "roles-permissions" && canReadRoles)
      || (item.id === "users" && canReadStaff)
      || (item.id === "approval-chain" && canReview)
      || (item.id === "audit" && canReadAudit))
    .map((item) => ({ value: item.id, label: item.label }));
  const hasRestrictedOverviewData = !canReadRoles || !canReadStaff || !canReadAudit;

  const renderOverview = () => (
    <>
      <CpKpiStrip>
        <CpKpiCard label="الأدوار المعرّفة" value={countValue(roles.state, canReadRoles)} />
        <CpKpiCard label="إسنادات الأدوار المعتمدة" value={countValue(staff.state, canReadStaff)} />
      </CpKpiStrip>
      {hasRestrictedOverviewData ? (
        <CpStatePanel
          role="status"
          title="بعض حقائق الإدارة محجوبة حسب صلاحيات المشغّل"
          description="لن تُعرض البيانات غير المقروءة كأرقام صفرية. تظهر القيمة فقط بعد إثبات صلاحية القراءة ونجاح المصدر المالك."
        />
      ) : null}
      <CpStatePanel
        role="status"
        title={ADMINISTRATION_TRUTH_NOTICE.title}
        description={ADMINISTRATION_TRUTH_NOTICE.description}
      />
      <section aria-label="حالة القراءة التشغيلية">
        <h2>حالة القراءة التشغيلية</h2>
        {canReadRoles ? statePanel(roles.state, "جارٍ تحميل الأدوار من Identity…") : null}
        {canReadStaff ? statePanel(staff.state, "جارٍ تحميل إسنادات الأدوار…") : null}
        {canReadAudit ? statePanel(audit.state, "جارٍ تحميل سجل التدقيق…") : null}
        {canReadRoles && canReadStaff && canReadAudit
          && roles.state.kind === "success" && staff.state.kind === "success" && audit.state.kind === "success" ? (
          <CpStatePanel role="status" title="تم تحميل تعريفات الأدوار من Identity وسجل الحوكمة من DSH." />
        ) : null}
      </section>
    </>
  );

  const renderRoles = () => (
    <>
      {statePanel(roles.state, "جارٍ تحميل الأدوار من Identity…")}
      {roles.state.kind === "success" && roles.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد أدوار معرفة في Identity." />
      ) : null}
      {roles.state.kind === "success" ? (
        <CpTable aria-label="تعريفات الأدوار والصلاحيات في Identity">
          <thead>
            <tr>
              <CpTableHeaderCell>الدور</CpTableHeaderCell>
              <CpTableHeaderCell>الوصف</CpTableHeaderCell>
              <CpTableHeaderCell>الصلاحيات الفعلية</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة / النسخة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {roles.state.data.map((role) => (
              <tr key={role.id}>
                <CpTableCell>{role.name}</CpTableCell>
                <CpTableCell>{role.description || "—"}</CpTableCell>
                <CpTableCell>
                  {role.permissions.length > 0
                    ? role.permissions.map(permissionLabel).join("، ")
                    : "لا توجد صلاحيات مرتبطة"}
                </CpTableCell>
                <CpTableCell>{role.active ? "نشط" : "غير فعال"} / v{role.version}</CpTableCell>
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
                <CpTableHeaderCell>معرّف الممثل</CpTableHeaderCell>
                <CpTableHeaderCell>أول منح</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {staff.state.data.map((member) => (
                <tr key={member.id}>
                  <CpTableCell>{member.username || member.actorId}</CpTableCell>
                  <CpTableCell>{member.roles.join("، ")}</CpTableCell>
                  <CpTableCell>{member.actorId}</CpTableCell>
                  <CpTableCell>{member.createdAt}</CpTableCell>
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
      description="أنشئ الطلب وراجعه من الطابور الحاكم أدناه. Identity هي سلطة تعريف الأدوار والإسنادات، وDSH يحتفظ بسجل طلبات ومراجعات الحوكمة فقط."
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
      toolbar={<CpTabs items={mainTabItems} value={tab} onChange={(value) => setTab(value as AdminMainTabId)} aria-label="أقسام الإدارة" />}
    >
      {content}
    </OverviewPageFrame>
  );
}
