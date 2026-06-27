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
        <div
          style={{
            background: "#FFF",
            border: "1px solid #E2E8F0",
            borderRadius: "1rem",
            padding: "1.5rem",
            margin: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", fontWeight: 700 }}>
                إدارة المتغيرات والسياسات
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6 }}>
                مراجعة وتعديل سياسات المنصة ومتغيراتها التشغيلية. كل تغيير يخضع للتدقيق ولا يُطبَّق على الخوادم الحية.
              </p>
            </div>

            {/* Inner Stats Card Row */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ background: "#F1F5F9", padding: "0.5rem 1rem", borderRadius: "0.5rem", textAlign: "center", minWidth: "4.5rem" }}>
                <strong style={{ fontSize: "1.1rem" }}>{innerStats.total}</strong>
                <div style={{ fontSize: "0.7rem", opacity: 0.65 }}>إجمالي</div>
              </div>
              <div style={{ background: "#F1F5F9", padding: "0.5rem 1rem", borderRadius: "0.5rem", textAlign: "center", minWidth: "4.5rem" }}>
                <strong style={{ fontSize: "1.1rem" }}>{innerStats.linked}</strong>
                <div style={{ fontSize: "0.7rem", opacity: 0.65 }}>مرتبط</div>
              </div>
              <div style={{ background: "#F1F5F9", padding: "0.5rem 1rem", borderRadius: "0.5rem", textAlign: "center", minWidth: "4.5rem" }}>
                <strong style={{ fontSize: "1.1rem" }}>{innerStats.contractRequired}</strong>
                <div style={{ fontSize: "0.7rem", opacity: 0.65 }}>يتطلب عقد</div>
              </div>
              <div style={{ background: "#F1F5F9", padding: "0.5rem 1rem", borderRadius: "0.5rem", textAlign: "center", minWidth: "4.5rem" }}>
                <strong style={{ fontSize: "1.1rem" }}>{innerStats.wltCount}</strong>
                <div style={{ fontSize: "0.7rem", opacity: 0.65 }}>WLT</div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 24rem",
              gap: "2rem",
              marginTop: "2rem",
              alignItems: "start",
            }}
          >
            {/* Left box details tool */}
            <div style={{ border: "2px dashed #E2E8F0", borderRadius: "0.75rem", padding: "3rem", textAlign: "center", opacity: 0.6, fontSize: "0.875rem" }}>
              اختر عنصراً من القائمة لعرض التفاصيل وأدوات التعديل.
            </div>

            {/* Right box empty list */}
            <div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ background: "#FF500D", color: "#FFF", padding: "0.2rem 0.625rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                  الكل
                </span>
              </div>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "0.75rem", padding: "2rem", textAlign: "center", opacity: 0.7, fontSize: "0.85rem" }}>
                لا توجد عناصر لهذه الطبقة. غيّر المجال أو طبقة الأسقفية.
              </div>
            </div>
          </div>
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

      {/* ── Placeholders for other technical tabs ── */}
      {mainTab !== "variables" && mainTab !== "providers" && mainTab !== "services" && (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <CpStatePanel
            role="status"
            title={PLATFORM_MAIN_TABS.find((t) => t.id === mainTab)?.label ?? ""}
            description="هذا القسم قيد التطوير والمراقبة الفنية حالياً."
          />
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
        <span>المالك: <strong>{PLATFORM_OWNERSHIP.owner}</strong></span>
        <span>والتدقيق: <strong>{PLATFORM_OWNERSHIP.ownerPath}</strong></span>
        <span>الخدمات النشطة: {PLATFORM_OWNERSHIP.activeServices}</span>
        <span style={{ marginInlineStart: "auto", color: "#065F46", fontWeight: 600 }}>{PLATFORM_OWNERSHIP.status}</span>
      </div>
    </DataTablePageFrame>
  );
}
