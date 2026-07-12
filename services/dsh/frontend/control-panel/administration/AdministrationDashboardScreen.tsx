"use client";
import { colorRoles, colorPalette, alpha } from '@bthwani/ui-kit';
﻿import React, { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  ADMIN_MAIN_TABS,
  ADMIN_SCOPE_DETAILS,
  ADMIN_OWNERSHIP,
  ADMIN_BOTTOM_CARDS,
  ADMIN_STATUS_FOOTER,
  ADMIN_ROLES,
  ADMIN_PLATFORM_PERMISSIONS,
  ALL_DSH_ROLE_IDS,
  buildAdminKpiMetrics,
  type AdminRole,
  type AdminMainTabId,
} from "../../shared/administration";
import {
  useStaffController,
  useCaptainCredentialController,
  useAdminAuditController,
} from "../../shared/administration";
import {
  DSH_ROLE_PERMISSIONS,
  DSH_MAKER_CHECKER_MATRIX,
  DSH_REASON_EVIDENCE_POLICY,
  getDshRoleCanPerform,
  getDshRoleArabicName,
  type DshRoleId,
  type DshPermissionSection,
  type DshSensitiveActionId,
  type DshRolePermissionEntry,
} from "../../shared/identity-access/dsh-role-permission.model";


// ─── Main Tab button (underline style) ──────────────────────────────────────────

function MainTabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.625rem 1.125rem",
        background: "none",
        border: "none",
        borderBottom: active ? `2px solid ${colorRoles.brandAction}` : "2px solid transparent",
        color: active ? colorRoles.brandAction : "currentColor",
        fontWeight: active ? 700 : 500,
        fontSize: "0.875rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
      }}
    >
      {children}
      {badge !== undefined && (
        <span
          style={{
            background: colorRoles.surfaceBase,
            color: "var(--status-danger-strong, colorRoles.brandAction)",
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.05rem 0.35rem",
            borderRadius: "0.25rem",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function AdministrationDashboardScreen() {
  const [mainTab, setMainTab] = useState<AdminMainTabId>("overview");

  // Sub-controllers for real operational data
  const { state: staffState } = useStaffController("authenticated");
  const { state: captainState } = useCaptainCredentialController("authenticated");
  const { state: auditState } = useAdminAuditController("authenticated");

  const staffCount = staffState.kind === "success" ? staffState.data.length : 0;
  const metrics = useMemo(() => buildAdminKpiMetrics(staffCount), [staffCount]);

  // ── Render Roles & Permissions Panel ───────────────────────────────────────
  const renderRolesPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Roles Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))", gap: "1rem" }}>
          {ADMIN_ROLES.map((role) => (
            <div
              key={role.id}
              style={{
                background: colorRoles.surfaceBase,
                border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                borderRadius: "0.75rem",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                boxShadow: `0 1px 3px ${alpha(colorPalette.black, 0.05)}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.95rem" }}>{role.arabicName}</strong>
                <span style={{ fontSize: "0.75rem", color: colorRoles.brandStructure, fontFamily: "monospace" }}>{role.name}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>{role.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                {role.permissions.map((p) => (
                  <span
                    key={p}
                    style={{
                      background: "var(--surface-muted, colorRoles.surfaceBase)",
                      color: "var(--text-secondary, colorRoles.brandStructure)",
                      fontSize: "0.7rem",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "0.25rem",
                      fontWeight: 600,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Permissions Matrix */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>مصفوفة الصلاحيات بالمنصة</h3>
          <CpTable aria-label="مصفوفة الصلاحيات">
            <thead>
              <tr>
                <CpTableHeaderCell style={{ width: "12rem" }}>الصلاحية / النطاق</CpTableHeaderCell>
                {ADMIN_ROLES.map((role) => (
                  <CpTableHeaderCell key={role.id} style={{ textAlign: "center", fontSize: "0.8rem" }}>
                    {role.arabicName}
                  </CpTableHeaderCell>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_PLATFORM_PERMISSIONS.map((perm) => (
                <tr key={perm.id}>
                  <CpTableCell>
                    <strong style={{ fontSize: "0.813rem" }}>{perm.name}</strong>
                    <div style={{ fontSize: "0.72rem", opacity: 0.55 }}>{perm.scope}</div>
                  </CpTableCell>
                  {ADMIN_ROLES.map((role) => {
                    const hasPerm = role.permissions.includes(perm.id);
                    return (
                      <CpTableCell key={role.id} style={{ textAlign: "center", fontSize: "1rem", fontWeight: 700, color: hasPerm ? colorRoles.brandStructure : colorRoles.brandAction }}>
                        {hasPerm ? "✓" : "✗"}
                      </CpTableCell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </CpTable>
        </div>
      </div>
    );
  };

  // ── Render Users & Captains Panel ──────────────────────────────────────────
  const renderUsersPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Staff & Role Assignments (Real Data) */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>الموظفون وأدوارهم المخصصة (Real Data)</h3>
          {staffState.kind === "loading" && <CpStatePanel role="status" title="جارٍ تحميل قائمة الموظفين..." />}
          {staffState.kind === "error" && <CpStatePanel role="alert" title={staffState.message} />}
          {staffState.kind === "success" && (
            <CpTable aria-label="الموظفون">
              <thead>
                <tr>
                  <CpTableHeaderCell>معرّف الموظف</CpTableHeaderCell>
                  <CpTableHeaderCell>الدور المخصص</CpTableHeaderCell>
                  <CpTableHeaderCell>أسنِد بواسطة</CpTableHeaderCell>
                  <CpTableHeaderCell>تاريخ الإسناد</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {staffState.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>لا يوجد موظفون مسجّلون.</td>
                  </tr>
                ) : (
                  staffState.data.map((member) => (
                    <tr key={member.id}>
                      <CpTableCell><code>{member.actorId}</code></CpTableCell>
                      <CpTableCell>
                        <span style={{ background: colorRoles.surfaceBase, color: colorRoles.brandStructure, fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontWeight: 600 }}>
                          {member.roleName}
                        </span>
                      </CpTableCell>
                      <CpTableCell>{member.assignedBy || "—"}</CpTableCell>
                      <CpTableCell style={{ opacity: 0.65 }}>{member.assignedAt}</CpTableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </CpTable>
          )}
        </div>
        {/* Real Captain Credentials from controller */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>أوراق اعتماد القباطنة (Real Data)</h3>
          {captainState.kind === "loading" && <CpStatePanel role="status" title="جارٍ تحميل أوراق الاعتماد…" />}
          {captainState.kind === "success" && (
            <CpTable aria-label="سجل القباطنة">
              <thead>
                <tr>
                  <CpTableHeaderCell>معرّف القبطان</CpTableHeaderCell>
                  <CpTableHeaderCell>رقم الرخصة</CpTableHeaderCell>
                  <CpTableHeaderCell>نوع المركبة</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة بالمنصة</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {captainState.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>لا توجد بيانات قباطنة.</td>
                  </tr>
                ) : (
                  captainState.data.map((c) => (
                    <tr key={c.captainId}>
                      <CpTableCell><code>{c.captainId}</code></CpTableCell>
                      <CpTableCell>{c.licenseNumber || "—"}</CpTableCell>
                      <CpTableCell>{c.vehicleType || "—"}</CpTableCell>
                      <CpTableCell>
                        <span style={{ background: "var(--surface-muted, colorRoles.surfaceBase)", color: colorRoles.brandStructure, padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 600 }}>
                          {c.status}
                        </span>
                      </CpTableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </CpTable>
          )}
        </div>
      </div>
    );
  };

  // ── Render Approval Chain & Partner Activations ───────────────────────────
  const renderApprovalChainPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Visual Chains info */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>سلاسل ومسارات الاعتماد</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Chain 1 */}
            <div style={{ padding: "1rem", background: colorRoles.surfaceBase, borderRadius: "0.75rem", border: `1px solid var(--border-color, colorRoles.surfaceBase)` }}>
              <strong style={{ fontSize: "0.875rem", color: colorRoles.brandStructure }}>مسار الاعتماد العام (الشركاء والكتالوجات)</strong>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ background: "var(--surface-muted, colorRoles.surfaceBase)", color: "var(--text-secondary, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>طلب تفعيل (مشغل)</span>
                <span style={{ fontSize: "1rem" }}>â⬠</span>
                <span style={{ background: colorRoles.surfaceBase, color: "var(--status-warning-text, colorRoles.brandAction)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>مراجعة وتوثيق (ميداني)</span>
                <span style={{ fontSize: "1rem" }}>â⬠</span>
                <span style={{ background: colorRoles.surfaceBase, color: "var(--status-success-text, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>قرار نهائي (معتمد المنصة)</span>
              </div>
            </div>

            {/* Chain 2 */}
            <div style={{ padding: "1rem", background: colorRoles.surfaceBase, borderRadius: "0.75rem", border: `1px solid var(--border-color, colorRoles.surfaceBase)` }}>
              <strong style={{ fontSize: "0.875rem", color: colorRoles.brandStructure }}>القرارات المالية الحساسة (Mutations)</strong>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ background: colorRoles.surfaceBase, color: colorRoles.brandAction, padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>طلب تعديل عمولة (بثواني)</span>
                <span style={{ fontSize: "1rem" }}>â⬠</span>
                <span style={{ background: "var(--status-purple-surface, colorRoles.surfaceBase)", color: "var(--status-purple, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>مراجعة WLT المالي</span>
                <span style={{ fontSize: "1rem" }}>â⬠</span>
                <span style={{ background: colorRoles.surfaceBase, color: "var(--status-success-text, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>اعتماد مزدوج مالي حصرًا (WLT-only)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ── Render Maker / Checker Panel ──────────────────────────────────────────
  const renderMakerCheckerPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Maker/Checker Grid */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>قواعد صانع القرار ومراجعه (Maker / Checker Matrix)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", gap: "1rem" }}>
            {DSH_MAKER_CHECKER_MATRIX.map((entry) => (
              <div
                key={`${entry.section}-${entry.actionId}`}
                style={{
                  background: colorRoles.surfaceBase,
                  border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.875rem" }}>{entry.actionLabel}</strong>
                  {entry.wltReadOnly && (
                    <span style={{ background: colorRoles.surfaceBase, color: "var(--status-danger-strong, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "0.25rem" }}>
                      WLT قراءة فقط
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", color: colorRoles.brandStructure }}>
                  منشئ الطلب: <strong>{getDshRoleArabicName(entry.makerRoleId)}</strong>
                </div>
                <div style={{ fontSize: "0.75rem", color: colorRoles.brandStructure }}>
                  معتمد القرار: <strong>{getDshRoleArabicName(entry.checkerRoleId)}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  {entry.auditRequired && <span style={{ background: colorRoles.surfaceBase, color: "var(--status-warning-text, colorRoles.brandAction)", fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>سجل تدقيق</span>}
                  {entry.reasonRequired && <span style={{ background: colorRoles.surfaceBase, color: colorRoles.brandStructure, fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>سبب إلزامي</span>}
                  {entry.evidenceRequired && <span style={{ background: colorRoles.surfaceBase, color: colorRoles.brandStructure, fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>وثيقة إثبات</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason / Evidence Policies */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>سياسات متطلبات التبرير والإثبات</h3>
          <CpTable aria-label="سياسات التبرير">
            <thead>
              <tr>
                <CpTableHeaderCell>عنوان السياسة</CpTableHeaderCell>
                <CpTableHeaderCell>السبب مطلوب</CpTableHeaderCell>
                <CpTableHeaderCell>الإثبات البصري مطلوب</CpTableHeaderCell>
                <CpTableHeaderCell>تصدير التقرير الفني</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {DSH_REASON_EVIDENCE_POLICY.map((policy) => (
                <tr key={policy.policyId}>
                  <CpTableCell><strong>{policy.title}</strong></CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: policy.reasonRequired ? colorRoles.brandAction : colorRoles.brandStructure }}>
                    {policy.reasonRequired ? "إلزامي" : "اختياري"}
                  </CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: policy.evidenceRequired ? colorRoles.brandAction : colorRoles.brandStructure }}>
                    {policy.evidenceRequired ? "إلزامي" : "اختياري"}
                  </CpTableCell>
                  <CpTableCell><code>{policy.exportSnapshotLabel}</code></CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        </div>
      </div>
    );
  };

  // ── Render Sensitive Decisions Panel & Audits ─────────────────────────────
  const renderSensitiveDecisionsPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* 10 Sensitive Decisions List */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>نقاط القرار العشر الحساسة بـ DSH</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {DSH_ROLE_PERMISSIONS.map((entry) => (
              <div
                key={entry.sensitiveAction}
                style={{
                  background: colorRoles.surfaceBase,
                  border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifySelf: "space-between", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.9rem", color: colorRoles.brandStructure }}>{entry.arabicLabel}</strong>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    {entry.auditRequired && <span style={{ background: colorRoles.surfaceBase, color: "var(--status-warning-text, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "0.25rem" }}>تدقيق إلزامي</span>}
                    {entry.wltMutationForbidden && <span style={{ background: colorRoles.surfaceBase, color: "var(--status-danger-strong, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "0.25rem" }}>WLT Ø¹Ø±Ø¶ Ù Ù‚Ø·</span>}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>{entry.arabicDescription}</p>
                <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                  الأسطح المتأثرة: {entry.affectedSurfaces.join(" · ")} | الحد الأدنى للدور: {getDshRoleArabicName(entry.roleId)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Audit logs or Audit entries */}
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>سجل تدقيق العمليات والقرارات الحساسة (Real Data)</h3>
          {auditState.kind === "loading" && <CpStatePanel role="status" title="جارٍ تحميل سجل التدقيق…" />}
          {auditState.kind === "success" && (
            <CpTable aria-label="سجل التدقيق">
              <thead>
                <tr>
                  <CpTableHeaderCell>المشرف</CpTableHeaderCell>
                  <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
                  <CpTableHeaderCell>الهدف</CpTableHeaderCell>
                  <CpTableHeaderCell>التاريخ</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {auditState.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>لا توجد سجلات تدقيق بالمنصة.</td>
                  </tr>
                ) : (
                  auditState.data.map((a, i) => (
                    <tr key={`${a.actorId}-${a.action}-${i}`}>
                      <CpTableCell><strong>{a.actorId}</strong></CpTableCell>
                      <CpTableCell><code>{a.action}</code></CpTableCell>
                      <CpTableCell>{a.targetId || "—"}</CpTableCell>
                      <CpTableCell style={{ opacity: 0.65 }}>{a.createdAt}</CpTableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </CpTable>
          )}
        </div>
      </div>
    );
  };

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="الإدارة والصلاحيات">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            تحديد من يرى Platform ومن يعتمد التغييرات ومن ينفذها.
          </p>

          {/* ── KPI Strip ─────────────────────────────────────────────── */}
          <CpKpiStrip>
            <CpKpiCard label="الأدوار"      value={metrics.rolesCount} />
            <CpKpiCard label="المستخدمون"  value={metrics.usersCount} />
            <CpKpiCard label="نمط المرحلة"  value={metrics.environmentMode} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
      {/* ── Status Alert Bar ──────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          margin: "0 1rem 1rem",
          padding: "0.75rem 1.25rem",
          background: colorRoles.surfaceBase,
          border: `1px solid var(--status-warning-border, colorRoles.surfaceBase)`,
          color: "var(--status-warning-text, colorRoles.brandAction)",
          borderRadius: "0.75rem",
          fontSize: "0.813rem",
          fontWeight: 600,
        }}
      >
        وضع تجريبي: جميع الإجراءات محاكاة محلية فقط. لا يتم تعديل صلاحيات حقيقية أو حسابات مستخدمين.
      </div>

      {/* ── Main Tab Navigation (matching underline style) ────────────────── */}
      <nav
        dir="rtl"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem",
          gap: "0.25rem",
          marginBottom: "1.25rem",
          overflowX: "auto",
        }}
      >
        {ADMIN_MAIN_TABS.map((t) => (
          <MainTabButton
            key={t.id}
            active={mainTab === t.id}
            onClick={() => setMainTab(t.id)}
            {...(t.badge !== undefined ? { badge: t.badge } : {})}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* ── Content View conditionally rendered by mainTab ───────────────── */}
      <div style={{ padding: "0 1rem 1rem" }}>
        {mainTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Scope details row */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                background: colorRoles.surfaceBase,
                border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                fontSize: "0.813rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span style={{ opacity: 0.65 }}>المجال الحالي:</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.currentDomain}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>النطاق:</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.scope}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>نمط المرحلة:</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.envMode}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>Auth حقيقي:</span>{" "}
                <strong style={{ color: colorRoles.brandAction }}>{ADMIN_SCOPE_DETAILS.authType}</strong>
              </div>
            </div>

            {/* Middle ownership boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))", gap: "1.25rem" }}>
              <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700 }}>
                  {ADMIN_OWNERSHIP.title}
                </h4>
                <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>
                  {ADMIN_OWNERSHIP.description}
                </p>
                <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: "1rem" }}>
                  summary-onlydetail-on-open
                </div>
              </div>

              <div style={{ background: colorRoles.surfaceBase, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700 }}>
                  {ADMIN_OWNERSHIP.platformRelationTitle}
                </h4>
                <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>
                  {ADMIN_OWNERSHIP.platformRelationDesc}
                </p>
              </div>
            </div>

            {/* Bottom Cards row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem" }}>
              {ADMIN_BOTTOM_CARDS.map((card) => (
                <div
                  key={card.id}
                  style={{
                    background: colorRoles.surfaceBase,
                    border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>{card.title}</div>
                  <strong style={{ fontSize: "1.25rem", color: colorRoles.brandStructure, margin: "0.15rem 0" }}>
                    {card.value}
                  </strong>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7, lineHeight: 1.4 }}>
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mainTab === "roles-permissions" && renderRolesPanel()}
        {mainTab === "users" && renderUsersPanel()}
        {mainTab === "approval-chain" && renderApprovalChainPanel()}
        {mainTab === "maker-checker" && renderMakerCheckerPanel()}
        {mainTab === "sensitive-decisions" && renderSensitiveDecisionsPanel()}
      </div>

      {/* ── Status Footer (ownership bar) ────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          display: "flex",
          gap: "1.5rem",
          padding: "0.5rem 1rem",
          fontSize: "0.75rem",
          opacity: 0.6,
          borderTop: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
          marginTop: "1.75rem",
          flexWrap: "wrap",
        }}
      >
        <span>المالك: <strong>{ADMIN_STATUS_FOOTER.owner}</strong></span>
        <span>والتدقيق: <strong>{ADMIN_STATUS_FOOTER.ownerPath}</strong></span>
        <span>الخدمات النشطة: {ADMIN_STATUS_FOOTER.activeServices}</span>
        <span style={{ marginInlineStart: "auto", color: "var(--status-success-strong, colorRoles.brandStructure)", fontWeight: 600 }}>{ADMIN_STATUS_FOOTER.status}</span>
      </div>
    </DataTablePageFrame>
  );
}



