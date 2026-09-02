// Presentation metadata for the backend-owned partner lifecycle.
// Status transitions, permissions, and readiness are never decided here.

export type DshPartnerActivationStatus =
  | 'draft'
  | 'submitted'
  | 'field_visit_scheduled'
  | 'field_visit_completed'
  | 'documents_missing'
  | 'documents_uploaded'
  | 'documents_verified'
  | 'catalog_not_ready'
  | 'catalog_ready'
  | 'delivery_modes_not_ready'
  | 'delivery_modes_ready'
  | 'ops_review'
  | 'ops_approved'
  | 'ops_rejected'
  | 'partner_active'
  | 'partner_suspended'
  | 'partner_terminated'
  | 'client_visible'
  | 'client_hidden';

export type DshPartnerActivationActorSurface = 'app-field' | 'app-partner' | 'control-panel' | 'system';

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

export type DshPartnerDecisionCommandId =
  | 'preliminary_accept'
  | 'request_missing_documents'
  | 'schedule_field_visit'
  | 'reject_partner'
  | 'approve_documents'
  | 'start_ops_review'
  | 'approve_ops'
  | 'activate_partner'
  | 'show_store_to_client'
  | 'hide_store_from_client'
  | 'terminate_partner';

export type DshPartnerDecisionCommand = {
  readonly id: DshPartnerDecisionCommandId;
  readonly label: string;
  readonly description: string;
  readonly targetStatus: DshPartnerActivationStatus;
  readonly reasonRequired: boolean;
};

const meta = (
  status: DshPartnerActivationStatus,
  ownerSurface: DshPartnerActivationActorSurface,
  actorResponsible: string,
  nextAction: string,
  blockedReason: string,
  auditRequired: boolean,
  allowedNextStatuses: ReadonlyArray<DshPartnerActivationStatus>,
  visibleToPartner = true,
  visibleToField = false,
  visibleToClient = false,
): DshPartnerActivationStateMetadata => ({
  status,
  ownerSurface,
  actorResponsible,
  visibleToPartner,
  visibleToField,
  visibleToControlPanel: true,
  visibleToClient,
  nextAction,
  blockedReason,
  auditRequired,
  allowedNextStatuses,
});

export const DSH_PARTNER_ACTIVATION_STATES: ReadonlyArray<DshPartnerActivationStateMetadata> = [
  meta('draft', 'app-field', 'الميداني', 'إتمام جمع البيانات الأساسية وإرسال ملف الشريك', '', false, ['submitted', 'field_visit_scheduled'], true, true),
  meta('submitted', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة الملف المُرسَل من الميدان وتحديد الخطوة التالية', '', false, ['field_visit_scheduled', 'documents_missing', 'documents_uploaded'], true, true),
  meta('field_visit_scheduled', 'app-field', 'الميداني', 'تنفيذ الزيارة الميدانية وجمع الأدلة المطلوبة', '', false, ['field_visit_completed', 'documents_missing'], false, true),
  meta('field_visit_completed', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة أدلة الزيارة والانتقال للتحقق من الوثائق', '', false, ['documents_missing', 'documents_uploaded'], false, true),
  meta('documents_missing', 'app-partner', 'الشريك', 'رفع الوثائق الناقصة لإتمام ملف الاعتماد', 'وثائق مطلوبة غائبة أو غير مكتملة', false, ['documents_uploaded'], true, true),
  meta('documents_uploaded', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة الوثائق المرفوعة والتحقق من صحتها', '', false, ['documents_verified', 'documents_missing']),
  meta('documents_verified', 'control-panel', 'قسم الشركاء (CP)', 'الانتقال لتجهيز الكتالوج والمنتجات', '', true, ['catalog_not_ready', 'ops_review']),
  meta('catalog_not_ready', 'app-partner', 'الشريك + قسم الكتالوج (CP)', 'إضافة المنتجات وإعداد الكتالوج وطلب الاعتماد', 'الكتالوج غير جاهز للنشر', false, ['catalog_ready', 'ops_review']),
  meta('catalog_ready', 'control-panel', 'قسم الكتالوج (CP)', 'التحقق من تهيئة أوضاع التوصيل', '', false, ['delivery_modes_not_ready', 'delivery_modes_ready']),
  meta('delivery_modes_not_ready', 'app-partner', 'الشريك + قسم الشركاء (CP)', 'تهيئة وتأكيد أوضاع التوصيل المدعومة', 'أوضاع التوصيل غير مكتملة', false, ['delivery_modes_ready']),
  meta('delivery_modes_ready', 'control-panel', 'قسم الشركاء (CP)', 'رفع الملف للمراجعة التشغيلية النهائية', '', false, ['ops_review']),
  meta('ops_review', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة الملف الكامل واتخاذ قرار التفعيل أو الرفض', '', true, ['ops_approved', 'ops_rejected']),
  meta('ops_approved', 'control-panel', 'قسم الشركاء (CP)', 'تفعيل الشريك وتحويله لحالة نشط', '', true, ['partner_active']),
  meta('ops_rejected', 'control-panel', 'قسم الشركاء (CP)', 'إبلاغ الشريك بالسبب وتحديد مسار إعادة المحاولة', 'رُفض الشريك من قِبل العمليات', true, ['submitted', 'documents_missing']),
  meta('partner_active', 'system', 'النظام (مدار من CP)', 'التحقق من اجتياز شروط الظهور لتمكين client_visible', '', false, ['client_visible', 'client_hidden', 'partner_suspended', 'partner_terminated']),
  meta('partner_suspended', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة سبب الإيقاف ورفع الإيقاف بقرار موثق أو إنهاء الشريك', 'الشريك موقوف تشغيليًا — لا يمكنه إدارة المتجر أو الظهور للعملاء', true, ['partner_active', 'partner_terminated']),
  meta('partner_terminated', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة سبب الإنهاء وتوثيق القرار', 'الشريك منتهٍ ويختفي من قائمة العملاء', true, []),
  meta('client_visible', 'system', 'النظام (جميع الشروط مستوفاة)', 'صيانة الحالة والمراقبة التشغيلية', '', false, ['client_hidden', 'partner_suspended', 'partner_terminated'], true, false, true),
  meta('client_hidden', 'control-panel', 'قسم الشركاء (CP)', 'مراجعة سبب الإخفاء ورفع القيد عند الجاهزية', 'الشريك نشط لكن مخفي من اكتشاف العملاء', true, ['client_visible', 'partner_suspended', 'partner_terminated']),
];

export function getDshPartnerActivationStateMetadata(
  status: DshPartnerActivationStatus,
): DshPartnerActivationStateMetadata | undefined {
  return DSH_PARTNER_ACTIVATION_STATES.find((candidate) => candidate.status === status);
}

export function isDshPartnerClientVisible(status: DshPartnerActivationStatus): boolean {
  return status === 'client_visible';
}

export function isDshPartnerActivationComplete(status: DshPartnerActivationStatus): boolean {
  return status === 'partner_active' || status === 'client_visible' || status === 'client_hidden';
}

export function getDshPartnerActivationProgress(status: DshPartnerActivationStatus): number {
  switch (status) {
    case 'submitted': return 70;
    case 'field_visit_scheduled': return 50;
    case 'field_visit_completed': return 60;
    case 'documents_missing': return 40;
    case 'documents_uploaded': return 65;
    case 'documents_verified': return 80;
    case 'catalog_ready': return 85;
    case 'ops_review': return 90;
    case 'ops_approved':
    case 'partner_active':
    case 'partner_suspended':
    case 'client_visible':
    case 'client_hidden': return 100;
    case 'ops_rejected': return 40;
    default: return 20;
  }
}

export function getDshPartnerActivationStatusLabel(status: DshPartnerActivationStatus): string {
  const labels: Record<DshPartnerActivationStatus, string> = {
    draft: 'مسودة',
    submitted: 'مُرسَل للمراجعة',
    field_visit_scheduled: 'زيارة ميدانية مجدولة',
    field_visit_completed: 'الزيارة مكتملة',
    documents_missing: 'وثائق ناقصة',
    documents_uploaded: 'وثائق مرفوعة',
    documents_verified: 'وثائق معتمدة',
    catalog_not_ready: 'الكتالوج غير جاهز',
    catalog_ready: 'الكتالوج جاهز',
    delivery_modes_not_ready: 'أوضاع التوصيل غير مهيأة',
    delivery_modes_ready: 'أوضاع التوصيل جاهزة',
    ops_review: 'مراجعة العمليات',
    ops_approved: 'معتمد من العمليات',
    ops_rejected: 'مرفوض من العمليات',
    partner_active: 'الشريك نشط',
    partner_suspended: 'الشريك موقوف',
    partner_terminated: 'الشريك منتهٍ',
    client_visible: 'ظاهر للعملاء',
    client_hidden: 'مخفي من العملاء',
  };
  return labels[status] ?? status;
}

export type DshPartnerVisibilityBadge = 'active' | 'closed' | 'busy' | 'out-of-zone' | 'hidden-pending-approval' | 'catalog-not-ready' | 'suspended';

export function getDshPartnerVisibilityBadge(
  status: DshPartnerActivationStatus,
  storeOpen: boolean,
  busy = false,
  inZone = true,
): DshPartnerVisibilityBadge {
  if (status === 'partner_suspended') return 'suspended';
  if (status === 'client_visible' || status === 'partner_active') {
    if (!inZone) return 'out-of-zone';
    if (!storeOpen) return 'closed';
    if (busy) return 'busy';
    return 'active';
  }
  if (status === 'catalog_not_ready' || status === 'delivery_modes_not_ready' || status === 'catalog_ready' || status === 'delivery_modes_ready') {
    return 'catalog-not-ready';
  }
  return 'hidden-pending-approval';
}

export function getDshPartnerVisibilityBadgeLabel(badge: DshPartnerVisibilityBadge): string {
  switch (badge) {
    case 'active': return 'مفتوح';
    case 'closed': return 'مغلق الآن';
    case 'busy': return 'مشغول';
    case 'out-of-zone': return 'خارج نطاق التوصيل';
    case 'hidden-pending-approval': return 'ليس شريكًا معتمدًا';
    case 'catalog-not-ready': return 'الكتالوج غير جاهز';
    case 'suspended': return 'الشريك موقوف';
  }
}
