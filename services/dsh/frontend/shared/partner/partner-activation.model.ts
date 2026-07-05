// Canonical partner onboarding and store publication state model.
// Adapted from donor dsh-partner-activation.model.ts — architectural boundaries enforced.
//
// System rules (enforced here, never in surfaces):
// - app-field    : collects evidence only — never activates
// - app-partner  : reads status and readiness — never self-activates
// - control-panel: owns all activation, approval, and deactivation
// - app-client   : sees store ONLY when onboardingStatus === 'client_visible'
// - deactivation : immediately removes partner from client discovery

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
  | 'partner_deactivated'
  | 'client_visible'
  | 'client_hidden';

export type DshPartnerActivationActorSurface =
  | 'app-field'
  | 'app-partner'
  | 'control-panel'
  | 'system';

export type DshPartnerReadinessCheckItem = {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly blockedReason?: string | undefined;
};

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
  | 'deactivate_partner';

export type DshPartnerDecisionCommand = {
  readonly id: DshPartnerDecisionCommandId;
  readonly label: string;
  readonly description: string;
  readonly targetStatus: DshPartnerActivationStatus;
  readonly reasonRequired: boolean;
};

export const DSH_PARTNER_ACTIVATION_STATES: ReadonlyArray<DshPartnerActivationStateMetadata> = [
  {
    status: 'draft',
    ownerSurface: 'app-field',
    actorResponsible: 'الميداني',
    visibleToPartner: true, visibleToField: true, visibleToControlPanel: false, visibleToClient: false,
    nextAction: 'إتمام جمع البيانات الأساسية وإرسال ملف الشريك',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['submitted', 'field_visit_scheduled'],
  },
  {
    status: 'submitted',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: true, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة الملف المُرسَل من الميدان وتحديد الخطوة التالية',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['field_visit_scheduled', 'documents_missing', 'documents_uploaded'],
  },
  {
    status: 'field_visit_scheduled',
    ownerSurface: 'app-field',
    actorResponsible: 'الميداني',
    visibleToPartner: false, visibleToField: true, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'تنفيذ الزيارة الميدانية وجمع الأدلة المطلوبة',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['field_visit_completed', 'documents_missing'],
  },
  {
    status: 'field_visit_completed',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: false, visibleToField: true, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة أدلة الزيارة والانتقال للتحقق من الوثائق',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['documents_missing', 'documents_uploaded'],
  },
  {
    status: 'documents_missing',
    ownerSurface: 'app-partner',
    actorResponsible: 'الشريك',
    visibleToPartner: true, visibleToField: true, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'رفع الوثائق الناقصة من قِبل الشريك لإتمام ملف الاعتماد',
    blockedReason: 'وثائق مطلوبة غائبة أو غير مكتملة — لا يمكن المتابعة قبل رفعها',
    auditRequired: false,
    allowedNextStatuses: ['documents_uploaded'],
  },
  {
    status: 'documents_uploaded',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة الوثائق المرفوعة والتحقق من صحتها',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['documents_verified', 'documents_missing'],
  },
  {
    status: 'documents_verified',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'الانتقال لمرحلة تجهيز الكتالوج والمنتجات',
    blockedReason: '', auditRequired: true,
    allowedNextStatuses: ['catalog_not_ready', 'ops_review'],
  },
  {
    status: 'catalog_not_ready',
    ownerSurface: 'app-partner',
    actorResponsible: 'الشريك + قسم الكتالوج (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'إضافة المنتجات وإعداد الكتالوج وطلب الاعتماد',
    blockedReason: 'الكتالوج فارغ أو غير معتمد — لا يمكن الظهور للعملاء قبل اعتماد الكتالوج',
    auditRequired: false,
    allowedNextStatuses: ['catalog_ready', 'ops_review'],
  },
  {
    status: 'catalog_ready',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الكتالوج (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'التحقق من تهيئة أوضاع التوصيل',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['delivery_modes_not_ready', 'delivery_modes_ready'],
  },
  {
    status: 'delivery_modes_not_ready',
    ownerSurface: 'app-partner',
    actorResponsible: 'الشريك + قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'تهيئة وتأكيد أوضاع التوصيل المدعومة',
    blockedReason: 'أوضاع التوصيل غير مكتملة — يجب تحديد طريقة توصيل واحدة على الأقل',
    auditRequired: false,
    allowedNextStatuses: ['delivery_modes_ready'],
  },
  {
    status: 'delivery_modes_ready',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'رفع الملف للمراجعة التشغيلية النهائية',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['ops_review'],
  },
  {
    status: 'ops_review',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP) — مراجعة نهائية',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة الملف الكامل واتخاذ قرار التفعيل أو الرفض',
    blockedReason: '', auditRequired: true,
    allowedNextStatuses: ['ops_approved', 'ops_rejected'],
  },
  {
    status: 'ops_approved',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'تفعيل الشريك وتحويله لحالة نشط',
    blockedReason: '', auditRequired: true,
    allowedNextStatuses: ['partner_active'],
  },
  {
    status: 'ops_rejected',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'إبلاغ الشريك بالسبب وتحديد مسار إعادة المحاولة',
    blockedReason: 'رُفض الشريك من قِبل العمليات — يرجى مراجعة التفاصيل وإعادة التقديم',
    auditRequired: true,
    allowedNextStatuses: ['submitted', 'documents_missing'],
  },
  {
    status: 'partner_active',
    ownerSurface: 'system',
    actorResponsible: 'النظام (مدار من CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'التحقق من اجتياز جميع شروط الظهور لتمكين client_visible',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['client_visible', 'client_hidden', 'partner_deactivated'],
  },
  {
    status: 'partner_deactivated',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة سبب الإيقاف وتحديد مسار إعادة التفعيل إن أمكن',
    blockedReason: 'الشريك موقوف من قِبل العمليات — يختفي فورًا من قائمة المتاجر لدى العميل',
    auditRequired: true,
    allowedNextStatuses: ['ops_review', 'submitted'],
  },
  {
    status: 'client_visible',
    ownerSurface: 'system',
    actorResponsible: 'النظام (جميع الشروط مستوفاة)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: true,
    nextAction: 'صيانة الحالة والمراقبة التشغيلية',
    blockedReason: '', auditRequired: false,
    allowedNextStatuses: ['client_hidden', 'partner_deactivated'],
  },
  {
    status: 'client_hidden',
    ownerSurface: 'control-panel',
    actorResponsible: 'قسم الشركاء (CP)',
    visibleToPartner: true, visibleToField: false, visibleToControlPanel: true, visibleToClient: false,
    nextAction: 'مراجعة سبب الإخفاء ورفع القيد عند الجاهزية',
    blockedReason: 'الشريك نشط لكن مخفي من اكتشاف العملاء — تجاوز تشغيلي أو خارج النطاق',
    auditRequired: true,
    allowedNextStatuses: ['client_visible', 'partner_deactivated'],
  },
];

export function getDshPartnerActivationStateMetadata(
  status: DshPartnerActivationStatus,
): DshPartnerActivationStateMetadata {
  return DSH_PARTNER_ACTIVATION_STATES.find(
    (s) => s.status === status,
  ) as DshPartnerActivationStateMetadata;
}

export const DSH_PARTNER_DECISION_COMMANDS: ReadonlyArray<DshPartnerDecisionCommand> = [
  {
    id: 'preliminary_accept',
    label: 'قبول مبدئي',
    description: 'نقل الملف من الاستلام إلى مسار الزيارة أو المراجعة التالية.',
    targetStatus: 'documents_uploaded',
    reasonRequired: false,
  },
  {
    id: 'request_missing_documents',
    label: 'طلب نواقص',
    description: 'إرجاع الملف للشريك لاستكمال الوثائق المطلوبة.',
    targetStatus: 'documents_missing',
    reasonRequired: true,
  },
  {
    id: 'schedule_field_visit',
    label: 'جدولة زيارة',
    description: 'طلب زيارة ميدانية قبل متابعة الاعتماد.',
    targetStatus: 'field_visit_scheduled',
    reasonRequired: false,
  },
  {
    id: 'reject_partner',
    label: 'رفض',
    description: 'رفض الملف في مراجعة العمليات مع سبب إلزامي.',
    targetStatus: 'ops_rejected',
    reasonRequired: true,
  },
  {
    id: 'approve_documents',
    label: 'اعتماد الوثائق',
    description: 'تأكيد اكتمال الوثائق والانتقال للجاهزية التالية.',
    targetStatus: 'documents_verified',
    reasonRequired: false,
  },
  {
    id: 'start_ops_review',
    label: 'بدء مراجعة العمليات',
    description: 'رفع الملف إلى المراجعة التشغيلية النهائية.',
    targetStatus: 'ops_review',
    reasonRequired: false,
  },
  {
    id: 'approve_ops',
    label: 'اعتماد العمليات',
    description: 'اعتماد الملف تشغيليًا قبل تفعيل الشريك.',
    targetStatus: 'ops_approved',
    reasonRequired: false,
  },
  {
    id: 'activate_partner',
    label: 'تفعيل الشريك',
    description: 'تفعيل الشريك دون إظهاره للعميل قبل اكتمال بوابات المتجر.',
    targetStatus: 'partner_active',
    reasonRequired: false,
  },
  {
    id: 'show_store_to_client',
    label: 'إظهار المتجر للعميل',
    description: 'إتاحة المتجر للعميل بعد اكتمال بوابات الظهور.',
    targetStatus: 'client_visible',
    reasonRequired: false,
  },
  {
    id: 'hide_store_from_client',
    label: 'إخفاء المتجر عن العميل',
    description: 'إخفاء المتجر مع بقاء الشريك نشطًا.',
    targetStatus: 'client_hidden',
    reasonRequired: true,
  },
  {
    id: 'deactivate_partner',
    label: 'تعطيل الشريك',
    description: 'إيقاف الشريك وإخفاء متاجره عن العميل.',
    targetStatus: 'partner_deactivated',
    reasonRequired: true,
  },
];

export function getDshPartnerDecisionCommands(
  status: DshPartnerActivationStatus,
): ReadonlyArray<DshPartnerDecisionCommand> {
  const meta = getDshPartnerActivationStateMetadata(status);
  const allowed = new Set(meta.allowedNextStatuses);
  return DSH_PARTNER_DECISION_COMMANDS.filter((command) => allowed.has(command.targetStatus));
}

export function isDshPartnerClientVisible(status: DshPartnerActivationStatus): boolean {
  return status === 'client_visible';
}

// Aligned with backend ComputeReadiness partnerActiveDone: client_hidden is an
// activated partner whose store is withheld from clients — activation itself is complete.
export function isDshPartnerActivationComplete(status: DshPartnerActivationStatus): boolean {
  return status === 'client_visible' || status === 'partner_active' || status === 'client_hidden';
}

export function getDshPartnerActivationProgress(status: DshPartnerActivationStatus): number {
  switch (status) {
    case 'submitted':             return 70;
    case 'ops_approved':          return 100;
    case 'ops_rejected':          return 40;
    case 'field_visit_scheduled': return 50;
    case 'field_visit_completed': return 60;
    case 'documents_missing':     return 40;
    case 'documents_uploaded':    return 65;
    case 'documents_verified':    return 80;
    case 'catalog_ready':         return 85;
    case 'ops_review':            return 90;
    case 'partner_active':        return 100;
    case 'client_visible':        return 100;
    default:                       return 20;
  }
}

export function getDshPartnerActivationStatusLabel(status: DshPartnerActivationStatus): string {
  const labels: Record<DshPartnerActivationStatus, string> = {
    draft:                    'مسودة',
    submitted:                'مُرسَل للمراجعة',
    field_visit_scheduled:    'زيارة ميدانية مجدولة',
    field_visit_completed:    'الزيارة مكتملة',
    documents_missing:        'وثائق ناقصة',
    documents_uploaded:       'وثائق مرفوعة',
    documents_verified:       'وثائق معتمدة',
    catalog_not_ready:        'الكتالوج غير جاهز',
    catalog_ready:            'الكتالوج جاهز',
    delivery_modes_not_ready: 'أوضاع التوصيل غير مهيأة',
    delivery_modes_ready:     'أوضاع التوصيل جاهزة',
    ops_review:               'مراجعة العمليات',
    ops_approved:             'معتمد من العمليات',
    ops_rejected:             'مرفوض من العمليات',
    partner_active:           'الشريك نشط',
    partner_deactivated:      'الشريك موقوف',
    client_visible:           'ظاهر للعملاء',
    client_hidden:            'مخفي من العملاء',
  };
  return labels[status] ?? status;
}

const AUDIT_EVENT_TAG_LABELS: Record<string, string> = {
  document_uploaded: 'وثيقة مرفوعة',
  document_reviewed: 'مراجعة وثيقة',
  field_visit_submitted: 'زيارة ميدانية مسجّلة',
  store_linked: 'ربط متجر',
};

/**
 * Formats a partner audit event's from/to status pair for display. Handles
 * both real activation-status transitions and the non-transition audit tags
 * recorded for document upload/review, field visits, and store linking
 * (encoded as `tag` or `tag:detail`, since they share the same audit table).
 */
export function formatDshPartnerAuditEventLabel(fromStatus: string, toStatus: string): string {
  const [tag = '', detail] = toStatus.split(':');
  const tagLabel = AUDIT_EVENT_TAG_LABELS[tag];
  if (tagLabel) {
    return detail ? `${tagLabel} — ${detail}` : tagLabel;
  }
  const fromLabel = fromStatus ? getDshPartnerActivationStatusLabel(fromStatus as DshPartnerActivationStatus) : '';
  const toLabel = getDshPartnerActivationStatusLabel(toStatus as DshPartnerActivationStatus);
  return fromLabel ? `${fromLabel} → ${toLabel}` : toLabel;
}

export function getDshPartnerReadinessChecklist(
  status: DshPartnerActivationStatus,
): ReadonlyArray<DshPartnerReadinessCheckItem> {
  const past = (milestone: DshPartnerActivationStatus) => {
    const order: DshPartnerActivationStatus[] = [
      'draft','submitted','field_visit_scheduled','field_visit_completed',
      'documents_missing','documents_uploaded','documents_verified',
      'catalog_not_ready','catalog_ready',
      'delivery_modes_not_ready','delivery_modes_ready',
      'ops_review','ops_approved','ops_rejected',
      'partner_active','partner_deactivated','client_visible','client_hidden',
    ];
    return order.indexOf(status) >= order.indexOf(milestone);
  };

  const docsDone  = past('documents_verified');
  const catDone   = past('catalog_ready');
  const delDone   = past('delivery_modes_ready');
  const activeDone = status === 'partner_active' || status === 'client_visible' || status === 'client_hidden';

  return [
    { id: 'documents',    label: 'الوثائق معتمدة',               satisfied: docsDone,   blockedReason: docsDone  ? undefined : 'الوثائق غير مكتملة أو لم يتم التحقق منها بعد' },
    { id: 'catalog',      label: 'الكتالوج جاهز ومعتمد',         satisfied: catDone,    blockedReason: catDone   ? undefined : 'الكتالوج فارغ أو غير معتمد للنشر' },
    { id: 'delivery',     label: 'أوضاع التوصيل مهيأة',          satisfied: delDone,    blockedReason: delDone   ? undefined : 'يجب تحديد طريقة توصيل واحدة على الأقل' },
    { id: 'active',       label: 'الشريك نشط (اعتماد العمليات)', satisfied: activeDone, blockedReason: activeDone ? undefined : 'بانتظار اعتماد العمليات النهائي وتفعيل الشريك' },
  ] as const;
}

export type DshPartnerVisibilityBadge = 'active' | 'closed' | 'busy' | 'out-of-zone' | 'hidden-pending-approval' | 'catalog-not-ready';

export function getDshPartnerVisibilityBadge(
  status: DshPartnerActivationStatus,
  storeOpen: boolean,
  busy = false,
  inZone = true,
): DshPartnerVisibilityBadge {
  if (status === 'client_visible' || status === 'partner_active') {
    if (!inZone) return 'out-of-zone';
    if (!storeOpen) return 'closed';
    if (busy) return 'busy';
    return 'active';
  }
  if (
    status === 'catalog_not_ready' ||
    status === 'delivery_modes_not_ready' ||
    status === 'catalog_ready' ||
    status === 'delivery_modes_ready'
  ) {
    return 'catalog-not-ready';
  }
  return 'hidden-pending-approval';
}

export function getDshPartnerVisibilityBadgeLabel(badge: DshPartnerVisibilityBadge): string {
  switch (badge) {
    case 'active':                   return 'مفتوح';
    case 'closed':                   return 'مغلق الآن';
    case 'busy':                     return 'مشغول';
    case 'out-of-zone':              return 'خارج نطاق التوصيل';
    case 'hidden-pending-approval':  return 'ليس شريكًا معتمدًا';
    case 'catalog-not-ready':        return 'الكتالوج غير جاهز';
  }
}

export function getDshPartnerVisibilityBadgeTone(
  badge: DshPartnerVisibilityBadge,
): 'success' | 'warning' | 'danger' | 'muted' {
  switch (badge) {
    case 'active':      return 'success';
    case 'closed':      return 'warning';
    case 'busy':        return 'warning';
    case 'out-of-zone': return 'danger';
    default:            return 'muted';
  }
}
