// Partner activation state machine — adapted from donor model.
// This is the canonical SSoT for partner lifecycle across all DSH surfaces.

import type { DshPartnerActivationStatus } from "./partner.types";

export type DshPartnerActivationActorSurface =
  | "app-field"
  | "app-partner"
  | "control-panel"
  | "system";

export type DshPartnerActivationStateMetadata = {
  readonly status: DshPartnerActivationStatus;
  readonly ownerSurface: DshPartnerActivationActorSurface;
  readonly actorResponsible: string;
  readonly visibleToPartner: boolean;
  readonly visibleToField: boolean;
  readonly visibleToControlPanel: boolean;
  readonly visibleToClient: boolean;
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly auditRequired: boolean;
  readonly allowedNextStatuses: ReadonlyArray<DshPartnerActivationStatus>;
};

export const DSH_PARTNER_ACTIVATION_STATES: ReadonlyArray<DshPartnerActivationStateMetadata> = [
  {
    status: "draft",
    ownerSurface: "app-field",
    actorResponsible: "الميداني",
    visibleToPartner: true,
    visibleToField: true,
    visibleToControlPanel: false,
    visibleToClient: false,
    nextAction: "إتمام جمع البيانات الأساسية وإرسال ملف الشريك",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["submitted", "field_visit_scheduled"],
  },
  {
    status: "submitted",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: true,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة الملف المُرسَل من الميدان وتحديد الخطوة التالية",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["field_visit_scheduled", "documents_missing", "documents_uploaded"],
  },
  {
    status: "field_visit_scheduled",
    ownerSurface: "app-field",
    actorResponsible: "الميداني",
    visibleToPartner: false,
    visibleToField: true,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "تنفيذ الزيارة الميدانية وجمع الأدلة المطلوبة",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["field_visit_completed", "documents_missing"],
  },
  {
    status: "field_visit_completed",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: false,
    visibleToField: true,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة أدلة الزيارة والانتقال للتحقق من الوثائق",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["documents_missing", "documents_uploaded"],
  },
  {
    status: "documents_missing",
    ownerSurface: "app-partner",
    actorResponsible: "الشريك",
    visibleToPartner: true,
    visibleToField: true,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "رفع الوثائق الناقصة من قِبل الشريك لإتمام ملف الاعتماد",
    blockedReason: "وثائق مطلوبة غائبة أو غير مكتملة — لا يمكن المتابعة قبل رفعها",
    auditRequired: false,
    allowedNextStatuses: ["documents_uploaded"],
  },
  {
    status: "documents_uploaded",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة الوثائق المرفوعة والتحقق من صحتها",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["documents_verified", "documents_missing"],
  },
  {
    status: "documents_verified",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "الانتقال لمرحلة تجهيز الكتالوج والمنتجات",
    blockedReason: "",
    auditRequired: true,
    allowedNextStatuses: ["catalog_not_ready", "ops_review"],
  },
  {
    status: "catalog_not_ready",
    ownerSurface: "app-partner",
    actorResponsible: "الشريك + قسم الكتالوج (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "إضافة المنتجات وإعداد الكتالوج وطلب الاعتماد",
    blockedReason: "الكتالوج فارغ أو غير معتمد — لا يمكن الظهور للعملاء قبل اعتماد الكتالوج",
    auditRequired: false,
    allowedNextStatuses: ["catalog_ready", "ops_review"],
  },
  {
    status: "catalog_ready",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الكتالوج (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "التحقق من تهيئة أوضاع التوصيل",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["delivery_modes_not_ready", "delivery_modes_ready"],
  },
  {
    status: "delivery_modes_not_ready",
    ownerSurface: "app-partner",
    actorResponsible: "الشريك + قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "تهيئة وتأكيد أوضاع التوصيل المدعومة",
    blockedReason: "أوضاع التوصيل غير مكتملة — يجب تحديد طريقة توصيل واحدة على الأقل",
    auditRequired: false,
    allowedNextStatuses: ["delivery_modes_ready"],
  },
  {
    status: "delivery_modes_ready",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "رفع الملف للمراجعة التشغيلية النهائية",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["ops_review"],
  },
  {
    status: "ops_review",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP) — مراجعة نهائية",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة الملف الكامل واتخاذ قرار التفعيل أو الرفض مع ذكر السبب",
    blockedReason: "",
    auditRequired: true,
    allowedNextStatuses: ["ops_approved", "ops_rejected"],
  },
  {
    status: "ops_approved",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "تفعيل الشريك وتحويله لحالة نشط",
    blockedReason: "",
    auditRequired: true,
    allowedNextStatuses: ["partner_active"],
  },
  {
    status: "ops_rejected",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "إبلاغ الشريك بالسبب وتحديد المسار لإعادة المحاولة",
    blockedReason: "رُفض الشريك من قِبل العمليات — يرجى مراجعة التفاصيل وإعادة التقديم",
    auditRequired: true,
    allowedNextStatuses: ["submitted", "documents_missing"],
  },
  {
    status: "partner_active",
    ownerSurface: "system",
    actorResponsible: "النظام (مدار من CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "التحقق من اجتياز جميع شروط الظهور لتمكين client_visible",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["client_visible", "client_hidden", "partner_deactivated"],
  },
  {
    status: "partner_deactivated",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة سبب الإيقاف وتحديد مسار إعادة التفعيل إن أمكن",
    blockedReason: "الشريك موقوف — يختفي فورًا من قائمة المتاجر لدى العميل",
    auditRequired: true,
    allowedNextStatuses: ["ops_review", "submitted"],
  },
  {
    status: "client_visible",
    ownerSurface: "system",
    actorResponsible: "النظام (جميع الشروط مستوفاة)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: true,
    nextAction: "صيانة الحالة والمراقبة التشغيلية",
    blockedReason: "",
    auditRequired: false,
    allowedNextStatuses: ["client_hidden", "partner_deactivated"],
  },
  {
    status: "client_hidden",
    ownerSurface: "control-panel",
    actorResponsible: "قسم الشركاء (CP)",
    visibleToPartner: true,
    visibleToField: false,
    visibleToControlPanel: true,
    visibleToClient: false,
    nextAction: "مراجعة سبب الإخفاء ورفع القيد عند الجاهزية",
    blockedReason: "الشريك نشط لكن مخفي من اكتشاف العملاء — تجاوز تشغيلي أو خارج النطاق",
    auditRequired: true,
    allowedNextStatuses: ["client_visible", "partner_deactivated"],
  },
];

export function getPartnerStateMetadata(
  status: DshPartnerActivationStatus,
): DshPartnerActivationStateMetadata {
  return DSH_PARTNER_ACTIVATION_STATES.find((s) => s.status === status)!;
}

export function getPartnerActivationStatusLabel(status: DshPartnerActivationStatus): string {
  const labels: Record<DshPartnerActivationStatus, string> = {
    draft: "مسودة",
    submitted: "مُرسَل للمراجعة",
    field_visit_scheduled: "زيارة ميدانية مجدولة",
    field_visit_completed: "الزيارة مكتملة",
    documents_missing: "وثائق ناقصة",
    documents_uploaded: "وثائق مرفوعة",
    documents_verified: "وثائق معتمدة",
    catalog_not_ready: "الكتالوج غير جاهز",
    catalog_ready: "الكتالوج جاهز",
    delivery_modes_not_ready: "أوضاع التوصيل غير مهيأة",
    delivery_modes_ready: "أوضاع التوصيل جاهزة",
    ops_review: "مراجعة العمليات",
    ops_approved: "معتمد من العمليات",
    ops_rejected: "مرفوض من العمليات",
    partner_active: "الشريك نشط",
    partner_deactivated: "الشريك موقوف",
    client_visible: "ظاهر للعملاء",
    client_hidden: "مخفي من العملاء",
  };
  return labels[status] ?? status;
}

export function isClientVisible(status: DshPartnerActivationStatus): boolean {
  return status === "client_visible";
}

export function isPartnerSubmitted(status: DshPartnerActivationStatus): boolean {
  return status !== "draft";
}
