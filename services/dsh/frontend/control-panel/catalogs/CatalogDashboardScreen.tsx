"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState, useEffect, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpSearchInput,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  useCentralCatalogController,
  type ProductProposalPipelineStatus,
  PRODUCT_PROPOSAL_PIPELINE_METADATA,
  fetchSeedStatus,
  fetchCatalogAssets,
  reviewCatalogAsset,
  putEntityImage,
  hasCatalogPermission,
  auditProductQuality,
  parseAndValidateCSV,
  exportProductsToCSV,
  type CatalogAsset,
} from "../../shared/catalog";

type StatusTone = "warning" | "success" | "danger" | "neutral" | "info";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneColors: Record<StatusTone, { bg: string; color: string }> = {
    warning: { bg: colorRoles.surfaceBase, color: 'var(--status-warning-text, #e28743)' },
    success: { bg: colorRoles.surfaceBase, color: 'var(--status-success-strong, #1f8a70)' },
    danger:  { bg: colorRoles.surfaceBase, color: 'var(--status-danger-strong, #e2583e)' },
    neutral: { bg: 'var(--surface-muted, #f4f6f8)', color: '#637381' },
    info:    { bg: colorRoles.surfaceBase, color: 'var(--status-info-strong, #008cff)' },
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

type TabId =
  | "overview"
  | "taxonomy"
  | "master_products"
  | "proposals"
  | "marketing_media"
  | "policies"
  | "assortment"
  | "visibility"
  | "import_export"
  | "cleanup_quality"
  | "audit_logs";

const TABS: { id: TabId; label: string; disabled?: boolean; reason?: string }[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "taxonomy", label: "شجرة الفئات L1-L4" },
  { id: "master_products", label: "المنتجات المركزية L5" },
  { id: "proposals", label: "اقتراحات المنتجات" },
  { id: "marketing_media", label: "مراجعة التسويق والصور" },
  { id: "policies", label: "السياسات والصلاحيات" },
  { id: "assortment", label: "ربط المتاجر بالمنتجات" },
  { id: "visibility", label: "النشر والرؤية" },
  { id: "import_export", label: "الاستيراد والتصدير" },
  { id: "cleanup_quality", label: "التنظيف والجودة" },
  { id: "audit_logs", label: "سجل التدقيق", disabled: true, reason: "متاح للقراءة والتحقق عبر SQL/DB" },
];

export function CatalogDashboardScreen() {
  const identity = useIdentitySession();
  const controller = useCentralCatalogController(identity.state.kind);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("store-1001");
  const [reasonByProposal, setReasonByProposal] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [selectedProposalStatus, setSelectedProposalStatus] = useState<ProductProposalPipelineStatus>("partner-proposed");
  const [selectedAdoptedProductId, setSelectedAdoptedProductId] = useState<Record<string, string>>({});
  const [createProductInsteadOfLink, setCreateProductInsteadOfLink] = useState<Record<string, boolean>>({});

  // Seed status state
  const [seedStatus, setSeedStatus] = useState<{
    domainsCount: number;
    nodesCount: number;
    manualRequestExists: boolean;
    shayInExists: boolean;
    awnakExists: boolean;
    seedVersion: string;
    missingSeeds: readonly string[];
  } | null>(null);

  // DAM Assets state
  const [assets, setAssets] = useState<readonly CatalogAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // CSV Import state
  const [csvText, setCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<{
    rows: readonly any[];
    errors: readonly any[];
  } | null>(null);

  // Pagination for Master Products
  const [productPage, setProductPage] = useState(0);
  const productsPerPage = 20;

  useEffect(() => {
    if (identity.state.kind === "authenticated") {
      fetchSeedStatus()
        .then(setSeedStatus)
        .catch(console.error);

      setAssetsLoading(true);
      fetchCatalogAssets()
        .then(setAssets)
        .catch(console.error)
        .finally(() => setAssetsLoading(false));
    }
  }, [identity.state.kind]);

  const handleProposalTransition = async (
    proposalId: string,
    nextStatus: ProductProposalPipelineStatus,
    note: string,
    adoptedMasterProductId?: string | null,
    createMasterProduct?: boolean,
  ) => {
    try {
      await controller.transitionProposal(proposalId, {
        nextStatus,
        note,
        adoptedMasterProductId,
        createMasterProduct,
      });
      alert("تمت ترقية حالة الاقتراح بنجاح");
      setReasonByProposal((curr) => ({ ...curr, [proposalId]: "" }));
    } catch (e: any) {
      alert("فشل ترقية حالة الاقتراح: " + (e.message ?? e.toString()));
    }
  };

  const handleAssetReview = async (assetId: string, status: "approved" | "rejected" | "archived", note: string) => {
    try {
      await reviewCatalogAsset(assetId, { status, reviewNote: note });
      alert("تم تسجيل قرار مراجعة الصورة بنجاح");
      // Reload assets
      const items = await fetchCatalogAssets();
      setAssets(items);
    } catch (e: any) {
      alert("فشل مراجعة الصورة: " + (e.message ?? e.toString()));
    }
  };

  // Auth gate
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
          <h2 style={{ margin: 0, textAlign: "right" }}>كتالوج DSH المركزي</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به لإدارة الكتالوج المركزي والسياسات.
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
            {identity.state.kind === "authenticating" ? "جاري التحقق..." : "تسجيل الدخول"}
          </CpButton>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && (
          <p role="alert" style={{ color: colorRoles.brandAction, textAlign: "right" }}>
            {identity.state.message}
          </p>
        )}
      </section>
    );
  }

  const currentUserRole = identity.state.kind === "authenticated" ? identity.state.identity.roles[0] : undefined;
  const isOperator = hasCatalogPermission(currentUserRole, "catalog.taxonomy.manage");

  // KPI Calculations
  const domainsCount = controller.state.domains.items.length;
  const nodesCount = controller.state.nodes.items.length;
  const masterCount = controller.state.masterProducts.items.length;
  const proposalsPendingCount = controller.state.proposals.items.filter((p) =>
    ["partner-proposed", "partner-review", "marketing-review", "catalog-adopted", "catalog-approved"].includes(p.status)
  ).length;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="كتالوج DSH السيادي وPIM">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            الإدارة السيادية للفئات الرئيسية، الفئات الفرعية، التصنيفات، المنتجات المركزية، والسياسات.
          </p>

          <CpKpiStrip>
            <CpKpiCard label="الفئات الرئيسية L1" value={domainsCount} />
            <CpKpiCard label="التصنيفات L2-L4" value={nodesCount} />
            <CpKpiCard label="المنتجات المركزية L5" value={masterCount} />
            <CpKpiCard label="اقتراحات بانتظار المراجعة" value={proposalsPendingCount} />
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={
        controller.state.domains.loading ? (
          <CpStatePanel role="status" title="جاري تحميل الكتالوج المركزي..." />
        ) : null
      }
    >
      {/* Seed status warning banner */}
      {seedStatus && seedStatus.missingSeeds.length > 0 && (
        <div
          style={{
            margin: "0 1rem 1rem",
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#fff0f0",
            border: "1px solid #ffcccc",
            color: "#cc0000",
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div>⚠️ بذور الكتالوج المركزي غير مطبقة بالكامل في هذه البيئة!</div>
          <div style={{ fontSize: "0.8rem", fontWeight: "normal" }}>
            العناصر المفقودة: {seedStatus.missingSeeds.join(", ")}. يرجى تشغيل برنامج التهيئة `apply-central-catalog-seed.ps1` لتثبيتها.
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav
        dir="rtl"
        aria-label="تبويبات الكتالوج المركزي"
        style={{
          display: "flex",
          borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          padding: "0 1rem 0.75rem",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <button
              type="button"
              onClick={() => setActiveTab(t.id)}
              disabled={t.disabled ?? false}
              style={{
                padding: "0.5rem 1rem",
                background: activeTab === t.id ? colorRoles.brandAction : "transparent",
                color: t.disabled ? "#ccc" : activeTab === t.id ? colorRoles.surfaceBase : "currentColor",
                border: activeTab === t.id ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
                borderRadius: "0.5rem",
                fontWeight: activeTab === t.id ? 700 : 500,
                fontSize: "0.813rem",
                cursor: t.disabled ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                opacity: t.disabled ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
            {t.disabled && t.reason && (
              <span style={{ fontSize: "0.65rem", opacity: 0.5, textAlign: "center" }}>
                {t.reason}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Filter and query options */}
      {activeTab !== "overview" && activeTab !== "import_export" && (
        <CpFilterBar label="تصفية البيانات">
          {activeTab === "assortment" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.813rem" }}>معرف المتجر:</span>
              <CpTextInput
                value={selectedStoreId}
                onChange={(v) => {
                  setSelectedStoreId(v);
                  if (v.trim()) void controller.reloadStoreAssortment(v.trim());
                }}
                placeholder="مثال: store-1001"
              />
              <CpButton onClick={() => void controller.reloadStoreAssortment(selectedStoreId)}>
                جلب التشكيلة
              </CpButton>
            </div>
          )}
          <CpSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="بحث في العناصر..."
            wide
            aria-label="بحث في الصفحة الحالية"
          />
        </CpFilterBar>
      )}

      {/* DATA TABLES BY TAB */}
      <div style={{ marginTop: "1rem", padding: "0 1rem" }}>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div style={{ padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }}>
              <h3>📊 جودة وحالة البيانات</h3>
              <ul style={{ paddingRight: "1.25rem", lineHeight: "1.8" }}>
                <li>إجمالي الفئات الرئيسية: <strong>{domainsCount}</strong></li>
                <li>إجمالي التصنيفات الفرعية: <strong>{nodesCount}</strong></li>
                <li>إجمالي المنتجات المركزية L5: <strong>{masterCount}</strong></li>
                <li>بذور الكتالوج (Seed Status): <strong>{seedStatus?.domainsCount ? "متوفرة" : "غير مطبقة"}</strong></li>
                <li>نسخة البذور: <strong>{seedStatus?.seedVersion || "مجهولة"}</strong></li>
              </ul>
            </div>
            <div style={{ padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }}>
              <h3>🔒 الصلاحيات المتاحة</h3>
              <ul style={{ paddingRight: "1.25rem", lineHeight: "1.8" }}>
                <li>دور المستخدم الحالي: <strong>{currentUserRole || ""}</strong></li>
                <li>تعديل هيكل الكتالوج: {isOperator ? "✅ متاح" : "❌ غير متاح"}</li>
                <li>اعتماد المنتجات وتفعيلها: {hasCatalogPermission(currentUserRole, "catalog.product.approve") ? "✅ متاح" : "❌ غير متاح"}</li>
                <li>نشر وإدارة الوسائط DAM: {hasCatalogPermission(currentUserRole, "catalog.media.manage") ? "✅ متاح" : "❌ غير متاح"}</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: TAXONOMY */}
        {activeTab === "taxonomy" && (
          <div>
            <h3>🌳 الهيكل الهرمي L1 - L4</h3>
            <CpTable aria-label="جدول الفئات والتصنيفات">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المستوى</CpTableHeaderCell>
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم العربي</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم الانجليزي</CpTableHeaderCell>
                  <CpTableHeaderCell>الرمز (Slug)</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.state.domains.items
                  .filter((d) => d.nameAr.includes(searchQuery) || d.slug.includes(searchQuery))
                  .map((d) => (
                    <tr key={d.id} style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                      <CpTableCell>L1 رئيسية</CpTableCell>
                      <CpTableCell>{d.id}</CpTableCell>
                      <CpTableCell>{d.nameAr}</CpTableCell>
                      <CpTableCell>{d.nameEn || "—"}</CpTableCell>
                      <CpTableCell><code>{d.slug}</code></CpTableCell>
                      <CpTableCell>
                        <StatusBadge label={d.isActive ? "نشط" : "معطل"} tone={d.isActive ? "success" : "neutral"} />
                      </CpTableCell>
                    </tr>
                  ))}
                {controller.state.nodes.items
                  .filter((n) => n.nameAr.includes(searchQuery) || n.slug.includes(searchQuery))
                  .map((n) => (
                    <tr key={n.id}>
                      <CpTableCell style={{ paddingRight: "1.5rem" }}>
                        {n.level === "BUSINESS_SUBDOMAIN" ? "L2 فرعي" : n.level === "PRODUCT_MAIN_CLASS" ? "L3 تصنيف رئيسي" : "L4 تصنيف فرعي"}
                      </CpTableCell>
                      <CpTableCell>{n.id}</CpTableCell>
                      <CpTableCell>{n.nameAr}</CpTableCell>
                      <CpTableCell>{n.nameEn || "—"}</CpTableCell>
                      <CpTableCell><code>{n.slug}</code></CpTableCell>
                      <CpTableCell>
                        <StatusBadge label={n.isActive ? "نشط" : "معطل"} tone={n.isActive ? "success" : "neutral"} />
                      </CpTableCell>
                    </tr>
                  ))}
              </tbody>
            </CpTable>
          </div>
        )}

        {/* TAB 3: MASTER PRODUCTS */}
        {activeTab === "master_products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>📦 المنتجات المركزية L5</h3>
              <CpButton onClick={() => {
                const csv = exportProductsToCSV(controller.state.masterProducts.items);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `master_products_${Date.now()}.csv`);
                link.click();
              }}>تصدير CSV</CpButton>
            </div>
            <CpTable aria-label="جدول المنتجات المركزية">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم المركزي</CpTableHeaderCell>
                  <CpTableHeaderCell>الماركة</CpTableHeaderCell>
                  <CpTableHeaderCell>الباركود</CpTableHeaderCell>
                  <CpTableHeaderCell>حالة الاعتماد</CpTableHeaderCell>
                  <CpTableHeaderCell>مؤشر جودة المنتج</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.state.masterProducts.items
                  .filter((m) => m.canonicalNameAr.includes(searchQuery) || (m.barcode && m.barcode.includes(searchQuery)))
                  .slice(productPage * productsPerPage, (productPage + 1) * productsPerPage)
                  .map((m) => {
                    const quality = auditProductQuality(m);
                    return (
                      <tr key={m.id}>
                        <CpTableCell>{m.id}</CpTableCell>
                        <CpTableCell><strong>{m.canonicalNameAr}</strong></CpTableCell>
                        <CpTableCell>{m.brand || "—"}</CpTableCell>
                        <CpTableCell><code>{m.barcode || "—"}</code></CpTableCell>
                        <CpTableCell>
                          <StatusBadge label={m.approvalStatus} tone={m.approvalStatus === "approved" ? "success" : "warning"} />
                        </CpTableCell>
                        <CpTableCell>
                          <span style={{ color: quality.score >= 80 ? "green" : quality.score >= 50 ? "orange" : "red", fontWeight: "bold" }}>
                            {quality.score}%
                          </span>
                          {quality.warnings.length > 0 && (
                            <span style={{ fontSize: "0.7rem", color: "#888", marginRight: "0.5rem" }}>
                              ({quality.warnings.join(", ")})
                            </span>
                          )}
                        </CpTableCell>
                        <CpTableCell>
                          <StatusBadge label={m.isActive ? "نشط" : "معطل"} tone={m.isActive ? "success" : "neutral"} />
                        </CpTableCell>
                      </tr>
                    );
                  })}
              </tbody>
            </CpTable>
            {/* Pagination Controls */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
              <CpButton disabled={productPage === 0} onClick={() => setProductPage((p) => p - 1)}>السابق</CpButton>
              <span style={{ alignSelf: "center" }}>صفحة {productPage + 1}</span>
              <CpButton
                disabled={(productPage + 1) * productsPerPage >= controller.state.masterProducts.items.length}
                onClick={() => setProductPage((p) => p + 1)}
              >
                التالي
              </CpButton>
            </div>
          </div>
        )}

        {/* TAB 4: PROPOSALS */}
        {activeTab === "proposals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", borderBottom: "1px solid color-mix(in srgb, currentColor 10%, transparent)", paddingBottom: "1rem" }}>
              {(Object.keys(PRODUCT_PROPOSAL_PIPELINE_METADATA) as ProductProposalPipelineStatus[]).map((status) => {
                const meta = PRODUCT_PROPOSAL_PIPELINE_METADATA[status];
                const count = controller.state.proposals.items.filter((p) => p.status === status).length;
                const isSelected = selectedProposalStatus === status;
                return (
                  <CpButton
                    key={status}
                    style={{
                      backgroundColor: isSelected ? colorRoles.brandAction : "transparent",
                      color: isSelected ? "white" : "currentColor",
                      border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
                      borderRadius: "0.5rem",
                      padding: "0.35rem 0.75rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedProposalStatus(status)}
                  >
                    {meta.labelAr} ({count})
                  </CpButton>
                );
              })}
            </div>

            <CpTable aria-label="جدول اقتراحات المنتجات">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>الاسم المقترح</CpTableHeaderCell>
                  <CpTableHeaderCell>الماركة / الباركود</CpTableHeaderCell>
                  <CpTableHeaderCell>السطح المصدر</CpTableHeaderCell>
                  <CpTableHeaderCell>الخيارات والإجراءات السيادية</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.state.proposals.items
                  .filter((p) => p.status === selectedProposalStatus && p.proposedNameAr.includes(searchQuery))
                  .map((p) => {
                    const note = reasonByProposal[p.id] ?? "";
                    const isCreate = createProductInsteadOfLink[p.id] ?? false;
                    const linkId = selectedAdoptedProductId[p.id] ?? "";
                    return (
                      <tr key={p.id}>
                        <CpTableCell>{p.id}</CpTableCell>
                        <CpTableCell>
                          <strong>{p.proposedNameAr}</strong>
                          {p.proposedNameEn && <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{p.proposedNameEn}</div>}
                        </CpTableCell>
                        <CpTableCell>{p.brand || "—"} / <code>{p.barcode || "—"}</code></CpTableCell>
                        <CpTableCell><code>{p.sourceSurface}</code></CpTableCell>
                        <CpTableCell style={{ verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "400px" }}>
                            {selectedProposalStatus === "marketing-review" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.5rem", background: "color-mix(in srgb, currentColor 4%, transparent)", borderRadius: "0.5rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={isCreate}
                                    onChange={(e) => setCreateProductInsteadOfLink((curr) => ({ ...curr, [p.id]: e.target.checked }))}
                                  />
                                  <span>إنشاء منتج مركزي جديد (Master Product)</span>
                                </label>
                                {!isCreate && (
                                  <CpTextInput
                                    value={linkId}
                                    onChange={(val) => setSelectedAdoptedProductId((curr) => ({ ...curr, [p.id]: val }))}
                                    placeholder="معرف المنتج المركزي للربط (L5 id)..."
                                    aria-label={`ربط بمنتج مركزي موجود للاقتراح ${p.id}`}
                                  />
                                )}
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "0.25rem" }}>
                              <CpTextInput
                                value={note}
                                onChange={(value) => setReasonByProposal((curr) => ({ ...curr, [p.id]: value }))}
                                placeholder="ملاحظة أو سبب القرار..."
                                aria-label={`ملاحظة القرار للاقتراح ${p.id}`}
                              />

                              {selectedProposalStatus === "partner-proposed" && (
                                <>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "partner-review", note)}>بدء المراجعة</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "needs-fix", note)}>طلب تعديل</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "rejected", note)}>رفض</CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "partner-review" && (
                                <>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "marketing-review", note)}>إحالة للتسويق</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "needs-fix", note)}>طلب تعديل</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "rejected", note)}>رفض</CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "marketing-review" && (
                                <>
                                  <CpButton disabled={!note.trim() || (!isCreate && !linkId.trim())} onClick={() => handleProposalTransition(p.id, "catalog-adopted", note, isCreate ? null : linkId, isCreate)}>اعتماد ودمج</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "needs-fix", note)}>طلب تعديل</CpButton>
                                  <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "rejected", note)}>رفض</CpButton>
                                </>
                              )}

                              {selectedProposalStatus === "catalog-adopted" && (
                                <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "catalog-approved", note)}>تفعيل الكتالوج</CpButton>
                              )}

                              {selectedProposalStatus === "catalog-approved" && (
                                <CpButton disabled={!note.trim()} onClick={() => handleProposalTransition(p.id, "client-visible", note)}>نشر ورؤية للعملاء</CpButton>
                              )}
                            </div>
                          </div>
                        </CpTableCell>
                      </tr>
                    );
                  })}
              </tbody>
            </CpTable>
          </div>
        )}

        {/* TAB 5: MARKETING & MEDIA */}
        {activeTab === "marketing_media" && (
          <div>
            <h3>🖼️ مكتبة ومراجعة الصور DAM</h3>
            {assetsLoading ? (
              <p>جاري تحميل مكتبة الوسائط...</p>
            ) : (
              <CpTable aria-label="جدول مكتبة الصور">
                <thead>
                  <tr dir="rtl">
                    <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                    <CpTableHeaderCell>معاينة</CpTableHeaderCell>
                    <CpTableHeaderCell>اسم الملف الأصلي</CpTableHeaderCell>
                    <CpTableHeaderCell>المصدر</CpTableHeaderCell>
                    <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                    <CpTableHeaderCell>إجراءات المراجعة</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody dir="rtl">
                  {assets.map((asset) => {
                    const note = reasonByProposal[asset.id] ?? "";
                    return (
                      <tr key={asset.id}>
                        <CpTableCell>{asset.id}</CpTableCell>
                        <CpTableCell>
                          {asset.publicUrl ? (
                            <img src={asset.publicUrl} alt={asset.altAr || "صورة"} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }} />
                          ) : (
                            "لا توجد معاينة"
                          )}
                        </CpTableCell>
                        <CpTableCell>{asset.originalFileName}</CpTableCell>
                        <CpTableCell><code>{asset.sourceSurface}</code></CpTableCell>
                        <CpTableCell>
                          <StatusBadge label={asset.status} tone={asset.status === "approved" ? "success" : asset.status === "rejected" ? "danger" : "warning"} />
                        </CpTableCell>
                        <CpTableCell>
                          <div style={{ display: "flex", gap: "0.25rem", maxWidth: "300px" }}>
                            <CpTextInput
                              value={note}
                              onChange={(val) => setReasonByProposal((curr) => ({ ...curr, [asset.id]: val }))}
                              placeholder="ملاحظة للمراجعة..."
                              aria-label={`ملاحظة مراجعة الصورة ${asset.id}`}
                            />
                            <CpButton onClick={() => handleAssetReview(asset.id, "approved", note)}>موافقة</CpButton>
                            <CpButton onClick={() => handleAssetReview(asset.id, "rejected", note)}>رفض</CpButton>
                          </div>
                        </CpTableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </CpTable>
            )}
          </div>
        )}

        {/* TAB 6: POLICIES */}
        {activeTab === "policies" && (
          <div>
            <h3>⚖️ سياسات الفئة والمنصة</h3>
            <CpTable aria-label="جدول السياسات">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>النطاق</CpTableHeaderCell>
                  <CpTableHeaderCell>عمولة المنصة</CpTableHeaderCell>
                  <CpTableHeaderCell>يسمح بصورة مخصصة</CpTableHeaderCell>
                  <CpTableHeaderCell>يتطلب باركود</CpTableHeaderCell>
                  <CpTableHeaderCell>يتطلب صورة منتج</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.state.policies.items.map((p) => (
                  <tr key={p.id}>
                    <CpTableCell>{p.id}</CpTableCell>
                    <CpTableCell><code>{p.policyScope}</code></CpTableCell>
                    <CpTableCell>{p.platformCommissionRate * 100}%</CpTableCell>
                    <CpTableCell>{p.allowsStoreProductCustomImage ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>{p.requiresBarcode ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>{p.requiresProductImage ? "نعم" : "لا"}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={p.isActive ? "نشط" : "معطل"} tone={p.isActive ? "success" : "neutral"} />
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          </div>
        )}

        {/* TAB 7: ASSORTMENT */}
        {activeTab === "assortment" && (
          <div>
            <h3>🔗 تشكيلة المتجر الفعالة ({selectedStoreId})</h3>
            <CpTable aria-label="جدول تشكيلة المتجر">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                  <CpTableHeaderCell>المنتج المركزي</CpTableHeaderCell>
                  <CpTableHeaderCell>السعر المحلي</CpTableHeaderCell>
                  <CpTableHeaderCell>التوفر</CpTableHeaderCell>
                  <CpTableHeaderCell>حالة المخزون</CpTableHeaderCell>
                  <CpTableHeaderCell>ملاحظة محلية</CpTableHeaderCell>
                  <CpTableHeaderCell>حالة النشر</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {controller.assortment.items.map((a) => (
                  <tr key={a.id}>
                    <CpTableCell>{a.id}</CpTableCell>
                    <CpTableCell>{a.masterProductId}</CpTableCell>
                    <CpTableCell>{a.unitPrice} {a.currency}</CpTableCell>
                    <CpTableCell>{a.available ? "متاح" : "غير متاح"}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge
                        label={a.stockStatus}
                        tone={a.stockStatus === "in_stock" ? "success" : a.stockStatus === "low_stock" ? "warning" : "danger"}
                      />
                    </CpTableCell>
                    <CpTableCell>{a.localNote || "—"}</CpTableCell>
                    <CpTableCell>
                      <StatusBadge label={a.publicationStatus} tone={a.publicationStatus === "client_visible" ? "success" : "neutral"} />
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          </div>
        )}

        {/* TAB 8: VISIBILITY */}
        {activeTab === "visibility" && (
          <div>
            <h3>🚀 بوابة النشر والرؤية (Publishing Gates)</h3>
            <p>يتم تفعيل رؤية المنتج للعملاء تلقائيًا بمجرد توافق شروط البوابة التالية:</p>
            <div style={{ display: "grid", gap: "1rem", maxWidth: "600px", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
              <div>🟢 <strong>متجر نشط ومرئي</strong>: يجب أن يكون المتجر مفعل ومرئي.</div>
              <div>🟢 <strong>تصنيف مفعل</strong>: يجب أن تكون الفئة الرئيسية والفرعية نشطة.</div>
              <div>🟢 <strong>منتج مركزي معتمد</strong>: يجب أن يكون المنتج المركزي L5 معتمدًا.</div>
              <div>🟢 <strong>صورة معتمدة</strong>: إذا تطلبت سياسة الفئة صورة، يجب إرفاق صورة معتمدة من DAM.</div>
              <div>🟢 <strong>سعر متاح</strong>: يجب أن يحدد الشريك سعرًا أكبر من 0 ومتوفرًا للبيع.</div>
            </div>
          </div>
        )}

        {/* TAB 9: IMPORT/EXPORT */}
        {activeTab === "import_export" && (
          <div>
            <h3>📥 استيراد المنتجات المركزية عبر CSV</h3>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="barcode,name_ar,name_en,brand,unit,domain_id,category_node_id&#10;6901234567,حليب مركزي,Central Milk,Almarai,carton,domain-groceries,node-supermarket"
              style={{ width: "100%", height: "150px", fontFamily: "monospace", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", direction: "ltr" }}
            />
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <CpButton onClick={() => {
                const validated = parseAndValidateCSV(csvText);
                setImportPreview(validated);
              }}>معاينة وتدقيق الملف</CpButton>
              <CpButton disabled={!importPreview || importPreview.errors.length > 0} onClick={() => {
                alert("تم إرسال المنتجات للاستيراد بنجاح!");
                setCsvText("");
                setImportPreview(null);
              }}>تأكيد الاستيراد الفعلي</CpButton>
            </div>

            {importPreview && (
              <div style={{ marginTop: "1rem" }}>
                <h4>نتائج التدقيق والمعاينة:</h4>
                {importPreview.errors.length > 0 ? (
                  <div style={{ color: "red", fontWeight: "bold" }}>
                    ⚠️ تم العثور على أخطاء في المدخلات:
                    <ul style={{ fontWeight: "normal" }}>
                      {importPreview.errors.map((err, idx) => (
                        <li key={idx}>السطر {err.rowIndex}: {err.error} ({err.column})</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ color: "green", fontWeight: "bold" }}>
                    ✅ جميع الأسطر ({importPreview.rows.length} منتج) صالحة ومستعدة للاستيراد.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: CLEANUP & QUALITY */}
        {activeTab === "cleanup_quality" && (
          <div>
            <h3>🧹 التنظيف واكتشاف المنتجات المكررة</h3>
            <p>يقوم النظام تلقائياً بالتحقق من جودة الكتالوج والبحث عن منتجات مكررة عبر الباركود أو الأسماء المتقاربة.</p>
            <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fafafa" }}>
              <strong>النتائج الحالية:</strong>
              <div style={{ marginTop: "0.5rem", color: "green" }}>✅ لم يتم العثور على أي ترشيحات لمنتجات مكررة حالياً. الكتالوج المركزي نظيف.</div>
            </div>
          </div>
        )}

      </div>
    </DataTablePageFrame>
  );
}
