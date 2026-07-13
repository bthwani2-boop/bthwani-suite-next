"use client";
import { colorRoles, neutralScale, statusScale } from '@bthwani/ui-kit';
import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
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
import { useControlPanelSession } from "../../shared/session/control-panel-session";
import {
  useCentralCatalogController,
  type ProductProposalPipelineStatus,
  PRODUCT_PROPOSAL_PIPELINE_METADATA,
  fetchSeedStatus,
  fetchCatalogAssets,
  reviewCatalogAsset,
  putEntityImage,
  fetchCatalogAssetLinks,
  hasCatalogPermission,
  auditProductQuality,
  parseAndValidateCSV,
  exportProductsToCSV,
  uploadAndLinkAsset,
  type CatalogAsset,
} from "../../shared/catalog";
import { CategoryControlRoom } from "./products/CategoryControlRoom";

type StatusTone = "warning" | "success" | "danger" | "neutral" | "info";
type DamEntityType = "domains" | "nodes" | "master-products" | "product-proposals";

// ─── Style constants (static/layout styles reused across the screen) ────────
const pageDescStyle: CSSProperties = { margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" };
const seedWarningBoxStyle: CSSProperties = {
  margin: "0 1rem 1rem",
  padding: "1rem",
  borderRadius: "0.5rem",
  backgroundColor: statusScale.dangerSoft,
  border: `1px solid ${statusScale.danger}`,
  color: statusScale.dangerStrong,
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};
const seedWarningDetailStyle: CSSProperties = { fontSize: "0.8rem", fontWeight: "normal" };
const tabNavStyle: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
  padding: "0 1rem 0.75rem",
  gap: "0.5rem",
  marginBottom: "0.75rem",
  flexWrap: "wrap",
};
const tabButtonContainerStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "2px" };
const tabButtonBaseStyle: CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  fontSize: "0.813rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
};
const tabDisabledReasonStyle: CSSProperties = { fontSize: "0.65rem", opacity: 0.5, textAlign: "center" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "0.5rem" };
const filterLabelStyle: CSSProperties = { fontSize: "0.813rem" };
const contentWrapperStyle: CSSProperties = { marginTop: "1rem", padding: "0 1rem" };
const overviewGridStyle: CSSProperties = { display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };
const overviewCardStyle: CSSProperties = { padding: "1.5rem", border: `1px solid ${neutralScale[200]}`, borderRadius: "0.5rem" };
const overviewListStyle: CSSProperties = { paddingRight: "1.25rem", lineHeight: "1.8" };
const sectionHeaderRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" };
const paginationRowStyle: CSSProperties = { display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" };
const paginationPageLabelStyle: CSSProperties = { alignSelf: "center" };
const qualityWarningsStyle: CSSProperties = { fontSize: "0.7rem", color: colorRoles.textMuted, marginRight: "0.5rem" };
const missingImageBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginRight: "0.35rem",
  padding: "0.05rem 0.4rem",
  borderRadius: "999px",
  fontSize: "0.65rem",
  fontWeight: 700,
  background: statusScale.dangerSoft,
  color: statusScale.dangerStrong,
};
const proposalsColumnStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "1rem", width: "100%" };
const proposalStatusTabsRowStyle: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "1rem",
  flexWrap: "wrap",
  borderBottom: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
  paddingBottom: "1rem",
};
const proposalStatusButtonBaseStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "0.5rem",
  padding: "0.35rem 0.75rem",
  cursor: "pointer",
};
const proposalNameEnStyle: CSSProperties = { fontSize: "0.8rem", opacity: 0.7 };
const proposalActionColumnStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "400px" };
const marketingReviewBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  padding: "0.5rem",
  background: "color-mix(in srgb, currentColor 4%, transparent)",
  borderRadius: "0.5rem",
};
const marketingReviewLabelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" };
const proposalNoteRowStyle: CSSProperties = { display: "flex", gap: "0.25rem" };
const damSectionStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "1.25rem" };
const damPanelStyle: CSSProperties = { padding: "1rem", border: `1px solid ${neutralScale[200]}`, borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" };
const damPanelTitleStyle: CSSProperties = { margin: 0, fontSize: "0.95rem" };
const damFormRowStyle: CSSProperties = { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" };
const damSelectStyle: CSSProperties = { padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: `1px solid ${neutralScale[300]}` };
const assetPreviewImgStyle: CSSProperties = { width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" };
const assetReviewRowStyle: CSSProperties = { display: "flex", gap: "0.25rem", maxWidth: "340px", flexWrap: "wrap" };
const visibilityGateBoxStyle: CSSProperties = { display: "grid", gap: "1rem", maxWidth: "600px", padding: "1rem", border: `1px solid ${neutralScale[300]}`, borderRadius: "8px" };
const csvTextareaStyle: CSSProperties = { width: "100%", height: "150px", fontFamily: "monospace", padding: "0.5rem", borderRadius: "4px", border: `1px solid ${neutralScale[300]}`, direction: "ltr" };
const csvActionsRowStyle: CSSProperties = { marginTop: "0.5rem", display: "flex", gap: "0.5rem" };
const csvErrorStyle: CSSProperties = { color: statusScale.danger, fontWeight: "bold" };
const csvErrorListStyle: CSSProperties = { fontWeight: "normal" };
const csvSuccessStyle: CSSProperties = { color: statusScale.success, fontWeight: "bold" };
const cleanupBoxStyle: CSSProperties = { padding: "1rem", border: `1px solid ${neutralScale[300]}`, borderRadius: "8px", backgroundColor: neutralScale[50] };
const cleanupResultStyle: CSSProperties = { marginTop: "0.5rem", color: statusScale.success };
const proposalCellVerticalAlignStyle: CSSProperties = { verticalAlign: "middle" };
const importPreviewResultBoxStyle: CSSProperties = { marginTop: "1rem" };

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneColors: Record<StatusTone, { bg: string; color: string }> = {
    warning: { bg: statusScale.warningSoft, color: statusScale.warningStrong },
    success: { bg: statusScale.successSoft, color: statusScale.successStrong },
    danger: { bg: statusScale.dangerSoft, color: statusScale.dangerStrong },
    neutral: { bg: colorRoles.surfaceMuted, color: colorRoles.textSecondary },
    info: { bg: statusScale.infoSoft, color: statusScale.infoStrong },
  };
  const { bg, color } = toneColors[tone]; // dynamic-exception: tone-derived colors computed per badge instance
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

const DAM_ENTITY_TYPES: readonly DamEntityType[] = ["domains", "nodes", "master-products", "product-proposals"];

export function CatalogDashboardScreen() {
  const { state } = useControlPanelSession();
  const controller = useCentralCatalogController(state.kind);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("store-1001");
  const [assortmentProductId, setAssortmentProductId] = useState("");
  const [assortmentPrice, setAssortmentPrice] = useState("");
  const [assortmentSaving, setAssortmentSaving] = useState(false);
  const [reasonByProposal, setReasonByProposal] = useState<Record<string, string>>({});

  const [selectedProposalStatus, setSelectedProposalStatus] = useState<ProductProposalPipelineStatus>("partner-proposed");
  const [selectedAdoptedProductId, setSelectedAdoptedProductId] = useState<Record<string, string>>({});
  const [createProductInsteadOfLink, setCreateProductInsteadOfLink] = useState<Record<string, boolean>>({});

  // Seed status state
  const [seedStatus, setSeedStatus] = useState<{
    domainsCount: number;
    nodesCount: number;
    masterProductsCount: number;
    assortmentsCount: number;
    manualRequestExists: boolean;
    shayInExists: boolean;
    awnakExists: boolean;
    seedVersion: string;
    missingSeeds: readonly string[];
  } | null>(null);

  // DAM Assets state
  const [assets, setAssets] = useState<readonly CatalogAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // DAM upload form state
  const [uploadEntityType, setUploadEntityType] = useState<DamEntityType>("master-products");
  const [uploadEntityId, setUploadEntityId] = useState("");
  const [uploadRole, setUploadRole] = useState("gallery");
  const [uploadAltAr, setUploadAltAr] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // DAM entity-link form state
  const [linkAssetId, setLinkAssetId] = useState("");
  const [linkEntityType, setLinkEntityType] = useState<DamEntityType>("master-products");
  const [linkEntityId, setLinkEntityId] = useState("");
  const [linkRole, setLinkRole] = useState("canonical_product_image");
  const [linking, setLinking] = useState(false);

  // Missing-image indicator for the currently visible master products page
  const [missingImageProductIds, setMissingImageProductIds] = useState<ReadonlySet<string>>(new Set());

  // CSV Import state
  const [csvText, setCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<{
    rows: readonly any[];
    errors: readonly any[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // Pagination for Master Products
  const [productPage, setProductPage] = useState(0);
  const productsPerPage = 20;

  useEffect(() => {
    if (state.kind === "authenticated") {
      fetchSeedStatus()
        .then(setSeedStatus)
        .catch(console.error);

      setAssetsLoading(true);
      fetchCatalogAssets()
        .then(setAssets)
        .catch(console.error)
        .finally(() => setAssetsLoading(false));
    }
  }, [state.kind]);

  const visibleMasterProducts = useMemo(
    () =>
      controller.state.masterProducts.items
        .filter((m) => m.canonicalNameAr.includes(searchQuery) || (m.barcode && m.barcode.includes(searchQuery)))
        .slice(productPage * productsPerPage, (productPage + 1) * productsPerPage),
    [controller.state.masterProducts.items, searchQuery, productPage],
  );

  // Derive "missing image" badges client-side from the asset-links query — no backend "missing" status exists.
  useEffect(() => {
    if (state.kind !== "authenticated" || activeTab !== "master_products" || visibleMasterProducts.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const missing = new Set<string>();
      await Promise.all(
        visibleMasterProducts.map(async (m) => {
          try {
            const links = await fetchCatalogAssetLinks({ entityType: "master_product", entityId: m.id });
            if (!links.some((l) => l.status === "approved")) {
              missing.add(m.id);
            }
          } catch {
            // ignore per-product lookup failures; badge simply won't render for that item
          }
        }),
      );
      if (!cancelled) setMissingImageProductIds(missing);
    })();
    return () => {
      cancelled = true;
    };
  }, [state.kind, activeTab, visibleMasterProducts]);

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

  const reloadAssets = async () => {
    setAssetsLoading(true);
    try {
      const items = await fetchCatalogAssets();
      setAssets(items);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleAssetReview = async (assetId: string, status: "approved" | "rejected" | "archived", note: string) => {
    try {
      await reviewCatalogAsset(assetId, { status, reviewNote: note });
      alert("تم تسجيل قرار مراجعة الصورة بنجاح");
      await reloadAssets();
    } catch (e: any) {
      alert("فشل مراجعة الصورة: " + (e.message ?? e.toString()));
    }
  };

  const handleUploadAsset = async () => {
    const file = uploadFileInputRef.current?.files?.[0];
    if (!file || !uploadEntityId.trim()) {
      alert("يرجى اختيار ملف وتحديد معرف العنصر المستهدف");
      return;
    }
    setUploading(true);
    try {
      await uploadAndLinkAsset(file, uploadEntityType, uploadEntityId.trim(), uploadRole.trim() || "gallery", "control-panel-catalog", uploadAltAr.trim());
      alert("تم رفع الصورة وربطها بنجاح");
      setUploadEntityId("");
      setUploadAltAr("");
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
      await reloadAssets();
    } catch (e: any) {
      alert("فشل رفع الصورة: " + (e.message ?? e.toString()));
    } finally {
      setUploading(false);
    }
  };

  const handleLinkExistingAsset = async () => {
    if (!linkAssetId.trim() || !linkEntityId.trim() || !linkRole.trim()) {
      alert("يرجى تحديد الصورة والعنصر المستهدف والدور");
      return;
    }
    setLinking(true);
    try {
      await putEntityImage(linkEntityType, linkEntityId.trim(), linkRole.trim(), linkAssetId.trim());
      alert("تم ضبط صورة العنصر بنجاح");
      setLinkAssetId("");
      setLinkEntityId("");
    } catch (e: any) {
      alert("فشل ربط الصورة بالعنصر: " + (e.message ?? e.toString()));
    } finally {
      setLinking(false);
    }
  };


  const currentUserRole = state.kind === "authenticated" ? (state.identity.roles.includes("operator") ? "operator" : state.identity.roles[0]) : undefined;
  const isOperator = hasCatalogPermission(currentUserRole, "catalog.taxonomy.manage");

  // KPI Calculations
  const domainsCount = controller.state.domains.items.length;
  const nodesCount = controller.state.nodes.items.length;
  const masterCount = controller.state.masterProducts.items.length;
  const proposalsPendingCount = controller.state.proposals.items.filter((p) =>
    ["partner-proposed", "partner-review", "marketing-review", "catalog-adopted", "catalog-approved"].includes(p.status)
  ).length;
  const duplicateCandidates = useMemo(() => {
    const groups = new Map<string, typeof controller.state.masterProducts.items>();
    for (const product of controller.state.masterProducts.items) {
      const key = product.barcode?.trim() || product.canonicalNameAr.trim().toLocaleLowerCase("ar");
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), product]);
    }
    return [...groups.entries()].filter(([, products]) => products.length > 1);
  }, [controller.state.masterProducts.items]);

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="كتالوج DSH السيادي وPIM">
          <p style={pageDescStyle}>
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
        <div style={seedWarningBoxStyle}>
          <div>⚠️ بذور الكتالوج المركزي غير مطبقة بالكامل في هذه البيئة!</div>
          <div style={seedWarningDetailStyle}>
            العناصر المفقودة: {seedStatus.missingSeeds.join(", ")}. يرجى تشغيل برنامج التهيئة `apply-central-catalog-seed.ps1` لتثبيتها.
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav dir="rtl" aria-label="تبويبات الكتالوج المركزي" style={tabNavStyle}>
        {TABS.map((t) => (
          <div key={t.id} style={tabButtonContainerStyle}>
            <button
              type="button"
              onClick={() => setActiveTab(t.id)}
              disabled={t.disabled ?? false}
              style={{
                ...tabButtonBaseStyle,
                // dynamic-exception: active/disabled tone depends on current tab selection
                background: activeTab === t.id ? colorRoles.brandAction : "transparent",
                color: t.disabled ? neutralScale[400] : activeTab === t.id ? colorRoles.surfaceBase : "currentColor",
                border: activeTab === t.id ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
                fontWeight: activeTab === t.id ? 700 : 500,
                cursor: t.disabled ? "not-allowed" : "pointer",
                opacity: t.disabled ? 0.5 : 1,
              }}
            >
              {t.label}
            </button>
            {t.disabled && t.reason && (
              <span style={tabDisabledReasonStyle}>
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
            <div style={filterRowStyle}>
              <span style={filterLabelStyle}>معرف المتجر:</span>
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
      <div style={contentWrapperStyle}>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div style={overviewGridStyle}>
            <div style={overviewCardStyle}>
              <h3>📊 جودة وحالة البيانات</h3>
              <ul style={overviewListStyle}>
                <li>إجمالي الفئات الرئيسية: <strong>{domainsCount}</strong></li>
                <li>إجمالي التصنيفات الفرعية: <strong>{nodesCount}</strong></li>
                <li>إجمالي المنتجات المركزية L5: <strong>{masterCount}</strong></li>
                <li>بذور الكتالوج (Seed Status): <strong>{seedStatus && seedStatus.missingSeeds.length === 0 ? "مكتملة" : "غير مكتملة"}</strong></li>
                <li>منتجات البذور المعتمدة: <strong>{seedStatus?.masterProductsCount ?? 0}</strong></li>
                <li>تشكيلات ظاهرة للعميل: <strong>{seedStatus?.assortmentsCount ?? 0}</strong></li>
                <li>نسخة البذور: <strong>{seedStatus?.seedVersion || "مجهولة"}</strong></li>
              </ul>
            </div>
            <div style={overviewCardStyle}>
              <h3>🔒 الصلاحيات المتاحة</h3>
              <ul style={overviewListStyle}>
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
            <CategoryControlRoom
              domains={controller.state.domains.items}
              nodes={controller.state.nodes.items}
              searchQuery={searchQuery}
              onCreateDomain={controller.createDomain}
              onUpdateDomain={controller.updateDomain}
              onCreateNode={controller.createNode}
              onUpdateNode={controller.updateNode}
            />
          </div>
        )}

        {/* TAB 3: MASTER PRODUCTS */}
        {activeTab === "master_products" && (
          <div>
            <div style={sectionHeaderRowStyle}>
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
                {visibleMasterProducts.map((m) => {
                    const quality = auditProductQuality(m);
                    const missingImage = missingImageProductIds.has(m.id);
                    return (
                      <tr key={m.id}>
                        <CpTableCell>{m.id}</CpTableCell>
                        <CpTableCell>
                          {missingImage && <span style={missingImageBadgeStyle}>صورة مفقودة</span>}
                          <strong>{m.canonicalNameAr}</strong>
                        </CpTableCell>
                        <CpTableCell>{m.brand || "—"}</CpTableCell>
                        <CpTableCell><code>{m.barcode || "—"}</code></CpTableCell>
                        <CpTableCell>
                          <StatusBadge label={m.approvalStatus} tone={m.approvalStatus === "approved" ? "success" : "warning"} />
                        </CpTableCell>
                        <CpTableCell>
                          <span style={{ color: quality.score >= 80 ? "green" : quality.score >= 50 ? "orange" : "red", fontWeight: "bold" /* dynamic-exception: score-derived color */ }}>
                            {quality.score}%
                          </span>
                          {quality.warnings.length > 0 && (
                            <span style={qualityWarningsStyle}>
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
            <div style={paginationRowStyle}>
              <CpButton disabled={productPage === 0} onClick={() => setProductPage((p) => p - 1)}>السابق</CpButton>
              <span style={paginationPageLabelStyle}>صفحة {productPage + 1}</span>
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
          <div style={proposalsColumnStyle}>
            <div style={proposalStatusTabsRowStyle}>
              {(Object.keys(PRODUCT_PROPOSAL_PIPELINE_METADATA) as ProductProposalPipelineStatus[]).map((status) => {
                const meta = PRODUCT_PROPOSAL_PIPELINE_METADATA[status];
                const count = controller.state.proposals.items.filter((p) => p.status === status).length;
                const isSelected = selectedProposalStatus === status;
                return (
                  <CpButton
                    key={status}
                    style={{
                      ...proposalStatusButtonBaseStyle,
                      // dynamic-exception: selected-status tone
                      backgroundColor: isSelected ? colorRoles.brandAction : "transparent",
                      color: isSelected ? "white" : "currentColor",
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
                          {p.proposedNameEn && <div style={proposalNameEnStyle}>{p.proposedNameEn}</div>}
                        </CpTableCell>
                        <CpTableCell>{p.brand || "—"} / <code>{p.barcode || "—"}</code></CpTableCell>
                        <CpTableCell><code>{p.sourceSurface}</code></CpTableCell>
                        <CpTableCell style={proposalCellVerticalAlignStyle}>
                          <div style={proposalActionColumnStyle}>
                            {selectedProposalStatus === "marketing-review" && (
                              <div style={marketingReviewBoxStyle}>
                                <label style={marketingReviewLabelStyle}>
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

                            <div style={proposalNoteRowStyle}>
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
          <div style={damSectionStyle}>
            <h3>🖼️ مكتبة ومراجعة الصور DAM</h3>

            <div style={damPanelStyle}>
              <h4 style={damPanelTitleStyle}>رفع صورة جديدة وربطها بعنصر</h4>
              <div style={damFormRowStyle}>
                <input ref={uploadFileInputRef} type="file" accept="image/*" aria-label="اختيار ملف الصورة" />
                <select
                  value={uploadEntityType}
                  onChange={(e) => setUploadEntityType(e.target.value as DamEntityType)}
                  aria-label="نوع العنصر المستهدف للرفع"
                  style={damSelectStyle}
                >
                  {DAM_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <CpTextInput value={uploadEntityId} onChange={setUploadEntityId} placeholder="معرف العنصر المستهدف" aria-label="معرف العنصر المستهدف للرفع" />
                <CpTextInput value={uploadRole} onChange={setUploadRole} placeholder="الدور (gallery / canonical_product_image ...)" aria-label="دور الصورة" />
                <CpTextInput value={uploadAltAr} onChange={setUploadAltAr} placeholder="نص بديل (Alt) بالعربية" aria-label="النص البديل للصورة" />
                <CpButton disabled={uploading} onClick={() => void handleUploadAsset()}>{uploading ? "جاري الرفع..." : "رفع وربط"}</CpButton>
              </div>
            </div>

            <div style={damPanelStyle}>
              <h4 style={damPanelTitleStyle}>ضبط صورة عنصر من صور معتمدة موجودة</h4>
              <div style={damFormRowStyle}>
                <CpTextInput value={linkAssetId} onChange={setLinkAssetId} placeholder="معرف الصورة (Asset ID)" aria-label="معرف الصورة" />
                <select
                  value={linkEntityType}
                  onChange={(e) => setLinkEntityType(e.target.value as DamEntityType)}
                  aria-label="نوع العنصر المستهدف للربط"
                  style={damSelectStyle}
                >
                  {DAM_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <CpTextInput value={linkEntityId} onChange={setLinkEntityId} placeholder="معرف العنصر المستهدف" aria-label="معرف العنصر المستهدف للربط" />
                <CpTextInput value={linkRole} onChange={setLinkRole} placeholder="الدور (canonical_product_image ...)" aria-label="دور الربط" />
                <CpButton disabled={linking} onClick={() => void handleLinkExistingAsset()}>{linking ? "جاري الضبط..." : "ضبط كصورة العنصر"}</CpButton>
              </div>
            </div>

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
                            <img src={asset.publicUrl} alt={asset.altAr || "صورة"} style={assetPreviewImgStyle} />
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
                          <div style={assetReviewRowStyle}>
                            <CpTextInput
                              value={note}
                              onChange={(val) => setReasonByProposal((curr) => ({ ...curr, [asset.id]: val }))}
                              placeholder="ملاحظة للمراجعة..."
                              aria-label={`ملاحظة مراجعة الصورة ${asset.id}`}
                            />
                            <CpButton onClick={() => handleAssetReview(asset.id, "approved", note)}>موافقة</CpButton>
                            <CpButton onClick={() => handleAssetReview(asset.id, "rejected", note)}>رفض</CpButton>
                            <CpButton onClick={() => handleAssetReview(asset.id, "archived", note)}>أرشفة</CpButton>
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
            <div style={filterRowStyle}>
              <CpTextInput value={assortmentProductId} onChange={setAssortmentProductId} placeholder="معرف المنتج المركزي" />
              <CpTextInput value={assortmentPrice} onChange={setAssortmentPrice} placeholder="السعر المحلي YER" />
              <CpButton disabled={assortmentSaving} onClick={async () => {
                const unitPrice = Number(assortmentPrice.trim());
                if (!selectedStoreId.trim() || !assortmentProductId.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
                  alert("أدخل معرف متجر ومنتج مركزي وسعراً صحيحاً.");
                  return;
                }
                const current = controller.assortment.items.find((item) => item.masterProductId === assortmentProductId.trim());
                setAssortmentSaving(true);
                try {
                  await controller.upsertAssortment(selectedStoreId.trim(), assortmentProductId.trim(), {
                    unitPrice,
                    currency: "YER",
                    available: current?.available ?? true,
                    stockStatus: current?.stockStatus ?? "in_stock",
                    localNote: current?.localNote ?? "",
                    customImageObjectKey: current?.customImageObjectKey ?? null,
                    publicationStatus: current?.publicationStatus ?? "draft",
                  });
                  setAssortmentProductId("");
                  setAssortmentPrice("");
                } catch (caught) {
                  alert("تعذر حفظ التشكيلة: " + (caught instanceof Error ? caught.message : String(caught)));
                } finally {
                  setAssortmentSaving(false);
                }
              }}>{assortmentSaving ? "جاري الحفظ..." : "إضافة/تحديث التشكيلة"}</CpButton>
            </div>
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
            <div style={visibilityGateBoxStyle}>
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
              style={csvTextareaStyle}
            />
            <div style={csvActionsRowStyle}>
              <CpButton onClick={() => {
                const validated = parseAndValidateCSV(csvText);
                setImportPreview(validated);
              }}>معاينة وتدقيق الملف</CpButton>
              <CpButton disabled={importing || !importPreview || importPreview.errors.length > 0} onClick={async () => {
                if (!importPreview) return;
                setImporting(true);
                try {
                  for (const row of importPreview.rows) {
                    await controller.createMasterProduct({
                      domainId: row.domainId,
                      categoryNodeId: row.categoryNodeId || null,
                      canonicalNameAr: row.canonicalNameAr,
                      canonicalNameEn: row.canonicalNameEn,
                      brand: row.brand,
                      barcode: row.barcode || null,
                      gtin: null,
                      sku: null,
                      unit: row.unit,
                      measurementType: "unit",
                      canonicalImageObjectKey: null,
                      approvalStatus: "draft",
                      isActive: true,
                      createdSource: "control-panel-catalog-csv",
                    });
                  }
                  alert(`تم استيراد ${importPreview.rows.length} منتج مركزي كمسودات للمراجعة.`);
                  setCsvText("");
                  setImportPreview(null);
                } catch (caught) {
                  alert("فشل الاستيراد الفعلي: " + (caught instanceof Error ? caught.message : String(caught)));
                } finally {
                  setImporting(false);
                }
              }}>{importing ? "جاري الاستيراد..." : "تأكيد الاستيراد الفعلي"}</CpButton>
            </div>

            {importPreview && (
              <div style={importPreviewResultBoxStyle}>
                <h4>نتائج التدقيق والمعاينة:</h4>
                {importPreview.errors.length > 0 ? (
                  <div style={csvErrorStyle}>
                    ⚠️ تم العثور على أخطاء في المدخلات:
                    <ul style={csvErrorListStyle}>
                      {importPreview.errors.map((err, idx) => (
                        <li key={idx}>السطر {err.rowIndex}: {err.error} ({err.column})</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={csvSuccessStyle}>
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
            <div style={cleanupBoxStyle}>
              <strong>النتائج الحالية:</strong>
              {duplicateCandidates.length === 0 ? (
                <div style={cleanupResultStyle}>✅ لم تُكتشف مجموعات مكررة في البيانات المحملة حالياً.</div>
              ) : (
                <ul>
                  {duplicateCandidates.map(([key, products]) => (
                    <li key={key}>{key}: {products.map((product) => product.canonicalNameAr).join("، ")}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </div>
    </DataTablePageFrame>
  );
}
