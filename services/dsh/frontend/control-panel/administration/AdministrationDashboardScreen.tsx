"use client";
import { colorRoles } from '@bthwani/ui-kit';
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
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  ADMIN_MAIN_TABS,
  ADMIN_SCOPE_DETAILS,
  ADMIN_OWNERSHIP,
  ADMIN_BOTTOM_CARDS,
  ADMIN_STATUS_FOOTER,
  ADMIN_ROLES,
  ADMIN_PLATFORM_PERMISSIONS,
  MOCK_ADMIN_USERS,
  ALL_DSH_ROLE_IDS,
  buildAdminKpiMetrics,
  type AdminRole,
  type DshAdminUser,
  type AdminMainTabId,
} from "../../shared/administration";
import {
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
import { opsTheme } from "../../shared/operations";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Tab button (underline style) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        borderBottom: active ? `2px solid ${opsTheme.brand}` : "2px solid transparent",
        color: active ? opsTheme.brand : "currentColor",
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
            background: opsTheme.dangerSurface,
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Screen Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function AdministrationDashboardScreen() {
  const identity = useIdentitySession();

  const [mainTab, setMainTab] = useState<AdminMainTabId>("overview");

  // Sub-controllers for real operational data
  const { state: captainState } = useCaptainCredentialController(identity.state.kind);
  const { state: auditState } = useAdminAuditController(identity.state.kind);

  const metrics = useMemo(() => buildAdminKpiMetrics(), []);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth gate Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h2 style={{ margin: 0, textAlign: "right" }}>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            Ã™Å Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨ Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ operator Ã™â€¦Ã˜ÂµÃ˜Â±Ã˜Â­ Ã˜Â¨Ã™â€¡ Ã™â€žÃ™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦ Ã˜Â¨Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ™â€ Ã™Å .
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™Ë†Ã˜Â² Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž (Ã™â€¦Ã˜Â·Ã™Ë†Ã˜Â±)
          </CpButton>
        </div>
      </section>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Roles & Permissions Panel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.95rem" }}>{role.arabicName}</strong>
                <span style={{ fontSize: "0.75rem", color: opsTheme.textMuted, fontFamily: "monospace" }}>{role.name}</span>
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
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã™â€¦Ã˜ÂµÃ™ÂÃ™Ë†Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª Ã˜Â¨Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂµÃ˜Â©</h3>
          <CpTable aria-label="Ã™â€¦Ã˜ÂµÃ™ÂÃ™Ë†Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª">
            <thead>
              <tr>
                <CpTableHeaderCell style={{ width: "12rem" }}>Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â© / Ã˜Â§Ã™â€žÃ™â€ Ã˜Â·Ã˜Â§Ã™â€š</CpTableHeaderCell>
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
                        {hasPerm ? "Ã¢Å“â€œ" : "Ã¢Å“â€”"}
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Users & Captains Panel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderUsersPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Mock Users List */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Ë† Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦ Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜Â±Ã™ÂÃ™Ë†Ã™â€ </h3>
          <CpTable aria-label="Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Ë† Ã˜Â§Ã™â€žÃ™â€ Ã˜Â¸Ã˜Â§Ã™â€¦">
            <thead>
              <tr>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã™â€¦</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å </CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â®Ã˜ÂµÃ˜Âµ</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {MOCK_ADMIN_USERS.map((user) => (
                <tr key={user.id}>
                  <CpTableCell><strong>{user.name}</strong></CpTableCell>
                  <CpTableCell>{user.email}</CpTableCell>
                  <CpTableCell>
                    <span style={{ background: colorRoles.surfaceBase, color: opsTheme.info, fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontWeight: 600 }}>
                      {getDshRoleArabicName(user.roleId)}
                    </span>
                  </CpTableCell>
                  <CpTableCell>
                    <span style={{ color: user.status === "active" ? opsTheme.success : user.status === "pending" ? opsTheme.warning : opsTheme.danger, fontSize: "0.75rem", fontWeight: 700 }}>
                      {user.status === "active" ? "Ã™â€ Ã˜Â´Ã˜Â·" : user.status === "pending" ? "Ã™â€šÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â©" : "Ã™â€¦Ã˜Â¹Ã™â€žÃ™â€š"}
                    </span>
                  </CpTableCell>
                  <CpTableCell style={{ opacity: 0.65 }}>{user.lastAccess}</CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        </div>

        {/* Real Captain Credentials from controller */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã˜Â£Ã™Ë†Ã˜Â±Ã˜Â§Ã™â€š Ã˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€šÃ˜Â¨Ã˜Â§Ã˜Â·Ã™â€ Ã˜Â© (Real Data)</h3>
          {captainState.kind === "loading" && <CpStatePanel role="status" title="Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Â Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â£Ã™Ë†Ã˜Â±Ã˜Â§Ã™â€š Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯Ã¢â‚¬Â¦" />}
          {captainState.kind === "success" && (
            <CpTable aria-label="Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ™â€šÃ˜Â¨Ã˜Â§Ã˜Â·Ã™â€ Ã˜Â©">
              <thead>
                <tr>
                  <CpTableHeaderCell>Ã™â€¦Ã˜Â¹Ã˜Â±Ã™â€˜Ã™Â Ã˜Â§Ã™â€žÃ™â€šÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€ </CpTableHeaderCell>
                  <CpTableHeaderCell>Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â®Ã˜ÂµÃ˜Â©</CpTableHeaderCell>
                  <CpTableHeaderCell>Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Æ’Ã˜Â¨Ã˜Â©</CpTableHeaderCell>
                  <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â¨Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂµÃ˜Â©</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {captainState.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã™â€šÃ˜Â¨Ã˜Â§Ã˜Â·Ã™â€ Ã˜Â©.</td>
                  </tr>
                ) : (
                  captainState.data.map((c) => (
                    <tr key={c.captainId}>
                      <CpTableCell><code>{c.captainId}</code></CpTableCell>
                      <CpTableCell>{c.licenseNumber || "Ã¢â‚¬â€"}</CpTableCell>
                      <CpTableCell>{c.vehicleType || "Ã¢â‚¬â€"}</CpTableCell>
                      <CpTableCell>
                        <span style={{ background: "var(--surface-muted, colorRoles.surfaceBase)", color: opsTheme.textMuted, padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 600 }}>
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Approval Chain & Partner Activations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderApprovalChainPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Visual Chains info */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Ã˜Â³Ã™â€žÃ˜Â§Ã˜Â³Ã™â€ž Ã™Ë†Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Chain 1 */}
            <div style={{ padding: "1rem", background: opsTheme.surfaceInset, borderRadius: "0.75rem", border: `1px solid var(--border-color, colorRoles.surfaceBase)` }}>
              <strong style={{ fontSize: "0.875rem", color: opsTheme.text }}>Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã™â€¦ (Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™Ë†Ã˜Â§Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã˜Â§Ã˜Âª)</strong>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ background: "var(--surface-muted, colorRoles.surfaceBase)", color: "var(--text-secondary, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž (Ã™â€¦Ã˜Â´Ã˜ÂºÃ™â€ž)</span>
                <span style={{ fontSize: "1rem" }}>Ã¢â€ Â</span>
                <span style={{ background: opsTheme.warningSurface, color: "var(--status-warning-text, colorRoles.brandAction)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Â«Ã™Å Ã™â€š (Ã™â€¦Ã™Å Ã˜Â¯Ã˜Â§Ã™â€ Ã™Å )</span>
                <span style={{ fontSize: "1rem" }}>Ã¢â€ Â</span>
                <span style={{ background: opsTheme.successSurface, color: "var(--status-success-text, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã™â€šÃ˜Â±Ã˜Â§Ã˜Â± Ã™â€ Ã™â€¡Ã˜Â§Ã˜Â¦Ã™Å  (Ã™â€¦Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂµÃ˜Â©)</span>
              </div>
            </div>

            {/* Chain 2 */}
            <div style={{ padding: "1rem", background: opsTheme.surfaceInset, borderRadius: "0.75rem", border: `1px solid var(--border-color, colorRoles.surfaceBase)` }}>
              <strong style={{ fontSize: "0.875rem", color: opsTheme.text }}>Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â³Ã˜Â© (Mutations)</strong>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ background: opsTheme.dangerSurface, color: opsTheme.danger, padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¹Ã™â€¦Ã™Ë†Ã™â€žÃ˜Â© (Ã˜Â¨Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å )</span>
                <span style={{ fontSize: "1rem" }}>Ã¢â€ Â</span>
                <span style={{ background: "var(--status-purple-surface, colorRoles.surfaceBase)", color: "var(--status-purple, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© WLT Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Å </span>
                <span style={{ fontSize: "1rem" }}>Ã¢â€ Â</span>
                <span style={{ background: opsTheme.successSurface, color: "var(--status-success-text, colorRoles.brandStructure)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 600 }}>Ã˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯ Ã™â€¦Ã˜Â²Ã˜Â¯Ã™Ë†Ã˜Â¬ Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â­Ã˜ÂµÃ˜Â±Ã™â€¹Ã˜Â§ (WLT-only)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Maker / Checker Panel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderMakerCheckerPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Maker/Checker Grid */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã™â€šÃ™Ë†Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã˜ÂµÃ˜Â§Ã™â€ Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â§Ã˜Â± Ã™Ë†Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã™â€¡ (Maker / Checker Matrix)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", gap: "1rem" }}>
            {DSH_MAKER_CHECKER_MATRIX.map((entry) => (
              <div
                key={`${entry.section}-${entry.actionId}`}
                style={{
                  background: opsTheme.surfaceInset,
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
                    <span style={{ background: opsTheme.dangerSurface, color: "var(--status-danger-strong, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "0.25rem" }}>
                      WLT Ã™â€šÃ˜Â±Ã˜Â§Ã˜Â¡Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", color: opsTheme.textMuted }}>
                  Ã™â€¦Ã™â€ Ã˜Â´Ã˜Â¦ Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨: <strong>{getDshRoleArabicName(entry.makerRoleId)}</strong>
                </div>
                <div style={{ fontSize: "0.75rem", color: opsTheme.textMuted }}>
                  Ã™â€¦Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â§Ã˜Â±: <strong>{getDshRoleArabicName(entry.checkerRoleId)}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  {entry.auditRequired && <span style={{ background: opsTheme.warningSurface, color: "var(--status-warning-text, colorRoles.brandAction)", fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š</span>}
                  {entry.reasonRequired && <span style={{ background: colorRoles.surfaceBase, color: opsTheme.textMuted, fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>Ã˜Â³Ã˜Â¨Ã˜Â¨ Ã˜Â¥Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã™Å </span>}
                  {entry.evidenceRequired && <span style={{ background: colorRoles.surfaceBase, color: opsTheme.textMuted, fontSize: "0.65rem", padding: "0.05rem 0.25rem", borderRadius: "0.25rem", fontWeight: 600 }}>Ã™Ë†Ã˜Â«Ã™Å Ã™â€šÃ˜Â© Ã˜Â¥Ã˜Â«Ã˜Â¨Ã˜Â§Ã˜Âª</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason / Evidence Policies */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â«Ã˜Â¨Ã˜Â§Ã˜Âª</h3>
          <CpTable aria-label="Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â±">
            <thead>
              <tr>
                <CpTableHeaderCell>Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â©</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¨Ã˜Â¨ Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â«Ã˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¨Ã˜ÂµÃ˜Â±Ã™Å  Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨</CpTableHeaderCell>
                <CpTableHeaderCell>Ã˜ÂªÃ˜ÂµÃ˜Â¯Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™ÂÃ™â€ Ã™Å </CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {DSH_REASON_EVIDENCE_POLICY.map((policy) => (
                <tr key={policy.policyId}>
                  <CpTableCell><strong>{policy.title}</strong></CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: policy.reasonRequired ? colorRoles.brandAction : colorRoles.brandStructure }}>
                    {policy.reasonRequired ? "Ã˜Â¥Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã™Å " : "Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Å "}
                  </CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: policy.evidenceRequired ? colorRoles.brandAction : colorRoles.brandStructure }}>
                    {policy.evidenceRequired ? "Ã˜Â¥Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã™Å " : "Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Å "}
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Sensitive Decisions Panel & Audits Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderSensitiveDecisionsPanel = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* 10 Sensitive Decisions List */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã™â€ Ã™â€šÃ˜Â§Ã˜Â· Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â´Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â³Ã˜Â© Ã˜Â¨Ã™â‚¬ DSH</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {DSH_ROLE_PERMISSIONS.map((entry) => (
              <div
                key={entry.sensitiveAction}
                style={{
                  background: opsTheme.surfaceInset,
                  border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifySelf: "space-between", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.9rem", color: opsTheme.text }}>{entry.arabicLabel}</strong>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    {entry.auditRequired && <span style={{ background: opsTheme.warningSurface, color: "var(--status-warning-text, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "0.25rem" }}>Ã˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š Ã˜Â¥Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã™Å </span>}
                    {entry.wltMutationForbidden && <span style={{ background: opsTheme.dangerSurface, color: "var(--status-danger-strong, colorRoles.brandAction)", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "0.25rem" }}>WLT Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã™ Ã™â€šÃ˜Â·</span>}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>{entry.arabicDescription}</p>
                <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                  Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â·Ã˜Â­ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â£Ã˜Â«Ã˜Â±Ã˜Â©: {entry.affectedSurfaces.join(" Ã‚Â· ")} | Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¯Ã™â€ Ã™â€° Ã™â€žÃ™â€žÃ˜Â¯Ã™Ë†Ã˜Â±: {getDshRoleArabicName(entry.roleId)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Audit logs or Audit entries */}
        <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ™Å Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â³Ã˜Â© (Real Data)</h3>
          {auditState.kind === "loading" && <CpStatePanel role="status" title="Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Â Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€šÃ¢â‚¬Â¦" />}
          {auditState.kind === "success" && (
            <CpTable aria-label="Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š">
              <thead>
                <tr>
                  <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜Â±Ã™Â</CpTableHeaderCell>
                  <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡</CpTableHeaderCell>
                  <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â¯Ã™Â</CpTableHeaderCell>
                  <CpTableHeaderCell>Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â®</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {auditState.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š Ã˜Â¨Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂµÃ˜Â©.</td>
                  </tr>
                ) : (
                  auditState.data.map((a, i) => (
                    <tr key={`${a.actorId}-${a.action}-${i}`}>
                      <CpTableCell><strong>{a.actorId}</strong></CpTableCell>
                      <CpTableCell><code>{a.action}</code></CpTableCell>
                      <CpTableCell>{a.targetId || "Ã¢â‚¬â€"}</CpTableCell>
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
        <CpPageHeader title="Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯ Ã™â€¦Ã™â€  Ã™Å Ã˜Â±Ã™â€° Platform Ã™Ë†Ã™â€¦Ã™â€  Ã™Å Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª Ã™Ë†Ã™â€¦Ã™â€  Ã™Å Ã™â€ Ã™ÂÃ˜Â°Ã™â€¡Ã˜Â§.
          </p>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ KPI Strip Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <CpKpiStrip>
            <CpKpiCard label="Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¯Ã™Ë†Ã˜Â§Ã˜Â±"      value={metrics.rolesCount} />
            <CpKpiCard label="Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Ë†Ã™â€ "  value={metrics.usersCount} />
            <CpKpiCard label="Ã™â€ Ã™â€¦Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â­Ã™â€žÃ˜Â©"  value={metrics.environmentMode} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Status Alert Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div
        dir="rtl"
        style={{
          margin: "0 1rem 1rem",
          padding: "0.75rem 1.25rem",
          background: opsTheme.warningSurface,
          border: `1px solid var(--status-warning-border, colorRoles.surfaceBase)`,
          color: "var(--status-warning-text, colorRoles.brandAction)",
          borderRadius: "0.75rem",
          fontSize: "0.813rem",
          fontWeight: 600,
        }}
      >
        Ã™Ë†Ã˜Â¶Ã˜Â¹ Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Å Ã˜Â¨Ã™Å : Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â­Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Â© Ã™â€¦Ã˜Â­Ã™â€žÃ™Å Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·. Ã™â€žÃ˜Â§ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜ÂµÃ™â€žÃ˜Â§Ã˜Â­Ã™Å Ã˜Â§Ã˜Âª Ã˜Â­Ã™â€šÃ™Å Ã™â€šÃ™Å Ã˜Â© Ã˜Â£Ã™Ë† Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™Å Ã™â€ .
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Main Tab Navigation (matching underline style) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
            badge={t.badge}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Content View conditionally rendered by mainTab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div style={{ padding: "0 1rem 1rem" }}>
        {mainTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Scope details row */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                background: opsTheme.surfaceInset,
                border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                fontSize: "0.813rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span style={{ opacity: 0.65 }}>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¬Ã˜Â§Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å :</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.currentDomain}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>Ã˜Â§Ã™â€žÃ™â€ Ã˜Â·Ã˜Â§Ã™â€š:</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.scope}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>Ã™â€ Ã™â€¦Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â­Ã™â€žÃ˜Â©:</span>{" "}
                <strong>{ADMIN_SCOPE_DETAILS.envMode}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>Auth Ã˜Â­Ã™â€šÃ™Å Ã™â€šÃ™Å :</span>{" "}
                <strong style={{ color: opsTheme.danger }}>{ADMIN_SCOPE_DETAILS.authType}</strong>
              </div>
            </div>

            {/* Middle ownership boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))", gap: "1.25rem" }}>
              <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
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

              <div style={{ background: opsTheme.surface, border: `1px solid var(--border-color, colorRoles.surfaceBase)`, borderRadius: "1rem", padding: "1.5rem" }}>
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
                    background: opsTheme.surface,
                    border: `1px solid var(--border-color, colorRoles.surfaceBase)`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>{card.title}</div>
                  <strong style={{ fontSize: "1.25rem", color: opsTheme.text, margin: "0.15rem 0" }}>
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Status Footer (ownership bar) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
        <span>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’: <strong>{ADMIN_STATUS_FOOTER.owner}</strong></span>
        <span>Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¯Ã™â€šÃ™Å Ã™â€š: <strong>{ADMIN_STATUS_FOOTER.ownerPath}</strong></span>
        <span>Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€ Ã˜Â´Ã˜Â·Ã˜Â©: {ADMIN_STATUS_FOOTER.activeServices}</span>
        <span style={{ marginInlineStart: "auto", color: "var(--status-success-strong, colorRoles.brandStructure)", fontWeight: 600 }}>{ADMIN_STATUS_FOOTER.status}</span>
      </div>
    </DataTablePageFrame>
  );
}



