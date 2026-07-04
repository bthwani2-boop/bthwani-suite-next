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

export function buildAdminKpiMetrics(usersCount: number): AdminKpiMetrics {
  return {
    rolesCount: ADMIN_ROLES.length,
    usersCount,
    environmentMode: "وضع تجريبي (محاكاة)",
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
  envMode: "محاكاة محلية",
  authType: "لا يوجد — محاكاة فقط",
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

// ── Admin Role UI Types & Mock Data ──────────────────────────────────────────
// These are display-only role definitions for the administration panel UI.
// No real auth mutation happens here — محاكاة UI فقط.

import type { DshRoleId } from '../identity-access/dsh-role-permission.model';

export type AdminRole = {
  readonly id: DshRoleId;
  readonly name: string;
  readonly arabicName: string;
  readonly description: string;
  readonly tone: "danger" | "warning" | "success" | "brand" | "neutral" | "default";
  readonly permissions: readonly string[];
};

export const ADMIN_ROLES: readonly AdminRole[] = [
  { id: 'super-admin', name: 'Super Admin', arabicName: 'مسؤول أعلى', description: 'كامل الصلاحيات الفنية والتشغيلية والإدارية.', tone: 'danger', permissions: ['manage-roles', 'manage-users', 'approve-chain', 'override-sla', 'platform-vars-rollback'] },
  { id: 'platform-governor', name: 'Platform Governor', arabicName: 'حاكم المنصة', description: 'ضبط السياسات وإقرار التراجع وطلب التعليق.', tone: 'warning', permissions: ['approve-chain', 'override-sla', 'platform-vars-rollback'] },
  { id: 'platform-approver', name: 'Platform Approver', arabicName: 'معتمد المنصة', description: 'اعتماد الشركاء ونشر الكتالوج وتصعيد الحوادث.', tone: 'success', permissions: ['activate-partner', 'publish-catalog', 'reassign-dispatch', 'escalate-support'] },
  { id: 'platform-operator', name: 'Platform Operator', arabicName: 'مشغّل المنصة', description: 'استعراض البيانات، تقديم طلبات التفعيل، وإسناد التذاكر.', tone: 'brand', permissions: ['view-dashboard', 'submit-partner-activation', 'submit-catalog-approval', 'reassign-dispatch'] },
  { id: 'finance-approver', name: 'Finance Approver', arabicName: 'معتمد مالي', description: 'عرض التقارير والعمولات والمستحقات (قراءة فقط من WLT).', tone: 'neutral', permissions: ['view-finance-readonly'] },
  { id: 'viewer', name: 'Viewer', arabicName: 'مراقب', description: 'رصد تشغيلي وقراءة فقط لكامل أسطح لوحة التحكم.', tone: 'default', permissions: ['view-dashboard'] }
] as const;

export const ADMIN_PLATFORM_PERMISSIONS = [
  { id: 'activate-partner', name: 'تفعيل الشركاء', scope: 'partners', description: 'الموافقة النهائية على تنشيط المتاجر.' },
  { id: 'publish-catalog', name: 'نشر الكتالوج', scope: 'catalogs', description: 'إتاحة المنتجات للعملاء في التطبيق.' },
  { id: 'reassign-dispatch', name: 'إعادة إسناد الطلب', scope: 'operations', description: 'تحويل الطلب لكابتن آخر عند الطوارئ.' },
  { id: 'override-sla', name: 'تجاوز SLA', scope: 'operations', description: 'تعطيل أو استثناء شروط وقت التوصيل.' },
  { id: 'platform-vars-rollback', name: 'التراجع عن المتغيرات', scope: 'platform', description: 'التراجع الفوري لإصلاح الأعطال.' },
  { id: 'view-finance-readonly', name: 'عرض المالية', scope: 'finance', description: 'قراءة تقارير WLT بدون إمكانية التعديل.' }
] as const;

export const ALL_DSH_ROLE_IDS: readonly DshRoleId[] = [
  'super-admin',
  'platform-governor',
  'platform-approver',
  'platform-operator',
  'finance-approver',
  'viewer',
] as const;

