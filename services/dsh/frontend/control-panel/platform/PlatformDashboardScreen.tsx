"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState, useMemo } from "react";
import {
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpStatePanel,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  PLATFORM_MAIN_TABS,
  PLATFORM_OWNERSHIP,
  buildPlatformKpiMetrics,
  usePlatformControlRuntimeController,
  type PlatformRuntimeSnapshot,
  type PlatformMainTabId,
} from "../../shared/platform";
import { useControlPanelSession } from "../../shared/session/control-panel-session";
import { ProviderRegistryPanel } from "./ProviderRegistryPanel";
import { PlatformPoliciesScreen } from "./PlatformPoliciesScreen";
import { DshPlatformVarsWorkspace } from "./DshPlatformVarsWorkspace";
import {
  DshPlatformCanaryWorkspace,
  DshPlatformHealthWorkspace,
  DshPlatformRollbackWorkspace,
  DshPlatformOverviewWorkspace,
} from "./DshPlatformWorkspaces";
import { PlatformNotificationConfigScreen } from "../support/PlatformNotificationConfigScreen";

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
        borderBottom: active ? "2px solid colorRoles.brandAction" : "2px solid transparent",
        color: active ? colorRoles.brandAction : "currentColor",
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

function hasPlatformReadPermission(identity: { readonly permissions?: readonly { readonly service?: string; readonly surface?: string; readonly action?: string; readonly scope?: string }[] }): boolean {
  return identity.permissions?.some((permission) =>
    permission.surface === "control-panel" &&
    permission.scope === "all" &&
    (
      permission.action === "platform:read" ||
      permission.action === "*" ||
      (permission.service === "dsh" && permission.action === "*")
    )
  ) ?? false;
}

function metricsFromSnapshot(snapshot: PlatformRuntimeSnapshot | null) {
  if (!snapshot) return buildPlatformKpiMetrics();
  return {
    policiesCount: snapshot.variablesState,
    providersCount: snapshot.servicesState,
    activeReleases: snapshot.rolloutsState,
    alertsCount: snapshot.healthState,
  };
}

export function PlatformDashboardScreen() {
  const [mainTab, setMainTab] = useState<PlatformMainTabId>("variables");
  const { state } = useControlPanelSession();

  const canReadPlatform = state.kind === "authenticated" && hasPlatformReadPermission(state.identity);
  const runtime = usePlatformControlRuntimeController(canReadPlatform ? "authenticated" : "idle");
  const snapshot = runtime.state.kind === "success" ? runtime.state.snapshot : null;
  const metrics = useMemo(() => metricsFromSnapshot(snapshot), [snapshot]);

  if (!canReadPlatform) {
    return (
      <DataTablePageFrame
        dir="rtl"
        header={<CpPageHeader title="منصة DSH السيادية" />}
      >
        <div style={{ padding: "1rem" }}>
          <CpStatePanel
            role="alert"
            title="صلاحية المنصة مطلوبة"
            description="يتطلب هذا القسم صلاحية platform:read على لوحة التحكم. لا يتم عرض حالات أو متغيرات سيادية بدون حد صلاحيات صريح."
            code="PLATFORM_PERMISSION_REQUIRED"
          />
        </div>
      </DataTablePageFrame>
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
            <CpKpiCard label="السياسات" value={metrics.policiesCount} />
            <CpKpiCard label="المزودون" value={metrics.providersCount} />
            <CpKpiCard label="الإطلاقات" value={metrics.activeReleases} />
            <CpKpiCard label="الصحة والتدقيق" value={metrics.alertsCount} />
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

      {runtime.state.kind === "loading" && (
        <div style={{ padding: "1rem" }}>
          <CpStatePanel role="status" title="جاري تحميل حالة platform-control..." />
        </div>
      )}

      {runtime.state.kind === "error" && (
        <div style={{ padding: "1rem" }}>
          <CpStatePanel
            role="alert"
            title="تعذر تحميل حالة platform-control"
            description={runtime.state.message}
            code="PLATFORM_CONTROL_UNAVAILABLE"
          />
        </div>
      )}

      {snapshot && (
        <div style={{ padding: "1rem" }}>
          <CpStatePanel
            role="status"
            title={`حالة المنصة: ${snapshot.status}`}
            description={`Revision: ${snapshot.revision} — ${snapshot.evidence.join(" / ")}`}
            code={`health=${snapshot.healthState}; rollback=${snapshot.rollbackState}`}
          />
        </div>
      )}

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

      {mainTab === "notifications" && <PlatformNotificationConfigScreen />}

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
        <span style={{ marginInlineStart: "auto", color: colorRoles.danger, fontWeight: 700 }}>{PLATFORM_OWNERSHIP.status}</span>
      </div>
    </DataTablePageFrame>
  );
}
