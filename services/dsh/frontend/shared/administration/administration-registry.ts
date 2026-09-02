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

export function administrationExecutionStatusLabel(status: string): string {
  switch (status) {
    case "not_started": return "لم يبدأ التنفيذ";
    case "pending": return "بانتظار التنفيذ";
    case "reconciling": return "قيد المطابقة";
    case "retryable_failure": return "تعذر مؤقتًا — ستتم إعادة المحاولة";
    case "failed_terminal": return "فشل نهائي — أنشئ طلبًا بديلًا";
    case "applied": return "تم التحقق والتطبيق";
    default: return status || "حالة التنفيذ غير معروفة";
  }
}
