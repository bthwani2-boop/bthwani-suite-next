/**
 * administration-registry.ts
 *
 * العقل الحاكم لقسم الإدارة والصلاحيات وسلسلة الاعتماد عبر أسطح DSH.
 * يحدد التبويبات والمؤشرات ونطاق الوصول والمحاكاة لـ Maker/Checker والقرارات الحساسة.
 */

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type AdminMainTabId =
  | "overview"
  | "roles-permissions"
  | "users"
  | "approval-chain"
  | "maker-checker"
  | "sensitive-decisions";

export type AdminMainTabMeta = {
  readonly id: AdminMainTabId;
  readonly label: string;
  readonly badge?: number;
};

export const ADMIN_MAIN_TABS: readonly AdminMainTabMeta[] = [
  { id: "overview",            label: "نظرة عامة" },
  { id: "roles-permissions",   label: "الأدوار والصلاحيات" },
  { id: "users",               label: "المستخدمون" },
  { id: "approval-chain",      label: "سلسلة الاعتماد" },
  { id: "maker-checker",       label: "Maker / Checker" },
  { id: "sensitive-decisions",  label: "القرارات الحساسة", badge: 10 },
] as const;

// ─── KPIs Builder ──────────────────────────────────────────────────────────────

export type AdminKpiMetrics = {
  readonly rolesCount: number;
  readonly usersCount: number;
  readonly environmentMode: string;
};

export function buildAdminKpiMetrics(): AdminKpiMetrics {
  return {
    rolesCount: 6,
    usersCount: 5,
    environmentMode: "وضع تجريبي (Demo)",
  };
}

// ─── Scope Details Registry ───────────────────────────────────────────────────

export type AdminScopeDetails = {
  readonly currentDomain: string;
  readonly scope: string;
  readonly envMode: string;
  readonly authType: string;
};

export const ADMIN_SCOPE_DETAILS: AdminScopeDetails = {
  currentDomain: "نظرة عامة",
  scope: "صلاحيات Platform فقط",
  envMode: "محاكاة محلية (Demo)",
  authType: "لا يوجد — Mock فقط",
};

// ─── Ownership & Policy Registry ──────────────────────────────────────────────

export type AdminOwnershipInfo = {
  readonly title: string;
  readonly description: string;
  readonly platformRelationTitle: string;
  readonly platformRelationDesc: string;
};

export const ADMIN_OWNERSHIP: AdminOwnershipInfo = {
  title: "ملكية الإدارة",
  description:
    "administration يحكم الصلاحيات وسلسلة الاعتماد فقط، ولا يجب أن يتحول إلى مستودع logic تشغيلي أو مالي أو تسويقي.",
  platformRelationTitle: "صلة المنصة",
  platformRelationDesc:
    "صلاحيات هذه الشاشة تضبط من يرى المنصة ومن يعتمد تغييراته، لكنها لا تنفذ تغييرات platform أو DSH اليومية. كل الإجراءات هنا محاكاة UI فقط، بلا auth أو provider mutation حقيقي.",
};

// ─── Bottom Cards Registry ────────────────────────────────────────────────────

export type AdminBottomCardViewModel = {
  readonly id: string;
  readonly title: string;
  readonly value: string | number;
  readonly description: string;
};

export const ADMIN_BOTTOM_CARDS: readonly AdminBottomCardViewModel[] = [
  {
    id: "last-change",
    title: "آخر تغيير دور",
    value: "قبل أسبوع",
    description: "تعيين خالد النعماني كمشغّل Platform.",
  },
  {
    id: "pending-requests",
    title: "طلبات الوصول المعلقة",
    value: 1,
    description: "طلب وصول واحد بانتظار الاعتماد من حاكم المنصة.",
  },
  {
    id: "active-users",
    title: "المستخدمون النشطون",
    value: 4,
    description: "4 مستخدمون نشطون. 1 في انتظار الاعتماد.",
  },
  {
    id: "defined-roles",
    title: "الأدوار المعرّفة",
    value: 6,
    description:
      "Super Admin, Platform Governor, Platform Approver, Platform Operator, Finance Approver, Viewer.",
  },
] as const;

// ─── Status Footer Registry ───────────────────────────────────────────────────

export type AdminStatusFooterInfo = {
  readonly owner: string;
  readonly ownerPath: string;
  readonly activeServices: string;
  readonly status: string;
};

export const ADMIN_STATUS_FOOTER: AdminStatusFooterInfo = {
  owner: "administration / dsh-administration",
  ownerPath: "administration",
  activeServices: "1/1",
  status: "جاهز",
};
