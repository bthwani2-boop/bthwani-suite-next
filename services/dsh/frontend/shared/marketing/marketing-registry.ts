import { colorRoles } from '@bthwani/ui-kit';
/**
 * marketing-registry.ts
 *
 * العقل الحاكم لقسم التسويق والحوكمة والنمو عبر أسطح DSH.
 * يحدد التبويبات والمؤشرات وبوابات الظهور والقرار السريع وإشارات التسليم.
 */

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type MarketingMainTabId =
  | "visibility-gates"
  | "smart-bar"
  | "banners-carousel"
  | "homepage-promos"
  | "video-studio"
  | "campaigns"
  | "partner-offers"
  | "image-product-review"
  | "benefits-subscriptions"
  | "growth"
  | "signals-measurement";

export type MarketingMainTabMeta = {
  readonly id: MarketingMainTabId;
  readonly label: string;
};

export const MARKETING_MAIN_TABS: readonly MarketingMainTabMeta[] = [
  { id: "visibility-gates",       label: "بوابات الظهور" },
  { id: "smart-bar",              label: "الشريط الذكي" },
  { id: "banners-carousel",       label: "البنرات والكاروسيل" },
  { id: "homepage-promos",        label: "بروموهات الرئيسية" },
  { id: "video-studio",           label: "استوديو الفيديو" },
  { id: "campaigns",              label: "الحملات" },
  { id: "partner-offers",         label: "عروض الشركاء" },
  { id: "image-product-review",   label: "مراجعة الصور والمنتجات" },
  { id: "benefits-subscriptions", label: "المزايا والاشتراك" },
  { id: "growth",                 label: "النمو" },
  { id: "signals-measurement",    label: "الإشارات والقياس" },
] as const;

// ─── Section Tab Registry ─────────────────────────────────────────────────────

export type MarketingSectionTabId = "eligibility" | "suppression" | "auditing" | "segments";

export type MarketingSectionTabMeta = {
  readonly id: MarketingSectionTabId;
  readonly label: string;
};

export const MARKETING_SECTION_TABS: readonly MarketingSectionTabMeta[] = [
  { id: "eligibility", label: "الأهلية" },
  { id: "suppression", label: "الكبت" },
  { id: "auditing",    label: "التدقيق" },
  { id: "segments",    label: "الفئات المستهدفة" },
] as const;

// ─── KPIs Builder ──────────────────────────────────────────────────────────────

export type MarketingKpiMetrics = {
  readonly partnerGatesActive: string; // e.g. "3/1"
  readonly blockedProductsActive: string; // e.g. "3/2"
  readonly commercialVisibilityBlocked: number;
  readonly unreadSignalsCount: number;
  readonly promoCandidatesCount: number;
  readonly isBackedByApi: false;
  readonly disclosureReason: string;
};

// FIX_REQUIRED: no rollup endpoint exists yet for these cross-entity KPIs
// (partner gate counts, blocked-product counts, unread signal/promo-candidate
// counts). Values below are static placeholders, not a live query — flagged
// via isBackedByApi/disclosureReason so the header cannot be mistaken for
// runtime truth (see zero_defect_closure_matrix in the marketing evidence dir).
export function buildMarketingKpiMetrics(): MarketingKpiMetrics {
  return {
    partnerGatesActive: "3/1",
    blockedProductsActive: "3/2",
    commercialVisibilityBlocked: 0,
    unreadSignalsCount: 4,
    promoCandidatesCount: 2,
    isBackedByApi: false,
    disclosureReason: "مؤشرات ثابتة (placeholder) — لا يوجد تكامل خلفي مجمّع لهذه الأرقام حتى الآن.",
  };
}

// ─── Governance Bridge Registry ───────────────────────────────────────────────

export type GovernanceBridgeId = "partners" | "catalogs" | "support";

export type GovernanceBridgeMeta = {
  readonly id: GovernanceBridgeId;
  readonly label: string;
  readonly targetRoute: string;
};

export const GOVERNANCE_BRIDGES: readonly GovernanceBridgeMeta[] = [
  { id: "partners", label: "أهلية الشريك (Partners) ←", targetRoute: "/dsh/partners" },
  { id: "catalogs", label: "اعتماد الصور والكتالوج (Catalogs) ←", targetRoute: "/dsh/catalogs" },
  { id: "support",  label: "إشارات الحوادث والتوصيات (Support) ←", targetRoute: "/dsh/support" },
] as const;

// ─── Partner Visibility Gate Cards ───────────────────────────────────────────

export type PartnerGateCardViewModel = {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly statusTag: string;
  readonly owner: string;
  readonly surface: string;
  readonly auditNote: string;
  readonly description: string;
  readonly statusColor: string;
  readonly primaryActionLabel: string;
};

export const PARTNER_GATE_CARDS: readonly PartnerGateCardViewModel[] = [
  {
    id: "docs-missing",
    title: "شريك ينتظر استكمال الوثائق قبل أي ظهور تسويقي",
    statusLabel: "وثائق مطلوبة غائبة أو غير مكتملة — لا يمكن المتابعة قبل رفعها",
    statusTag: "رفع الوثائق الناقصة من قبل الشريك لإتمام ملف الاعتماد",
    owner: "الشريك",
    surface: "تطبيق الشريك",
    auditNote: "بدون تدقيق إضافي",
    description: "بوابة تفعيل الشركاء تتحقق من جاهزية المتجر قبل إطلاق أي عروض تسويقية.",
    statusColor: colorRoles.brandAction, // Yellow
    primaryActionLabel: "فتح الإشارات",
  },
  {
    id: "ops-approval",
    title: "شريك أكمل أوضاع التوصيل لكنه لم يصل بعد إلى ظهور العميل",
    statusLabel: "قرار العمليات النهائي لم يُسجّل بعد — لا يجوز فتح المتجر للعميل قبل الموافقة.",
    statusTag: "رفع الملف للمراجعة التشغيلية النهائية",
    owner: "قسم الشركاء (CP)",
    surface: "لوحة التحكم",
    auditNote: "بدون تدقيق إضافي",
    description: "بوابة نشر المنتجات تضمن سلامة مواصفات وصور المنتج قبل النشر.",
    statusColor: colorRoles.brandAction, // Orange
    primaryActionLabel: "فتح إشارات التسليم",
  },
  {
    id: "ready",
    title: "شريك جاهز للحملات لأنه ظاهر فعلياً في app-client",
    statusLabel: "الإجراء التالي: صيانة الحالة والمراقبة التشغيلية",
    statusTag: "ظاهر للعميل",
    owner: "النظام (جميع الشروط مستوفاة)",
    surface: "تطبيق العميل",
    auditNote: "بدون تدقيق إضافي",
    description: "توقعات الظهور التجاري تقتصر على محاكاة العناصر المرئية للعملاء.",
    statusColor: colorRoles.brandStructure, // Green
    primaryActionLabel: "فتح الحملات",
  },
] as const;

// ─── Product Publishing Gate Cards ───────────────────────────────────────────

export type ProductGateCardViewModel = {
  readonly id: string;
  readonly title: string;
  readonly statusTag: string;
  readonly restrictionsCount: number;
  readonly isBlocked: boolean;
  readonly partnerGateStatus: string;
  readonly primaryActionLabel: string;
};

export const PRODUCT_GATE_CARDS: readonly ProductGateCardViewModel[] = [
  {
    id: "needs-mkt-review",
    title: "منتج بانتظار اعتماد التسويق للنشر",
    statusTag: "قيد مراجعة التسويق",
    restrictionsCount: 3,
    isBlocked: true,
    partnerGateStatus: "أنماط التوصيل جاهزة",
    primaryActionLabel: "فتح مراجعة الميديا",
  },
] as const;

// ─── Delivery Signals to Marketing ───────────────────────────────────────────

export type DeliverySignalCardViewModel = {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly source: string;
  readonly intakeId: string;
  readonly timeAgo: string;
  readonly isApproved: boolean;
};

export const DELIVERY_SIGNAL_CARDS: readonly DeliverySignalCardViewModel[] = [
  {
    id: "img-blurry",
    title: "المحتوى يحتاج تعديل تسويقي — صورة المنتج غير واضحة",
    statusLabel: "المحتوى يحتاج تعديل تسويقي",
    source: "cp/marketing/media-review",
    intakeId: "intake-4",
    timeAgo: "منذ 21 ساعة",
    isApproved: false,
  },
  {
    id: "pizza-approved",
    title: "تم اعتماد المحتوى تسويقياً — صورة بيتزا مارغريتا — شريك مطعم",
    statusLabel: "تم اعتماد المحتوى تسويقياً",
    source: "cp/marketing/media-review",
    intakeId: "mr-003",
    timeAgo: "منذ 7 ساعة",
    isApproved: true,
  },
  {
    id: "salad-blurry",
    title: "المحتوى يحتاج تعديل تسويقي — صورة سلطة يونانية — دقة منخفضة",
    statusLabel: "المحتوى يحتاج تعديل تسويقي",
    source: "cp/marketing/media-review",
    intakeId: "intake-5",
    timeAgo: "منذ 24 ساعة",
    isApproved: false,
  },
] as const;
