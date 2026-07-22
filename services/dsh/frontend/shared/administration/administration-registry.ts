/**
 * Navigation and presentation metadata for the governed administration area.
 * Operational counts, role definitions, assignments, approvals, and audit data
 * are loaded from DSH; this file deliberately contains no runtime truth.
 */

export type AdminMainTabId =
  | "overview"
  | "roles-permissions"
  | "users"
  | "approval-chain"
  | "audit";

export type AdminMainTabMeta = {
  readonly id: AdminMainTabId;
  readonly label: string;
};

export const ADMIN_MAIN_TABS: readonly AdminMainTabMeta[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "roles-permissions", label: "الأدوار والصلاحيات" },
  { id: "users", label: "الموظفون والاعتمادات" },
  { id: "approval-chain", label: "Maker / Checker" },
  { id: "audit", label: "سجل التدقيق" },
] as const;

export const ADMINISTRATION_TRUTH_NOTICE = {
  title: "حدود الحقيقة الإدارية",
  description:
    "تعرض هذه المساحة إسقاطات DSH المعتمدة فقط. صلاحيات الجلسة الفعلية تصدر من Identity، وقرارات الشريك والكابتن تبقى لدى رحلاتها المالكة.",
} as const;

export function administrationStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "معلق";
    case "approved": return "معتمد";
    case "rejected": return "مرفوض";
    case "active": return "نشط";
    case "suspended": return "موقوف";
    case "blocked": return "محظور";
    case "partner_active": return "شريك نشط";
    case "ops_approved": return "معتمد تشغيليًا";
    case "submitted": return "مقدم للمراجعة";
    default: return status || "غير محدد";
  }
}
