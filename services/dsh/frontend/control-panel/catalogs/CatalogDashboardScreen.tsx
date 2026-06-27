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
  CATALOG_MAIN_TABS,
  CATALOG_SCOPES,
  CATALOG_SMART_FILTERS,
  CATALOG_TOOLBAR_ACTIONS,
  getCatalogSubTabsForMain,
  filterSubmissionsByScope,
  buildCatalogSubmissionViewModel,
  buildCatalogKpiMetrics,
  buildCatalogBreadcrumb,
  type CatalogMainTabId,
  type CatalogSubTabId,
  type CatalogScopeId,
  type CatalogSmartFilterId,
} from "../../shared/catalog";

// ─── Inline badge — no external dependency needed ────────────────────────────

type StatusTone = "warning" | "success" | "danger" | "neutral";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneColors: Record<StatusTone, { bg: string; color: string }> = {
    warning: { bg: "#FFF3CD", color: "#92400E" },
    success: { bg: "#D1FAE5", color: "#065F46" },
    danger:  { bg: "#FEE2E2", color: "#991B1B" },
    neutral: { bg: "#F1F5F9", color: "#475569" },
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

// ─── Tab button (toggle style) ────────────────────────────────────────────────

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

// ─── Main Tab bar (underline style) ──────────────────────────────────────────

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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function CatalogDashboardScreen() {
  const identity = useIdentitySession();
  const controller = useCatalogApprovalController(identity.state.kind);

  const [mainTab, setMainTab] = useState<CatalogMainTabId>("catalog");
  const [subTab, setSubTab] = useState<CatalogSubTabId>("master-registry");
  const [scopeFilter, setScopeFilter] = useState<CatalogScopeId>("all");
  const [smartFilter, setSmartFilter] = useState<CatalogSmartFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonByStore, setReasonByStore] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const subTabs = getCatalogSubTabsForMain(mainTab);

  const metrics = useMemo(() => {
    const submissions =
      controller.state.kind === "success" ? controller.state.submissions : [];
    return buildCatalogKpiMetrics(submissions, 14582);
  }, [controller.state]);

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

  // ── Auth gate ───────────────────────────────────────────────────────────────
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
          <h2 style={{ margin: 0, textAlign: "right" }}>كتالوج DSH</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به لإدارة الكتالوجات.
          </p>
        </div>
        <CpTextInput
          value={username}
          onChange={setUsername}
          placeholder="اسم المستخدم"
          aria-label="اسم المستخدم"
        />
        <CpTextInput
          value={password}
          onChange={setPassword}
          placeholder="كلمة المرور"
          type="password"
          aria-label="كلمة المرور"
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
            {identity.state.kind === "authenticating" ? "جاري التحقق…" : "تسجيل الدخول"}
          </CpButton>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && (
          <p role="alert" style={{ color: "#DC2626", textAlign: "right" }}>
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
        <CpPageHeader title="كتالوج DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            إدارة المنتجات والفئات ومخاطر التبني عبر الأسطح
          </p>

          {/* ── KPI Strip ─────────────────────────────────────────────── */}
          <CpKpiStrip>
            <CpKpiCard label="تعرضات النشاط"    value={metrics.activityExposures} />
            <CpKpiCard label="بانتظار اعتماد"    value={metrics.pendingApproval} />
            <CpKpiCard label="إجمالي المنتجات"   value={metrics.totalProducts.toLocaleString("ar-YE")} />
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={
        isLoading ? (
          <CpStatePanel role="status" title="جاري تحميل الكتالوج…" />
        ) : hasError ? (
          <CpStatePanel
            role="alert"
            title="تعذر تحميل بيانات الكتالوج"
            description={(controller.state as { message: string }).message}
          />
        ) : undefined
      }
    >
      {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
      <nav
        dir="rtl"
        aria-label="تبويبات الكتالوج الرئيسية"
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

      {/* ── Sub-Tabs ────────────────────────────────────────────────────────── */}
      {subTabs.length > 0 && (
        <CpFilterBar label="التبويبات الفرعية">
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

      {/* ── Scope Filters ────────────────────────────────────────────────────── */}
      <CpFilterBar label="نطاق الكتالوج">
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

      {/* ── Smart Filters ────────────────────────────────────────────────────── */}
      <CpFilterBar label="تصفية ذكية">
        <span style={{ fontSize: "0.75rem", opacity: 0.65, paddingInlineEnd: "0.5rem" }}>
          تصفية ذكية:
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

      {/* ── Search + Bulk Actions ────────────────────────────────────────────── */}
      <CpFilterBar label="بحث وإجراءات">
        {selectedIds.size > 0 && (
          <CpButton onClick={() => setSelectedIds(new Set())}>
            إجراءات جماعية ({selectedIds.size})
          </CpButton>
        )}
        <CpSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث شامل بالمنتج أو الباركود…"
          wide
          aria-label="بحث في الكتالوج"
        />
        <span style={{ fontSize: "0.813rem", opacity: 0.65 }}>الفئة: الكل</span>
      </CpFilterBar>

      {/* ── Breadcrumb ────────────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          padding: "0.375rem 1rem",
          fontSize: "0.75rem",
          opacity: 0.65,
        }}
        aria-label="مسار التنقل"
      >
        {breadcrumb}
      </div>

      {/* ── State Views ────────────────────────────────────────────────────────── */}
      {isEmpty && !isLoading && (
        <CpStatePanel role="status" title="لا توجد إدخالات كتالوج بعد." />
      )}

      {controller.state.kind === "success" &&
        filteredSubmissions.length === 0 &&
        searchQuery.trim() && (
          <CpStatePanel
            role="status"
            title={`لا توجد نتائج لـ "${searchQuery}"`}
          />
        )}

      {/* ── Data Table ────────────────────────────────────────────────────────── */}
      {controller.state.kind === "success" && (
        <CpTable aria-label="جدول كتالوجات المتاجر">
          <thead>
            <tr dir="rtl">
              <CpTableHeaderCell style={{ width: "2rem" }}>
                <input
                  type="checkbox"
                  aria-label="تحديد الكل"
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
              <CpTableHeaderCell>صورة</CpTableHeaderCell>
              <CpTableHeaderCell>المنتج</CpTableHeaderCell>
              <CpTableHeaderCell>الفئة</CpTableHeaderCell>
              <CpTableHeaderCell>التصنيف</CpTableHeaderCell>
              <CpTableHeaderCell>المعرف / الباركود</CpTableHeaderCell>
              <CpTableHeaderCell>السعر</CpTableHeaderCell>
              <CpTableHeaderCell>السياسة</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
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
                  لا توجد طلبات اعتماد.
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
                >
                  <CpTableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(vm.id)}
                      onChange={() => {}}
                      aria-label={`تحديد ${vm.storeId}`}
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
                      📦
                    </div>
                  </CpTableCell>
                  {/* Product / storeId */}
                  <CpTableCell>
                    <strong style={{ fontSize: "0.875rem" }}>{vm.storeId}</strong>
                  </CpTableCell>
                  {/* Category */}
                  <CpTableCell style={{ opacity: 0.55, fontSize: "0.813rem" }}>—</CpTableCell>
                  {/* Classification */}
                  <CpTableCell style={{ opacity: 0.55, fontSize: "0.813rem" }}>رئيسي</CpTableCell>
                  {/* ID / Barcode */}
                  <CpTableCell>
                    <code style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {vm.id.slice(0, 12)}…
                    </code>
                  </CpTableCell>
                  {/* Price (revision) */}
                  <CpTableCell>
                    <strong>نسخة {vm.revision}</strong>
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
                        placeholder="سبب القرار…"
                        aria-label={`سبب قرار ${vm.storeId}`}
                      />
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: "0.813rem" }}>—</span>
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
                              color: "#065F46",
                              border: "1px solid #6EE7B7",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                            }}
                          >
                            اعتماد
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
                              color: "#991B1B",
                              border: "1px solid #FCA5A5",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                            }}
                          >
                            رفض
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
                السابق | صفحة 1 من 1 | التالي &nbsp;·&nbsp; {filteredSubmissions.length} سجل
              </td>
            </tr>
          </tfoot>
        </CpTable>
      )}
    </DataTablePageFrame>
  );
}
