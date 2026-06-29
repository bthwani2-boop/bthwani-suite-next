"use client";

import { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpSearchInput,
  CpSelectableTableRow,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  useCatalogApprovalController,
  usePartnerCatalogController,
  CATALOG_MAIN_TABS,
  CATALOG_SCOPES,
  CATALOG_SMART_FILTERS,
  CATALOG_TOOLBAR_ACTIONS,
  getCatalogSubTabsForMain,
  filterSubmissionsByScope,
  buildCatalogSubmissionViewModel,
  buildCatalogKpiMetrics,
  buildCatalogPublicationReadiness,
  buildCatalogBreadcrumb,
  type CatalogMainTabId,
  type CatalogSubTabId,
  type CatalogScopeId,
  type CatalogSmartFilterId,
} from "../../shared/catalog";
import { opsTheme } from "../../shared/operations";
import { CatalogWorkspaceRouter } from "./drawers/CatalogWorkspaceDrawers";
import type { CatalogWorkspaceState } from "./drawers/CatalogWorkspaceDrawers";

// â”€â”€â”€ Inline badge â€” no external dependency needed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type StatusTone = "warning" | "success" | "danger" | "neutral";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneColors: Record<StatusTone, { bg: string; color: string }> = {
    warning: { bg: opsTheme.warningSurface, color: 'var(--status-warning-text, #92400E)' },
    success: { bg: opsTheme.successSurface, color: 'var(--status-success-strong, #065F46)' },
    danger:  { bg: opsTheme.dangerSurface, color: 'var(--status-danger-strong, #991B1B)' },
    neutral: { bg: 'var(--surface-muted, #F1F5F9)', color: opsTheme.textMuted },
  };
  const { bg, color } = toneColors[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// â”€â”€â”€ Tab button (toggle style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabButton({
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
        borderRadius: "0.5rem",
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

// â”€â”€â”€ Main Tab bar (underline style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CatalogDashboardScreen() {
  const identity = useIdentitySession();
  const controller = useCatalogApprovalController(identity.state.kind);
  const catalogController = usePartnerCatalogController(identity.state.kind);

  const [mainTab, setMainTab] = useState<CatalogMainTabId>("catalog");
  const [subTab, setSubTab] = useState<CatalogSubTabId>("master-registry");
  const [scopeFilter, setScopeFilter] = useState<CatalogScopeId>("all");
  const [smartFilter, setSmartFilter] = useState<CatalogSmartFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonByStore, setReasonByStore] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [workspaceState, setWorkspaceState] = useState<CatalogWorkspaceState | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const subTabs = getCatalogSubTabsForMain(mainTab);

  const publicationReadiness = useMemo(() => {
    if (catalogController.state.kind !== "success") return null;
    return buildCatalogPublicationReadiness(
      catalogController.state.catalog.products,
      catalogController.state.catalog.categories,
    );
  }, [catalogController.state]);

  const metrics = useMemo(() => {
    const submissions =
      controller.state.kind === "success" ? controller.state.submissions : [];
    return buildCatalogKpiMetrics(submissions, publicationReadiness?.totalProducts);
  }, [controller.state, publicationReadiness]);

  const filteredSubmissions = useMemo(() => {
    if (controller.state.kind !== "success") return [];
    const scoped = filterSubmissionsByScope(controller.state.submissions, scopeFilter);
    const searched = searchQuery.trim()
      ? scoped.filter((s) =>
          s.storeId.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : scoped;
    return searched.map(buildCatalogSubmissionViewModel);
  }, [controller.state, scopeFilter, searchQuery]);

  const breadcrumb = buildCatalogBreadcrumb(mainTab, subTab, filteredSubmissions.length);

  // â”€â”€ Auth gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <h2 style={{ margin: 0, textAlign: "right" }}>ÙƒØªØ§Ù„ÙˆØ¬ DSH</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            ÙŠØªØ·Ù„Ø¨ Ø­Ø³Ø§Ø¨ operator Ù…ØµØ±Ø­ Ø¨Ù‡ Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬Ø§Øª.
          </p>
        </div>
        <CpTextInput
          value={username}
          onChange={setUsername}
          placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…"
          aria-label="Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…"
        />
        <CpTextInput
          value={password}
          onChange={setPassword}
          placeholder="ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±"
          type="password"
          aria-label="ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±"
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton
            disabled={
              username.trim().length === 0 ||
              password.length < 4 ||
              identity.state.kind === "authenticating"
            }
            onClick={() => void identity.login(username.trim(), password)}
            style={{ flex: 1 }}
          >
            {identity.state.kind === "authenticating" ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚â€¦" : "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„"}
          </CpButton>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            ØªØ¬Ø§ÙˆØ² (Ù…Ø·ÙˆØ±)
          </CpButton>
        </div>
        {identity.state.kind === "error" && (
          <p role="alert" style={{ color: opsTheme.danger, textAlign: "right" }}>
            {identity.state.message}
          </p>
        )}
      </section>
    );
  }

  const isLoading = controller.state.kind === "loading";
  const hasError = controller.state.kind === "error";
  const isEmpty = controller.state.kind === "empty";

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="ÙƒØªØ§Ù„ÙˆØ¬ DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„ÙØ¦Ø§Øª ÙˆÙ…Ø®Ø§Ø·Ø± Ø§Ù„ØªØ¨Ù†ÙŠ Ø¹Ø¨Ø± Ø§Ù„Ø£Ø³Ø·Ø­
          </p>

          {/* â”€â”€ KPI Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <CpKpiStrip>
            <CpKpiCard label="ØªØ¹Ø±Ø¶Ø§Øª Ø§Ù„Ù†Ø´Ø§Ø·"    value={metrics.activityExposures} />
            <CpKpiCard label="Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø¹ØªÙ…Ø§Ø¯"    value={metrics.pendingApproval} />
            <CpKpiCard label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª"   value={metrics.totalProducts.toLocaleString("ar-YE")} />
            {publicationReadiness !== null && (
              <CpKpiCard label="Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ù†Ø´Ø±" value={`${publicationReadiness.readyPercent}%`} />
            )}
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={
        isLoading ? (
          <CpStatePanel role="status" title="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬â€¦" />
        ) : hasError ? (
          <CpStatePanel
            role="alert"
            title="ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬"
            description={(controller.state as { message: string }).message}
          />
        ) : undefined
      }
    >
      {/* â”€â”€ Main Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav
        dir="rtl"
        aria-label="ØªØ¨ÙˆÙŠØ¨Ø§Øª Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem",
          gap: "0.25rem",
          marginBottom: "0.75rem",
        }}
      >
        {CATALOG_MAIN_TABS.map((t) => (
          <MainTabButton
            key={t.id}
            active={mainTab === t.id}
            onClick={() => {
              setMainTab(t.id);
              const subs = getCatalogSubTabsForMain(t.id);
              if (subs.length > 0) setSubTab(subs[0]!.id);
            }}
          >
            {t.label}
          </MainTabButton>
        ))}
      </nav>

      {/* â”€â”€ Sub-Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {subTabs.length > 0 && (
        <CpFilterBar label="Ø§Ù„ØªØ¨ÙˆÙŠØ¨Ø§Øª Ø§Ù„ÙØ±Ø¹ÙŠØ©">
          {subTabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </CpFilterBar>
      )}

      {/* â”€â”€ Scope Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <CpFilterBar label="Ù†Ø·Ø§Ù‚ Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬">
        {CATALOG_SCOPES.map((f) => (
          <TabButton
            key={f.id}
            active={scopeFilter === f.id}
            onClick={() => setScopeFilter(f.id)}
          >
            {f.label}
          </TabButton>
        ))}
      </CpFilterBar>

      {/* â”€â”€ Smart Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <CpFilterBar label="ØªØµÙÙŠØ© Ø°ÙƒÙŠØ©">
        <span style={{ fontSize: "0.75rem", opacity: 0.65, paddingInlineEnd: "0.5rem" }}>
          ØªØµÙÙŠØ© Ø°ÙƒÙŠØ©:
        </span>
        {CATALOG_SMART_FILTERS.map((f) => (
          <TabButton
            key={f.id}
            active={smartFilter === f.id}
            onClick={() => setSmartFilter(f.id)}
          >
            {f.label}
          </TabButton>
        ))}
        <span style={{ marginInlineStart: "auto", display: "flex", gap: "0.5rem" }}>
          {CATALOG_TOOLBAR_ACTIONS.map((action) => (
            <CpButton
              key={action.id}
              onClick={() => {
                if (action.id === "quick-suspend" || action.id === "set-image-policy") {
                  setWorkspaceState({ workspace: "bulk-operations" });
                } else {
                  setWorkspaceState({ workspace: "taxonomy-governance" });
                }
              }}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.625rem",
                background: "color-mix(in srgb, currentColor 8%, transparent)",
                border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              {action.label}
            </CpButton>
          ))}
        </span>
      </CpFilterBar>

      {/* â”€â”€ Search + Bulk Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <CpFilterBar label="Ø¨Ø­Ø« ÙˆØ¥Ø¬Ø±Ø§Ø¡Ø§Øª">
        {selectedIds.size > 0 && (
          <CpButton onClick={() => setSelectedIds(new Set())}>
            Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø¬Ù…Ø§Ø¹ÙŠØ© ({selectedIds.size})
          </CpButton>
        )}
        <CpSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Ø¨Ø­Ø« Ø´Ø§Ù…Ù„ Ø¨Ø§Ù„Ù…Ù†ØªØ¬ Ø£Ùˆ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯â€¦"
          wide
          aria-label="Ø¨Ø­Ø« ÙÙŠ Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬"
        />
        <span style={{ fontSize: "0.813rem", opacity: 0.65 }}>Ø§Ù„ÙØ¦Ø©: Ø§Ù„ÙƒÙ„</span>
      </CpFilterBar>

      {/* â”€â”€ Breadcrumb â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        dir="rtl"
        style={{
          padding: "0.375rem 1rem",
          fontSize: "0.75rem",
          opacity: 0.65,
        }}
        aria-label="Ù…Ø³Ø§Ø± Ø§Ù„ØªÙ†Ù‚Ù„"
      >
        {breadcrumb}
      </div>

      {mainTab === "publishing" && publicationReadiness !== null && (
        <section
          dir="rtl"
          aria-label="Ø¬Ø§Ù‡Ø²ÙŠØ© Ù†Ø´Ø± Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬"
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderBlock: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
            background: "color-mix(in srgb, currentColor 3%, transparent)",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <strong>Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ù†Ø´Ø±</strong>
            <span style={{ fontSize: "0.813rem", opacity: 0.7 }}>
              {publicationReadiness.readyProducts} Ø¬Ø§Ù‡Ø² Ù…Ù† {publicationReadiness.totalProducts} Ù…Ù†ØªØ¬
            </span>
            <span style={{ fontSize: "0.813rem", opacity: 0.7 }}>
              {publicationReadiness.blockedProducts} ÙŠØ­ØªØ§Ø¬ Ø¥ØºÙ„Ø§Ù‚ Ù…ØªØ·Ù„Ø¨Ø§Øª
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.5rem" }}>
            {publicationReadiness.requirements.map((requirement) => (
              <div
                key={requirement.id}
                style={{
                  display: "grid",
                  gap: "0.25rem",
                  padding: "0.625rem",
                  border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
                  borderRadius: "0.5rem",
                  background: "Canvas",
                }}
              >
                <strong style={{ fontSize: "0.813rem" }}>{requirement.label}</strong>
                <span style={{ fontSize: "0.75rem", opacity: 0.68 }}>
                  {requirement.satisfiedCount}/{publicationReadiness.totalProducts} Â· {requirement.percent}%
                  {requirement.blockedCount > 0 ? ` Â· ${requirement.blockedCount} Ù…Ø­Ø¬ÙˆØ¨` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* â”€â”€ State Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isEmpty && !isLoading && (
        <CpStatePanel role="status" title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¯Ø®Ø§Ù„Ø§Øª ÙƒØªØ§Ù„ÙˆØ¬ Ø¨Ø¹Ø¯." />
      )}

      {controller.state.kind === "success" &&
        filteredSubmissions.length === 0 &&
        searchQuery.trim() && (
          <CpStatePanel
            role="status"
            title={`Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù„Ù€ "${searchQuery}"`}
          />
        )}

      {/* â”€â”€ Data Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {controller.state.kind === "success" && (
        <CpTable aria-label="Ø¬Ø¯ÙˆÙ„ ÙƒØªØ§Ù„ÙˆØ¬Ø§Øª Ø§Ù„Ù…ØªØ§Ø¬Ø±">
          <thead>
            <tr dir="rtl">
              <CpTableHeaderCell style={{ width: "2rem" }}>
                <input
                  type="checkbox"
                  aria-label="ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„"
                  checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked
                        ? new Set(filteredSubmissions.map((s) => s.id))
                        : new Set(),
                    )
                  }
                />
              </CpTableHeaderCell>
              <CpTableHeaderCell>ØµÙˆØ±Ø©</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„Ù…Ù†ØªØ¬</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„ÙØ¦Ø©</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„ØªØµÙ†ÙŠÙ</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„Ù…Ø¹Ø±Ù / Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„Ø³Ø¹Ø±</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„Ø³ÙŠØ§Ø³Ø©</CpTableHeaderCell>
              <CpTableHeaderCell>Ø§Ù„Ø­Ø§Ù„Ø©</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody dir="rtl">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    opacity: 0.5,
                    fontSize: "0.875rem",
                  }}
                >
                  Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø§Ø¹ØªÙ…Ø§Ø¯.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((vm) => (
                <CpSelectableTableRow
                  key={vm.id}
                  selected={selectedIds.has(vm.id)}
                  onClick={() =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(vm.id)) next.delete(vm.id);
                      else next.add(vm.id);
                      return next;
                    })
                  }
                  onDoubleClick={() => setWorkspaceState({ workspace: "item-detail", productId: vm.id })}
                >
                  <CpTableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(vm.id)}
                      onChange={() => {}}
                      aria-label={`ØªØ­Ø¯ÙŠØ¯ ${vm.storeId}`}
                    />
                  </CpTableCell>
                  {/* Image */}
                  <CpTableCell>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#F1F5F9",
                        border: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                      }}
                      aria-hidden="true"
                    >
                      ðŸ“¦
                    </div>
                  </CpTableCell>
                  {/* Product / storeId */}
                  <CpTableCell>
                    <strong style={{ fontSize: "0.875rem" }}>{vm.storeId}</strong>
                  </CpTableCell>
                  {/* Category */}
                  <CpTableCell style={{ opacity: 0.55, fontSize: "0.813rem" }}>â€”</CpTableCell>
                  {/* Classification */}
                  <CpTableCell style={{ opacity: 0.55, fontSize: "0.813rem" }}>Ø±Ø¦ÙŠØ³ÙŠ</CpTableCell>
                  {/* ID / Barcode */}
                  <CpTableCell>
                    <code style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {vm.id.slice(0, 12)}â€¦
                    </code>
                  </CpTableCell>
                  {/* Price (revision) */}
                  <CpTableCell>
                    <strong>Ù†Ø³Ø®Ø© {vm.revision}</strong>
                  </CpTableCell>
                  {/* Policy (reason input) */}
                  <CpTableCell>
                    {vm.isPending ? (
                      <CpTextInput
                        value={reasonByStore[vm.storeId] ?? ""}
                        onChange={(value) =>
                          setReasonByStore((current) => ({
                            ...current,
                            [vm.storeId]: value,
                          }))
                        }
                        placeholder="Ø³Ø¨Ø¨ Ø§Ù„Ù‚Ø±Ø§Ø±â€¦"
                        aria-label={`Ø³Ø¨Ø¨ Ù‚Ø±Ø§Ø± ${vm.storeId}`}
                      />
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: "0.813rem" }}>â€”</span>
                    )}
                  </CpTableCell>
                  {/* Status + Actions */}
                  <CpTableCell>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start" }}>
                      <StatusBadge label={vm.statusLabel} tone={vm.statusTone} />
                      {vm.isPending && (
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <CpButton
                            disabled={
                              (reasonByStore[vm.storeId] ?? "").trim().length < 3 ||
                              controller.action === "submitting"
                            }
                            onClick={() =>
                              void controller.decide({
                                storeId: vm.storeId,
                                decision: "approved",
                                reason: (reasonByStore[vm.storeId] ?? "").trim(),
                              })
                            }
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              background: "#D1FAE5",
                              color: "var(--status-success-strong, #065F46)",
                              border: "1px solid #6EE7B7",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                            }}
                          >
                            Ø§Ø¹ØªÙ…Ø§Ø¯
                          </CpButton>
                          <CpButton
                            disabled={
                              (reasonByStore[vm.storeId] ?? "").trim().length < 3 ||
                              controller.action === "submitting"
                            }
                            onClick={() =>
                              void controller.decide({
                                storeId: vm.storeId,
                                decision: "rejected",
                                reason: (reasonByStore[vm.storeId] ?? "").trim(),
                              })
                            }
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              background: "#FEE2E2",
                              color: "var(--status-danger-strong, #991B1B)",
                              border: "1px solid #FCA5A5",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                            }}
                          >
                            Ø±ÙØ¶
                          </CpButton>
                        </div>
                      )}
                    </div>
                  </CpTableCell>
                </CpSelectableTableRow>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={9}
                style={{
                  padding: "0.625rem 0.75rem",
                  fontSize: "0.813rem",
                  opacity: 0.55,
                  borderTop: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
                  direction: "rtl",
                }}
              >
                Ø§Ù„Ø³Ø§Ø¨Ù‚ | ØµÙØ­Ø© 1 Ù…Ù† 1 | Ø§Ù„ØªØ§Ù„ÙŠ &nbsp;Â·&nbsp; {filteredSubmissions.length} Ø³Ø¬Ù„
              </td>
            </tr>
          </tfoot>
        </CpTable>
      )}
      <CatalogWorkspaceRouter
        workspaceState={workspaceState}
        products={
          catalogController.state.kind === "success"
            ? catalogController.state.catalog.products
            : []
        }
        selectedProductIds={Array.from(selectedIds)}
        onClose={() => setWorkspaceState(null)}
        onProposal={(p) => setProposals((prev) => [...prev, p])}
      />
    </DataTablePageFrame>
  );
}

