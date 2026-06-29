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
  PLATFORM_MAIN_TABS,
  PLATFORM_SCOPES,
  PLATFORM_OWNERSHIP,
  buildPlatformKpiMetrics,
  buildPlatformInnerStats,
  type PlatformMainTabId,
  type PlatformScopeId,
} from "../../shared/platform";
import { ProviderRegistryPanel } from "./ProviderRegistryPanel";
import { PlatformPoliciesScreen } from "./PlatformPoliciesScreen";
import { DshPlatformVarsWorkspace } from "./DshPlatformVarsWorkspace";
import {
  DshPlatformCanaryWorkspace,
  DshPlatformHealthWorkspace,
  DshPlatformRollbackWorkspace,
  DshPlatformOverviewWorkspace,
} from "./DshPlatformWorkspaces";

// ─── Main Tab button (underline style) ──────────────────────────────────────────

function MainTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      }}
    >
      {children}
    </button>
  );
}

// ─── Scope Tab button (pill style) ────────────────────────────────────────────

function ScopeTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        background: active ? "#FF500D" : "transparent",
        color: active ? "#FFF" : "currentColor",
        border: active ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        borderRadius: "999px",
        fontWeight: active ? 700 : 500,
        fontSize: "0.813rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function PlatformDashboardScreen() {
  const identity = useIdentitySession();

  const [mainTab, setMainTab] = useState<PlatformMainTabId>("variables");
  const [scopeTab, setScopeTab] = useState<PlatformScopeId>("dsh-ops");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const metrics = useMemo(() => buildPlatformKpiMetrics(), []);
  const innerStats = useMemo(() => buildPlatformInnerStats(), []);

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
          <h2 style={{ margin: 0, textAlign: "right" }}>منصة DSH السيادية</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به للوصول إلى لوحة التحكم الفنية للمنصة.
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
        <CpPageHeader title="منصة DSH السيادية">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            إدارة المتغيرات السيادية، والمزودين، وسياسات الإطلاق والتشغيل الآمن للمنصة.
          </p>

          {/* ── KPI Strip ─────────────────────────────────────────────── */}
          <CpKpiStrip>
            <CpKpiCard label="السياسات"            value={metrics.policiesCount} />
            <CpKpiCard label="المزودون"            value={metrics.providersCount} />
            <CpKpiCard label="الإطلاقات النشطة"    value={metrics.activeReleases} />
            <CpKpiCard label="التنبيهات والتدقيق"  value={metrics.alertsCount} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
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
        {PLATFORM_MAIN_TABS.map((t) => (
          <MainTabButton
            key={t.id}
            active={mainTab === t.id}
            onClick={() => setMainTab(t.id)}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* ── Scope Sub-Tabs (Pills) ────────────────────────────────────────── */}
      <CpFilterBar label="المجالات والطبقات">
        {PLATFORM_SCOPES.map((scope) => (
          <ScopeTabButton
            key={scope.id}
            active={scopeTab === scope.id}
            onClick={() => setScopeTab(scope.id)}
          >
            {scope.label}
          </ScopeTabButton>
        ))}
      </CpFilterBar>

      {/* ── Content View conditionally rendered by mainTab ───────────────── */}
      {mainTab === "variables" && (
        <div style={{ padding: "1rem" }}>
          <DshPlatformVarsWorkspace />
        </div>
      )}

      {mainTab === "providers" && (
        <div style={{ padding: "1rem" }}>
          <ProviderRegistryPanel />
        </div>
      )}

      {mainTab === "services" && (
        <div style={{ padding: "1rem" }}>
          <PlatformPoliciesScreen />
        </div>
      )}

      {mainTab === "canary" && <DshPlatformCanaryWorkspace />}

      {mainTab === "health" && <DshPlatformHealthWorkspace />}

      {mainTab === "rollback" && <DshPlatformRollbackWorkspace />}

      {mainTab === "overview" && <DshPlatformOverviewWorkspace />}

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
        <span>المالك: <strong>{PLATFORM_OWNERSHIP.owner}</strong></span>
        <span>والتدقيق: <strong>{PLATFORM_OWNERSHIP.ownerPath}</strong></span>
        <span>الخدمات النشطة: {PLATFORM_OWNERSHIP.activeServices}</span>
        <span style={{ marginInlineStart: "auto", color: 'var(--status-success-strong, #065F46)', fontWeight: 600 }}>{PLATFORM_OWNERSHIP.status}</span>
      </div>
    </DataTablePageFrame>
  );
}

