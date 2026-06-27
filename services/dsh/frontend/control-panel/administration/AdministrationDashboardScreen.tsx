"use client";

import { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpStatePanel,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  ADMIN_MAIN_TABS,
  ADMIN_SCOPE_DETAILS,
  ADMIN_OWNERSHIP,
  ADMIN_BOTTOM_CARDS,
  ADMIN_STATUS_FOOTER,
  buildAdminKpiMetrics,
  type AdminMainTabId,
} from "../../shared/administration";
import { AdministrationScreen } from "./AdministrationScreen";

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
        borderBottom: active ? "2px solid #FF500D" : "2px solid transparent",
        color: active ? "#FF500D" : "currentColor",
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
            background: "#FEE2E2",
            color: "#991B1B",
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

export function AdministrationDashboardScreen() {
  const identity = useIdentitySession();

  const [mainTab, setMainTab] = useState<AdminMainTabId>("overview");

  const metrics = useMemo(() => buildAdminKpiMetrics(), []);

  // ── Auth gate ──────────────────────────────────────────────────────────────
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
          <h2 style={{ margin: 0, textAlign: "right" }}>الإدارة والصلاحيات</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به للوصول للتحكم بالوصول الفني.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز تسجيل الدخول (مطور)
          </CpButton>
        </div>
      </section>
    );
  }

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
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          color: "#B45309",
          borderRadius: "0.75rem",
          fontSize: "0.813rem",
          fontWeight: 600,
        }}
      >
        وضع تجريبي: جميع الإجراءات محاكاة محلية فقط. لا يتم تعديل صلاحيات حقيقية أو حسابات مستخدمين.
      </div>

      {/* ── Main Tab Navigation (underline style) ────────────────── */}
      <nav
        dir="rtl"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem",
          gap: "0.25rem",
          marginBottom: "0.75rem",
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

      {/* ── Content View conditionally rendered by mainTab ───────────────── */}
      {mainTab === "overview" && (
        <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Scope details row */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
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
              <strong style={{ color: "#E11D48" }}>{ADMIN_SCOPE_DETAILS.authType}</strong>
            </div>
          </div>

          {/* Middle ownership boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: "1rem", padding: "1.5rem" }}>
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

            <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: "1rem", padding: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700 }}>
                {ADMIN_OWNERSHIP.platformRelationTitle}
              </h4>
              <p style={{ margin: 0, fontSize: "0.813rem", opacity: 0.7, lineHeight: 1.5 }}>
                {ADMIN_OWNERSHIP.platformRelationDesc}
              </p>
            </div>
          </div>

          {/* Bottom Cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
            {ADMIN_BOTTOM_CARDS.map((card) => (
              <div
                key={card.id}
                style={{
                  background: "#FFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>{card.title}</div>
                <strong style={{ fontSize: "1.25rem", color: "#1E293B", margin: "0.15rem 0" }}>
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

      {/* Render sub-screens from original screens under appropriate tabs */}
      {mainTab !== "overview" && (
        <div style={{ padding: "0 1rem 1rem" }}>
          <AdministrationScreen />
        </div>
      )}

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
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span>المالك: <strong>{ADMIN_STATUS_FOOTER.owner}</strong></span>
        <span>والتدقيق: <strong>{ADMIN_STATUS_FOOTER.ownerPath}</strong></span>
        <span>الخدمات النشطة: {ADMIN_STATUS_FOOTER.activeServices}</span>
        <span style={{ marginInlineStart: "auto", color: "#065F46", fontWeight: 600 }}>{ADMIN_STATUS_FOOTER.status}</span>
      </div>
    </DataTablePageFrame>
  );
}
