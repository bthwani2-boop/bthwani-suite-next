/**
 * catalog-registry.ts
 *
 * العقل الحاكم لواجهات قسم الكتالوج عبر جميع أسطح DSH.
 * كل سطح (control-panel / app-partner / app-client) يستهلك هذه التعريفات
 * دون أي hardcode في الواجهة.
 */

import type { CatalogSubmission, CatalogProduct, CatalogCategory } from "./catalog.types";

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type CatalogMainTabId =
  | "catalog"
  | "marketing"
  | "publishing"
  | "partners"
  | "approval-path";

export type CatalogMainTabMeta = {
  readonly id: CatalogMainTabId;
  readonly label: string;
};

export const CATALOG_MAIN_TABS: readonly CatalogMainTabMeta[] = [
  { id: "catalog",       label: "الكتالوج"       },
  { id: "marketing",     label: "التسويق"        },
  { id: "publishing",    label: "النشر"         },
  { id: "partners",      label: "الشركاء"       },
  { id: "approval-path", label: "مسار الاعتماد" },
] as const;

// ─── Sub-Tab Registry ─────────────────────────────────────────────────────────

export type CatalogSubTabId =
  | "master-registry"
  | "category-tree"
  | "intake-referral"
  | "linking"
  | "conditions-quality"
  | "governance"
  | "publishing-visibility";

export type CatalogSubTabMeta = {
  readonly id: CatalogSubTabId;
  readonly label: string;
  readonly parentTab: CatalogMainTabId;
};

export const CATALOG_SUB_TABS: readonly CatalogSubTabMeta[] = [
  { id: "master-registry",       label: "السجل الرئيسي",              parentTab: "catalog"    },
  { id: "category-tree",         label: "شجرة الفئات والتصنيفات",     parentTab: "catalog"    },
  { id: "intake-referral",       label: "الاستلام والإحالة",           parentTab: "catalog"    },
  { id: "linking",               label: "الارتباط والتسويلة",          parentTab: "catalog"    },
  { id: "conditions-quality",    label: "الاشتراطات والجودة",          parentTab: "catalog"    },
  { id: "governance",            label: "الربط والحوكمة",              parentTab: "catalog"    },
  { id: "publishing-visibility", label: "النشر والرؤية",               parentTab: "publishing" },
] as const;

export function getCatalogSubTabsForMain(mainTab: CatalogMainTabId): readonly CatalogSubTabMeta[] {
  return CATALOG_SUB_TABS.filter((t) => t.parentTab === mainTab || t.parentTab === "catalog" && mainTab === "approval-path");
}

// ─── Smart Filter Registry ────────────────────────────────────────────────────

export type CatalogSmartFilterId =
  | "all"
  | "active"
  | "flagged"
  | "review"
  | "needs-image"
  | "needs-link"
  | "partner"
  | "central"
  | "exposed"
  | "activity";

export type CatalogSmartFilterMeta = {
  readonly id: CatalogSmartFilterId;
  readonly label: string;
};

export const CATALOG_SMART_FILTERS: readonly CatalogSmartFilterMeta[] = [
  { id: "all",         label: "الكل"           },
  { id: "active",      label: "نشط"           },
  { id: "flagged",     label: "نقط"           },
  { id: "review",      label: "مراجعة"        },
  { id: "needs-image", label: "بتاج صورة"     },
  { id: "needs-link",  label: "بتاج ربط"      },
  { id: "partner",     label: "شريك"         },
  { id: "central",     label: "مركزي"        },
  { id: "exposed",     label: "عرض"           },
  { id: "activity",    label: "تعرض"          },
] as const;

// ─── Toolbar Actions Registry ─────────────────────────────────────────────────

export type CatalogToolbarActionId =
  | "quick-suspend"
  | "set-image-policy"
  | "add-catalog-adjustment";

export type CatalogToolbarActionMeta = {
  readonly id: CatalogToolbarActionId;
  readonly label: string;
};

export const CATALOG_TOOLBAR_ACTIONS: readonly CatalogToolbarActionMeta[] = [
  { id: "quick-suspend",        label: "إيقاف سريع (مسودة)"           },
  { id: "set-image-policy",     label: "تعيين سياسة صور المجموعة" },
  { id: "add-catalog-adjustment",label: "إضافة ضبط الكتالوج"          },
] as const;

// ─── Breadcrumb Builder ──────────────────────────────────────────────────────────

export function buildCatalogBreadcrumb(
  mainTab: CatalogMainTabId,
  subTab: CatalogSubTabId,
  recordCount: number,
): string {
  const mainLabel = CATALOG_MAIN_TABS.find((t) => t.id === mainTab)?.label ?? "الكتالوج";
  const subLabel  = CATALOG_SUB_TABS.find((t) => t.id === subTab)?.label  ?? "السجل الرئيسي";
  return `${mainLabel} › ${subLabel} › الكل (${recordCount} سجل)`;
}

// ─── Scope Filter Registry ────────────────────────────────────────────────────

export type CatalogScopeId = "all" | "central" | "store-specific";

export type CatalogScopeMeta = {
  readonly id: CatalogScopeId;
  readonly label: string;
};

export const CATALOG_SCOPES: readonly CatalogScopeMeta[] = [
  { id: "all",            label: "الكل"          },
  { id: "central",        label: "مركزي"         },
  { id: "store-specific", label: "سجلات فرية"   },
] as const;

// ─── Partner Catalog Tab Registry ─────────────────────────────────────────────
// Used by app-partner surface only.

export type PartnerCatalogTabId = "products" | "categories" | "submissions";

export type PartnerCatalogTabMeta = {
  readonly id: PartnerCatalogTabId;
  readonly label: string;
};

export const PARTNER_CATALOG_TABS: readonly PartnerCatalogTabMeta[] = [
  { id: "products",    label: "المنتجات"  },
  { id: "categories",  label: "الفئات"    },
  { id: "submissions", label: "الطلبات"   },
] as const;

// ─── KPI Builder ──────────────────────────────────────────────────────────────

export type CatalogKpiMetrics = {
  readonly activityExposures: number;
  readonly pendingApproval: number;
  readonly totalProducts: number;
};

export function buildCatalogKpiMetrics(
  submissions: readonly CatalogSubmission[],
  totalProductsOverride?: number | undefined,
): CatalogKpiMetrics {
  const pendingApproval = submissions.filter((s) => s.status === "submitted").length;
  return {
    activityExposures: 0,                                   // enriched by analytics layer if available
    pendingApproval,
    totalProducts: totalProductsOverride ?? 0,
  };
}

// ─── Submission View Model ────────────────────────────────────────────────────

export type CatalogPublicationRequirementId =
  | "active-product"
  | "sku-present"
  | "price-present"
  | "active-category"
  | "media-complete"
  | "stock-available";

export type CatalogPublicationRequirementSummary = {
  readonly id: CatalogPublicationRequirementId;
  readonly label: string;
  readonly satisfiedCount: number;
  readonly blockedCount: number;
  readonly percent: number;
};

export type CatalogPublicationReadinessSummary = {
  readonly totalProducts: number;
  readonly readyProducts: number;
  readonly blockedProducts: number;
  readonly readyPercent: number;
  readonly requirements: readonly CatalogPublicationRequirementSummary[];
};

type CatalogPublicationRequirement = {
  readonly id: CatalogPublicationRequirementId;
  readonly label: string;
  readonly check: (product: CatalogProduct, activeCategoryIds: ReadonlySet<string>) => boolean;
};

const CATALOG_PUBLICATION_REQUIREMENTS: readonly CatalogPublicationRequirement[] = [
  {
    id: "active-product",
    label: "المنتج نشط",
    check: (product) => product.isActive,
  },
  {
    id: "sku-present",
    label: "هوية SKU موجودة",
    check: (product) => product.sku.trim().length > 0,
  },
  {
    id: "price-present",
    label: "السعر موجود",
    check: (product) => product.priceReference.trim().length > 0,
  },
  {
    id: "active-category",
    label: "الفئة مربوطة ونشطة",
    check: (product, activeCategoryIds) =>
      product.categoryId !== null && activeCategoryIds.has(product.categoryId),
  },
  {
    id: "media-complete",
    label: "وسائط المنتج مكتملة",
    check: (product) =>
      product.media.some((media) => media.state === "complete" && media.publicUrl !== null),
  },
  {
    id: "stock-available",
    label: "المخزون قابل للعرض",
    check: (product) => (product.stockStatus ?? "in_stock") !== "out_of_stock",
  },
] as const;

export function buildCatalogPublicationReadiness(
  products: readonly CatalogProduct[],
  categories: readonly CatalogCategory[],
): CatalogPublicationReadinessSummary {
  const activeCategoryIds = new Set(
    categories.filter((category) => category.isActive).map((category) => category.id),
  );
  const totalProducts = products.length;
  const readyProducts = products.filter((product) =>
    CATALOG_PUBLICATION_REQUIREMENTS.every((requirement) =>
      requirement.check(product, activeCategoryIds),
    ),
  ).length;

  return {
    totalProducts,
    readyProducts,
    blockedProducts: totalProducts - readyProducts,
    readyPercent: totalProducts > 0 ? Math.round((readyProducts / totalProducts) * 100) : 0,
    requirements: CATALOG_PUBLICATION_REQUIREMENTS.map((requirement) => {
      const satisfiedCount = products.filter((product) =>
        requirement.check(product, activeCategoryIds),
      ).length;
      return {
        id: requirement.id,
        label: requirement.label,
        satisfiedCount,
        blockedCount: totalProducts - satisfiedCount,
        percent: totalProducts > 0 ? Math.round((satisfiedCount / totalProducts) * 100) : 0,
      };
    }),
  };
}

export type CatalogSubmissionTone = "warning" | "success" | "danger" | "neutral";

export type CatalogSubmissionViewModel = {
  readonly id: string;
  readonly storeId: string;
  readonly revision: number;
  readonly statusLabel: string;
  readonly statusTone: CatalogSubmissionTone;
  readonly isPending: boolean;
  readonly isApproved: boolean;
  readonly isRejected: boolean;
  readonly submittedBy: string;
  readonly createdAt: string;
};

export function buildCatalogSubmissionViewModel(
  submission: CatalogSubmission,
): CatalogSubmissionViewModel {
  const statusMap: Record<CatalogSubmission["status"], { label: string; tone: CatalogSubmissionTone }> = {
    submitted: { label: "بانتظار الاعتماد", tone: "warning" },
    approved:  { label: "معتمد",             tone: "success" },
    rejected:  { label: "مرفوض",             tone: "danger"  },
  };
  const { label, tone } = statusMap[submission.status];
  return {
    id: submission.id,
    storeId: submission.storeId,
    revision: submission.revision,
    statusLabel: label,
    statusTone: tone,
    isPending: submission.status === "submitted",
    isApproved: submission.status === "approved",
    isRejected: submission.status === "rejected",
    submittedBy: submission.submittedBy,
    createdAt: submission.createdAt,
  };
}

// ─── Product Row View Model ───────────────────────────────────────────────────

export type CatalogProductStockTone = "success" | "warning" | "danger" | "neutral";

export type CatalogProductRowViewModel = {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly sku: string;
  readonly description: string;
  readonly priceReference: string;
  readonly originalPriceReference: string | undefined;
  readonly hasDiscount: boolean;
  readonly discountLabel: string | undefined;
  readonly unitLabel: string | undefined;
  readonly isActive: boolean;
  readonly statusLabel: string;
  readonly statusTone: "success" | "neutral";
  readonly stockLabel: string;
  readonly stockTone: CatalogProductStockTone;
  readonly categoryId: string | null;
  readonly primaryImageUrl: string | undefined;
};

export function buildCatalogProductRowViewModel(
  product: CatalogProduct,
): CatalogProductRowViewModel {
  const stockMap: Record<
    NonNullable<CatalogProduct["stockStatus"]>,
    { label: string; tone: CatalogProductStockTone }
  > = {
    in_stock:    { label: "متوفر",  tone: "success" },
    low_stock:   { label: "منخفض", tone: "warning"  },
    out_of_stock:{ label: "نفد",    tone: "danger"   },
  };

  const stockStatus = product.stockStatus ?? "in_stock";
  const { label: stockLabel, tone: stockTone } = stockMap[stockStatus];
  const primaryMedia = product.media.find((m) => m.state === "complete" && m.publicUrl !== null);
  const hasDiscount =
    product.originalPriceReference !== undefined &&
    product.originalPriceReference !== product.priceReference;

  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    sku: product.sku,
    description: product.description,
    priceReference: product.priceReference,
    originalPriceReference: product.originalPriceReference,
    hasDiscount,
    discountLabel: hasDiscount && product.discountPercent !== undefined
      ? `${product.discountPercent}%`
      : undefined,
    unitLabel: product.unitLabel,
    isActive: product.isActive,
    statusLabel: product.isActive ? "نشط" : "متوقف",
    statusTone: product.isActive ? "success" : "neutral",
    stockLabel,
    stockTone,
    categoryId: product.categoryId,
    primaryImageUrl: primaryMedia?.publicUrl ?? undefined,
  };
}

// ─── Category View Model ──────────────────────────────────────────────────────

export type CatalogCategoryViewModel = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isActive: boolean;
  readonly statusLabel: string;
  readonly statusTone: "success" | "neutral";
  readonly sortOrder: number;
};

export function buildCatalogCategoryViewModel(
  category: CatalogCategory,
): CatalogCategoryViewModel {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    statusLabel: category.isActive ? "نشطة" : "مخفية",
    statusTone: category.isActive ? "success" : "neutral",
    sortOrder: category.sortOrder,
  };
}

// ─── Scope Filter Helper ──────────────────────────────────────────────────────

export function filterSubmissionsByScope(
  submissions: readonly CatalogSubmission[],
  scope: CatalogScopeId,
): readonly CatalogSubmission[] {
  if (scope === "all") return submissions;
  if (scope === "central") return submissions.filter((s) => s.storeId.startsWith("central"));
  return submissions.filter((s) => !s.storeId.startsWith("central"));
}

export function filterProductsByQuery(
  products: readonly CatalogProduct[],
  query: string,
): readonly CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  );
}

export function filterCategoriesByQuery(
  categories: readonly CatalogCategory[],
  query: string,
): readonly CatalogCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return categories;
  return categories.filter((c) => c.name.toLowerCase().includes(q));
}
