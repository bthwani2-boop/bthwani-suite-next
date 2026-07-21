"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import {
  ADMIN_MAIN_TABS,
  ADMINISTRATION_TRUTH_NOTICE,
  administrationStatusLabel,
  useAdministrationRolesController,
  useStaffController,
  usePartnerActivationReadController,
  useCaptainCredentialController,
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
  if (state.kind === "error") return <CpStatePanel role="alert" title={state.message} />;
  return null;
}

export function AdministrationDashboardScreen() {
  const [tab, setTab] = useState<AdminMainTabId>("overview");
  const roles = useAdministrationRolesController("authenticated");
  const staff = useStaffController("authenticated");
  const partners = usePartnerActivationReadController("authenticated");
  const captains = useCaptainCredentialController("authenticated");
  const audit = useAdminAuditController("authenticated");

  const renderOverview = () => (
    <section style={styles.sectionStack}>
      <CpKpiStrip>
        <CpKpiCard label="الأدوار المعرّفة" value={count(roles.state)} />
        <CpKpiCard label="إسنادات الأدوار المعتمدة" value={count(staff.state)} />
        <CpKpiCard label="إسقاطات الشركاء" value={count(partners.state)} />
        <CpKpiCard label="اعتمادات الكباتن" value={count(captains.state)} />
      </CpKpiStrip>
      <CpStatePanel
        role="status"
        title={ADMINISTRATION_TRUTH_NOTICE.title}
        description={ADMINISTRATION_TRUTH_NOTICE.description}
      />
      <article style={styles.card}>
        <h2 style={styles.heading}>حالة القراءة التشغيلية</h2>
        {statePanel(roles.state, "جارٍ تحميل الأدوار…")}
        {statePanel(staff.state, "جارٍ تحميل إسنادات الأدوار…")}
        {statePanel(partners.state, "جارٍ تحميل إسقاطات الشركاء…")}
        {statePanel(captains.state, "جارٍ تحميل اعتمادات الكباتن…")}
        {statePanel(audit.state, "جارٍ تحميل سجل التدقيق…")}
        {roles.state.kind === "success" && staff.state.kind === "success" && audit.state.kind === "success" ? (
          <CpStatePanel role="status" title="تم تحميل الحقيقة الإدارية من DSH." />
        ) : null}
      </article>
    </section>
  );

  const renderRoles = () => (
    <section style={styles.sectionStack}>
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
              <CpTableHeaderCell>تاريخ الإنشاء</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {roles.state.data.map((role) => (
              <tr key={role.id}>
                <CpTableCell>{role.name}</CpTableCell>
                <CpTableCell>{role.description || "—"}</CpTableCell>
                <CpTableCell>{role.permissions.length > 0 ? role.permissions.join("، ") : "لا توجد صلاحيات مرتبطة"}</CpTableCell>
                <CpTableCell>{role.createdAt}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </section>
  );

  const renderUsers = () => (
    <section style={styles.sectionStack}>
      <article style={styles.card}>
        <h2 style={styles.heading}>إسنادات الأدوار المعتمدة</h2>
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
      </article>

      <article style={styles.card}>
        <h2 style={styles.heading}>إسقاطات الاعتماد المالكة لرحلات أخرى</h2>
        {statePanel(partners.state, "جارٍ تحميل الشركاء…")}
        {statePanel(captains.state, "جارٍ تحميل الكباتن…")}
        {partners.state.kind === "success" ? partners.state.data.map((item) => (
          <div key={item.id} style={styles.readOnlyRow}>
            <strong>{item.partnerId}</strong>
            <span>{administrationStatusLabel(item.status)}</span>
          </div>
        )) : null}
        {captains.state.kind === "success" ? captains.state.data.map((item) => (
          <div key={item.id} style={styles.readOnlyRow}>
            <strong>{item.captainId}</strong>
            <span>{administrationStatusLabel(item.status)}</span>
          </div>
        )) : null}
      </article>
    </section>
  );

  const renderApprovalChain = () => (
    <CpStatePanel
      role="status"
      title="جميع طفرات إسناد الأدوار تمر عبر Maker / Checker"
      description="أنشئ الطلب وراجعه من الطابور الحاكم أدناه. لا توجد مسارات Runtime مباشرة لإسناد الدور أو إنشاء حقائق موازية."
    />
  );

  const renderAudit = () => (
    <section style={styles.sectionStack}>
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
              <CpTableHeaderCell>التفاصيل</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {audit.state.data.map((entry) => (
              <tr key={entry.id}>
                <CpTableCell>{entry.createdAt}</CpTableCell>
                <CpTableCell>{entry.actorId}</CpTableCell>
                <CpTableCell>{entry.action}</CpTableCell>
                <CpTableCell>{entry.targetId || "—"}</CpTableCell>
                <CpTableCell>{entry.detail || "—"}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </section>
  );

  const content = tab === "overview" ? renderOverview()
    : tab === "roles-permissions" ? renderRoles()
      : tab === "users" ? renderUsers()
        : tab === "approval-chain" ? renderApprovalChain()
          : renderAudit();

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="الإدارة والصلاحيات" />}
      toolbar={(
        <nav style={styles.tabs} aria-label="أقسام الإدارة">
          {ADMIN_MAIN_TABS.map((item) => (
            <CpButton
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-label={item.label}
              style={tab === item.id ? styles.activeTab : styles.tab}
            >
              {item.label}
            </CpButton>
          ))}
        </nav>
      )}
    >
      <div style={styles.content}>{content}</div>
    </DataTablePageFrame>
  );
}

const styles = WebStyleSheet.create({
  content: {
    display: "grid",
    gap: "1rem",
    padding: "1rem",
  },
  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
  },
  tab: {
    opacity: 0.75,
  },
  activeTab: {
    fontWeight: 700,
    opacity: 1,
  },
  sectionStack: {
    display: "grid",
    gap: "1rem",
  },
  card: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
    border: "1px solid var(--card-border, currentColor)",
    borderRadius: "1rem",
  },
  heading: {
    margin: 0,
    fontSize: "1rem",
  },
  readOnlyRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "0.75rem",
    borderBlockEnd: "1px solid var(--card-border, currentColor)",
  },
});
