// P0-09: DSH Role & Permission Model
// UI-only RBAC preview — no runtime auth, no backend RBAC binding.
// Covers 10 sensitive decision points in DSH control-panel.
// WLT boundary: finance mutations are always forbidden inside DSH.
// Authority surface chart:
//   control-panel/partners  → partner activation/deactivation
//   control-panel/catalogs  → catalog approval/publishing
//   control-panel/operations → dispatch, SLA, escalation
//   control-panel/finance   → read-only view (WLT owns mutations)
//   control-panel/platform  → vars preview/rollback request
//   administration          → role assignment only — no operational mutation

// ─── Core types ──────────────────────────────────────────────────────────────

export type DshRoleId =
  | 'super-admin'
  | 'platform-governor'
  | 'platform-approver'
  | 'platform-operator'
  | 'finance-approver'
  | 'viewer';

export type DshPermissionSection =
  | 'partner-activation'
  | 'partner-deactivation'
  | 'catalog-approval'
  | 'catalog-publishing'
  | 'order-cancellation'
  | 'dispatch-reassignment'
  | 'support-escalation'
  | 'sla-override'
  | 'finance-view'
  | 'platform-vars';

export type DshSensitiveActionId =
  | 'activate-partner'
  | 'deactivate-partner'
  | 'approve-catalog'
  | 'publish-catalog'
  | 'view-order-cancellation'
  | 'reassign-dispatch'
  | 'escalate-support'
  | 'override-sla'
  | 'view-finance-readonly'
  | 'preview-platform-vars'
  | 'request-platform-rollback';

export type DshRolePermissionEntry = {
  readonly section: DshPermissionSection;
  readonly sensitiveAction: DshSensitiveActionId;
  /** Minimum role that can execute the primary sensitiveAction via hierarchy. */
  readonly roleId: DshRoleId;
  readonly allowedActions: ReadonlyArray<DshSensitiveActionId>;
  readonly forbiddenActions: ReadonlyArray<DshSensitiveActionId>;
  readonly auditRequired: boolean;
  /** DSH finance is always read-only; WLT owns all financial mutations. */
  readonly wltMutationForbidden: boolean;
  readonly reasonRequired: boolean;
  readonly evidenceRequired: boolean;
  readonly arabicLabel: string;
  readonly arabicDescription: string;
  readonly affectedSurfaces: ReadonlyArray<
    'control-panel' | 'app-partner' | 'app-captain' | 'app-client' | 'app-field'
  >;
};

export type DshAuditEntryDecision = 'approved' | 'rejected' | 'pending';

export type DshAuditEntry = {
  readonly entryId: string;
  readonly actorRoleId: DshRoleId;
  readonly actorName: string;
  readonly timestamp: string;
  readonly section: DshPermissionSection;
  readonly sensitiveAction: DshSensitiveActionId;
  readonly decision: DshAuditEntryDecision;
  readonly reason: string;
  readonly evidence?: string;
  readonly relatedEntityId?: string;
  readonly relatedEntityLabel?: string;
  readonly affectedSurfaces: ReadonlyArray<string>;
  /** True when the action is finance-adjacent and WLT owns the truth. */
  readonly wltReadOnly: boolean;
  /** Present when this decision can be undone — describes rollback scope. */
  readonly rollbackNote?: string;
};

export type DshMakerCheckerMatrixEntry = {
  readonly actionId: DshSensitiveActionId;
  readonly actionLabel: string;
  readonly makerRoleId: DshRoleId;
  readonly checkerRoleId: DshRoleId;
  readonly section: DshPermissionSection;
  readonly auditRequired: boolean;
  readonly reasonRequired: boolean;
  readonly evidenceRequired: boolean;
  readonly wltReadOnly: boolean;
};

export type DshReasonEvidencePolicy = {
  readonly policyId: string;
  readonly title: string;
  readonly appliesToSections: ReadonlyArray<DshPermissionSection>;
  readonly reasonRequired: boolean;
  readonly evidenceRequired: boolean;
  readonly exportPreviewLabel: string;
};

// ─── Explicit section access grants ──────────────────────────────────────────
// Handles parallel access tracks (e.g. finance-approver is NOT in the main
// governor→approver→operator hierarchy but has a dedicated finance-view grant).

const DSH_SECTION_ACCESS: Record<DshPermissionSection, ReadonlyArray<DshRoleId>> = {
  'partner-activation':   ['super-admin', 'platform-governor', 'platform-approver'],
  'partner-deactivation': ['super-admin', 'platform-governor', 'platform-approver'],
  'catalog-approval':     ['super-admin', 'platform-governor', 'platform-approver', 'platform-operator'],
  'catalog-publishing':   ['super-admin', 'platform-governor', 'platform-approver'],
  'order-cancellation':   ['super-admin', 'platform-governor', 'platform-approver', 'platform-operator'],
  'dispatch-reassignment':['super-admin', 'platform-governor', 'platform-operator'],
  'support-escalation':   ['super-admin', 'platform-governor', 'platform-approver', 'platform-operator'],
  'sla-override':         ['super-admin', 'platform-governor'],
  'finance-view':         ['super-admin', 'platform-governor', 'finance-approver'],
  'platform-vars':        ['super-admin', 'platform-governor', 'platform-approver', 'platform-operator'],
};

// ─── Registry — 10 sensitive decision entries ─────────────────────────────────

export const DSH_ROLE_PERMISSIONS: ReadonlyArray<DshRolePermissionEntry> = [
  // 1. Partner activation
  {
    section: 'partner-activation',
    sensitiveAction: 'activate-partner',
    roleId: 'platform-approver',
    allowedActions: ['activate-partner'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: true,
    arabicLabel: 'تفعيل الشريك',
    arabicDescription:
      'جعل متجر الشريك مرئياً للعملاء. يتطلب معتمد المنصة أو أعلى، مع سبب وإثبات إلزاميين. يُنشئ سجل تدقيق تلقائياً. السلطة في control-panel/partners فقط — app-field للأدلة فقط، app-partner يقرأ الحالة فقط.',
    affectedSurfaces: ['control-panel', 'app-partner', 'app-client'],
  },
  // 2. Partner deactivation
  {
    section: 'partner-deactivation',
    sensitiveAction: 'deactivate-partner',
    roleId: 'platform-approver',
    allowedActions: ['deactivate-partner'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: true,
    arabicLabel: 'إيقاف الشريك',
    arabicDescription:
      'إيقاف شريك نشط وإخفاؤه عن العملاء. يتطلب سبباً وملاحظة إثبات إلزامية. يُنشئ سجل تدقيق فوري. السلطة في control-panel/partners فقط.',
    affectedSurfaces: ['control-panel', 'app-partner'],
  },
  // 3. Catalog approval
  {
    section: 'catalog-approval',
    sensitiveAction: 'approve-catalog',
    roleId: 'platform-operator',
    allowedActions: ['approve-catalog'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: false,
    evidenceRequired: false,
    arabicLabel: 'اعتماد الكتالوج',
    arabicDescription:
      'الموافقة على كتالوج الشريك قبل النشر للعملاء. يكفي دور المشغّل أو أعلى. سجل التدقيق يُسجَّل للقرار. app-field يرفع البيانات فقط — لا يعتمد.',
    affectedSurfaces: ['control-panel', 'app-partner', 'app-client'],
  },
  // 4. Catalog publishing
  {
    section: 'catalog-publishing',
    sensitiveAction: 'publish-catalog',
    roleId: 'platform-approver',
    allowedActions: ['publish-catalog'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: false,
    arabicLabel: 'نشر الكتالوج',
    arabicDescription:
      'نشر الكتالوج المعتمد ليصبح مرئياً للعملاء. يتطلب معتمداً أو أعلى وسبباً صريحاً. يُسجَّل في سجل التدقيق.',
    affectedSurfaces: ['control-panel', 'app-client'],
  },
  // 5. Order cancellation view
  {
    section: 'order-cancellation',
    sensitiveAction: 'view-order-cancellation',
    roleId: 'platform-operator',
    allowedActions: ['view-order-cancellation'],
    forbiddenActions: [],
    auditRequired: false,
    wltMutationForbidden: false,
    reasonRequired: false,
    evidenceRequired: false,
    arabicLabel: 'إلغاء الطلب (عرض)',
    arabicDescription:
      'عرض طلبات الإلغاء والسبب. القرار المالي المرتبط يبقى في WLT فقط. DSH يعرض ولا يُنفّذ أي تغيير مالي.',
    affectedSurfaces: ['control-panel'],
  },
  // 6. Dispatch reassignment
  {
    section: 'dispatch-reassignment',
    sensitiveAction: 'reassign-dispatch',
    roleId: 'platform-operator',
    allowedActions: ['reassign-dispatch'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: false,
    arabicLabel: 'إعادة إسناد الطلب',
    arabicDescription:
      'إعادة إسناد طلب معلّق لكابتن آخر. يتطلب سبباً ويُسجَّل في سجل الأحداث التشغيلي. غير متاح للمعتمد المالي والمراقب.',
    affectedSurfaces: ['control-panel', 'app-captain'],
  },
  // 7. Support escalation
  {
    section: 'support-escalation',
    sensitiveAction: 'escalate-support',
    roleId: 'platform-operator',
    allowedActions: ['escalate-support'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: false,
    arabicLabel: 'تصعيد الدعم',
    arabicDescription:
      'رفع تذكرة دعم للمراجعة الطارئة. يتطلب سبباً صريحاً. يُسجَّل في سجل أحداث الدعم. متاح للمشغّل فأعلى.',
    affectedSurfaces: ['control-panel'],
  },
  // 8. SLA override
  {
    section: 'sla-override',
    sensitiveAction: 'override-sla',
    roleId: 'platform-governor',
    allowedActions: ['override-sla'],
    forbiddenActions: [],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: true,
    arabicLabel: 'تجاوز مستوى الخدمة (SLA)',
    arabicDescription:
      'استثناء مقيّد بحاكم المنصة أو المسؤول الأعلى. يتطلب سبباً ودليلاً إلزامياً. يُسجَّل مباشرة في سجل التدقيق الحرج.',
    affectedSurfaces: ['control-panel'],
  },
  // 9. Finance read-only view
  {
    section: 'finance-view',
    sensitiveAction: 'view-finance-readonly',
    roleId: 'finance-approver',
    allowedActions: ['view-finance-readonly'],
    forbiddenActions: [],
    auditRequired: false,
    wltMutationForbidden: true,
    reasonRequired: false,
    evidenceRequired: false,
    arabicLabel: 'عرض البيانات المالية (قراءة فقط)',
    arabicDescription:
      'عرض بيانات الدفع والتسوية والعمولة — قراءة فقط. WLT هو المصدر الوحيد لأي mutation مالي. ممنوع داخل DSH أي approve/pay/settle/refund.',
    affectedSurfaces: ['control-panel'],
  },
  // 10. Platform vars preview / rollback request
  {
    section: 'platform-vars',
    sensitiveAction: 'preview-platform-vars',
    roleId: 'platform-operator',
    allowedActions: ['preview-platform-vars'],
    forbiddenActions: ['request-platform-rollback'],
    auditRequired: true,
    wltMutationForbidden: false,
    reasonRequired: true,
    evidenceRequired: true,
    arabicLabel: 'معاينة متغيرات المنصة / طلب التراجع',
    arabicDescription:
      'معاينة المتغيرات السيادية: متاحة للمشغّل فأعلى. طلب التراجع (Rollback) مقيّد بحاكم المنصة والمسؤول الأعلى فقط. كل إجراء يُسجَّل في سجل التدقيق الحرج.',
    affectedSurfaces: ['control-panel'],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Returns true when roleId is explicitly granted access to section. */
export function getDshRoleCanPerform(
  roleId: DshRoleId,
  section: DshPermissionSection,
): boolean {
  return (DSH_SECTION_ACCESS[section] as ReadonlyArray<string>).includes(roleId);
}

/** Returns the policy entry for a section (one per section). */
export function getDshRolePermission(
  section: DshPermissionSection,
): DshRolePermissionEntry | undefined {
  return DSH_ROLE_PERMISSIONS.find((e) => e.section === section);
}

/** Returns true only for roles authorised to request a platform rollback. */
export function getDshRollbackAllowed(roleId: DshRoleId): boolean {
  return roleId === 'super-admin' || roleId === 'platform-governor';
}

/** Returns the auditRequired flag for a section. */
export function getDshSectionAuditPolicy(section: DshPermissionSection): boolean {
  return DSH_ROLE_PERMISSIONS.find((e) => e.section === section)?.auditRequired ?? false;
}

/** Arabic display name for a DSH role (matches administration.mock arabicName). */
export function getDshRoleArabicName(roleId: DshRoleId): string {
  const MAP: Record<DshRoleId, string> = {
    'super-admin':        'مسؤول أعلى',
    'platform-governor':  'حاكم المنصة',
    'platform-approver':  'معتمد المنصة',
    'platform-operator':  'مشغّل المنصة',
    'finance-approver':   'معتمد مالي',
    'viewer':             'مراقب',
  };
  return MAP[roleId];
}

// ─── Preview audit entries (4 representative entries) ─────────────────────────

export const DSH_AUDIT_ENTRIES: ReadonlyArray<DshAuditEntry> = [
  {
    entryId: 'audit-001',
    actorRoleId: 'platform-approver',
    actorName: 'فاطمة القحطاني',
    timestamp: '2026-05-21T09:32:00Z',
    section: 'partner-activation',
    sensitiveAction: 'activate-partner',
    decision: 'approved',
    reason: 'استكمل الشريك جميع متطلبات الجاهزية وتم التحقق من الوثائق.',
    evidence: 'وثيقة العقد #CTR-20260520 + فحص ميداني',
    relatedEntityId: 'partner-402',
    relatedEntityLabel: 'مطعم القلعة',
    affectedSurfaces: ['control-panel', 'app-partner', 'app-client'],
    wltReadOnly: false,
    rollbackNote: undefined,
  },
  {
    entryId: 'audit-002',
    actorRoleId: 'platform-approver',
    actorName: 'فاطمة القحطاني',
    timestamp: '2026-05-20T14:15:00Z',
    section: 'partner-deactivation',
    sensitiveAction: 'deactivate-partner',
    decision: 'approved',
    reason: 'انتهاك متكرر لمعدلات SLA خلال 14 يوماً متتالية.',
    evidence: 'تقرير SLA #RPT-20260519 + 3 تنبيهات مسجّلة',
    relatedEntityId: 'partner-117',
    relatedEntityLabel: 'سوبرماركت الخيرية',
    affectedSurfaces: ['control-panel', 'app-partner'],
    wltReadOnly: false,
    rollbackNote: 'يمكن إعادة التفعيل بعد معالجة المخالفة وإعادة التدقيق الميداني.',
  },
  {
    entryId: 'audit-003',
    actorRoleId: 'platform-governor',
    actorName: 'أحمد الشريف',
    timestamp: '2026-05-19T11:00:00Z',
    section: 'sla-override',
    sensitiveAction: 'override-sla',
    decision: 'approved',
    reason: 'حالة طوارئ — انقطاع كهربائي في المنطقة الشمالية أثّر على 40% من الكباتن.',
    evidence: 'تقرير الطوارئ #EMR-20260519',
    relatedEntityId: 'area-north-riyadh',
    relatedEntityLabel: 'منطقة شمال الرياض',
    affectedSurfaces: ['control-panel'],
    wltReadOnly: false,
    rollbackNote: 'يُرفع بعد 6 ساعات أو عند استعادة الكثافة الطبيعية للكباتن.',
  },
  {
    entryId: 'audit-004',
    actorRoleId: 'platform-operator',
    actorName: 'خالد النعماني',
    timestamp: '2026-05-21T08:05:00Z',
    section: 'dispatch-reassignment',
    sensitiveAction: 'reassign-dispatch',
    decision: 'approved',
    reason: 'الكابتن الأصلي أبلغ عن عطل في المركبة. إعادة الإسناد لكابتن متاح قريب.',
    evidence: undefined,
    relatedEntityId: 'order-1042',
    relatedEntityLabel: 'طلب رقم 1042',
    affectedSurfaces: ['control-panel', 'app-captain'],
    wltReadOnly: false,
    rollbackNote: undefined,
  },
];

export const DSH_MAKER_CHECKER_MATRIX: ReadonlyArray<DshMakerCheckerMatrixEntry> = [
  {
    actionId: 'activate-partner',
    actionLabel: 'تفعيل الشريك',
    makerRoleId: 'platform-operator',
    checkerRoleId: 'platform-approver',
    section: 'partner-activation',
    auditRequired: true,
    reasonRequired: true,
    evidenceRequired: true,
    wltReadOnly: false,
  },
  {
    actionId: 'publish-catalog',
    actionLabel: 'نشر الكتالوج',
    makerRoleId: 'platform-operator',
    checkerRoleId: 'platform-approver',
    section: 'catalog-publishing',
    auditRequired: true,
    reasonRequired: true,
    evidenceRequired: false,
    wltReadOnly: false,
  },
  {
    actionId: 'reassign-dispatch',
    actionLabel: 'إعادة الإسناد',
    makerRoleId: 'platform-operator',
    checkerRoleId: 'platform-governor',
    section: 'dispatch-reassignment',
    auditRequired: true,
    reasonRequired: true,
    evidenceRequired: false,
    wltReadOnly: false,
  },
  {
    actionId: 'view-finance-readonly',
    actionLabel: 'عرض الأثر المالي',
    makerRoleId: 'platform-operator',
    checkerRoleId: 'finance-approver',
    section: 'finance-view',
    auditRequired: false,
    reasonRequired: false,
    evidenceRequired: false,
    wltReadOnly: true,
  },
  {
    actionId: 'request-platform-rollback',
    actionLabel: 'طلب التراجع',
    makerRoleId: 'platform-approver',
    checkerRoleId: 'platform-governor',
    section: 'platform-vars',
    auditRequired: true,
    reasonRequired: true,
    evidenceRequired: true,
    wltReadOnly: false,
  },
] as const;

export const DSH_REASON_EVIDENCE_POLICY: ReadonlyArray<DshReasonEvidencePolicy> = [
  {
    policyId: 'policy-critical-partner',
    title: 'أسباب وإثباتات تفعيل/إيقاف الشريك',
    appliesToSections: ['partner-activation', 'partner-deactivation'],
    reasonRequired: true,
    evidenceRequired: true,
    exportPreviewLabel: 'Partner readiness + contract proof export',
  },
  {
    policyId: 'policy-ops-escalation',
    title: 'سبب تشغيلي إلزامي للتصعيد وإعادة الإسناد',
    appliesToSections: ['dispatch-reassignment', 'support-escalation', 'sla-override'],
    reasonRequired: true,
    evidenceRequired: false,
    exportPreviewLabel: 'Operations intervention export preview',
  },
  {
    policyId: 'policy-finance-readonly',
    title: 'سياسة الرؤية المالية فقط',
    appliesToSections: ['finance-view'],
    reasonRequired: false,
    evidenceRequired: false,
    exportPreviewLabel: 'WLT visibility export preview',
  },
  {
    policyId: 'policy-platform-rollback',
    title: 'سياسة طلبات التراجع والسياسات',
    appliesToSections: ['platform-vars'],
    reasonRequired: true,
    evidenceRequired: true,
    exportPreviewLabel: 'Provider rollback + blast radius export preview',
  },
] as const;

let _dynamicAuditEntries: DshAuditEntry[] = [];

export function addDshAuditEntry(entry: DshAuditEntry) {
  _dynamicAuditEntries.push(entry);
}

export function getDshAuditEntries(): DshAuditEntry[] {
  return [...DSH_AUDIT_ENTRIES, ..._dynamicAuditEntries];
}

export function resolveAuditEntry(id: string): DshAuditEntry | undefined {
  if (id.startsWith('audit-') || id.endsWith('-audit')) {
    return getDshAuditEntries().find((e) => e.entryId === id);
  }
  // Static mappings for AU-
  if (id === 'AU-7001') return getDshAuditEntryById('audit-004');
  if (id === 'AU-7002') return getDshAuditEntryById('audit-003');
  if (id === 'AU-7003') return getDshAuditEntryById('audit-001');
  return undefined;
}

/** Returns a single preview audit entry by entryId. */
export function getDshAuditEntryById(entryId: string): DshAuditEntry | undefined {
  return getDshAuditEntries().find((e) => e.entryId === entryId);
}

export function getMarketingPermissionResult(action?: string) {
  void action;
  return { allowed: true, reason: '' };
}
