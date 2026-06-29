/**
 * DSH Shared Governance Map — Phase 5 Logic Closure
 * SESSION: DSH_PHASE_5_FINAL_LOGIC_CLOSURE-20260521-071500
 *
 * Canonical cross-surface governance owner for DSH control-panel section metadata.
 * Moved here from dsh/frontend/control-panel/shared/ so mobile surfaces (app-client,
 * app-partner, app-captain, app-field) can consume governance helpers without importing
 * from control-panel internals.
 *
 * Rules:
 *  - Pure types + data + helpers only. No React, no side-effects, no backend, no mutation.
 *  - Import from '@bthwani/ui-kit' is FORBIDDEN here; zero UI deps.
 *  - control-panel/shared re-exports from here for backward compatibility.
 *  - mobile surfaces import ONLY from dsh/frontend/shared (this file via index.ts).
 */

import type { DshOnDemandPolicy, DshSurfaceId } from './dsh-flow-registry';

export type BthwaniFullStackCapabilityId =
  | 'foundation'
  | 'actor-auth-permissions'
  | 'catalog-store'
  | 'media-runtime'
  | 'cart-checkout'
  | 'order-lifecycle'
  | 'captain-delivery'
  | 'partner-operations'
  | 'field-readiness'
  | 'support-escalation'
  | 'wlt-finance-read-model'
  | 'control-panel-governance'
  | 'notifications';

export const DSH_CONTROL_PANEL_SECTION_IDS = [
  'dashboard',
  'operations',
  'support',
  'finance',
  'catalogs',
  'partners',
  'marketing',
  'platform',
  'administration',
  'hr',
] as const;

export type DshControlPanelSectionId = (typeof DSH_CONTROL_PANEL_SECTION_IDS)[number];

export type DshControlPanelGovernanceEntry = {
  readonly sectionId: DshControlPanelSectionId;
  readonly sectionLabel: string;
  readonly ownerRole: string;
  readonly relatedRegistryFlowIds: readonly string[];
  readonly relatedMobileSurfaces: readonly DshSurfaceId[];
  readonly policyOwner: DshSurfaceId;
  readonly escalationOwner: DshSurfaceId;
  readonly financeReference: 'none' | 'wlt-read-model' | 'wlt-reference-required' | 'blocked-by-policy';
  readonly varsReference: 'none' | 'platform' | 'wlt-bridge';
  readonly fullStackCapabilities: readonly BthwaniFullStackCapabilityId[];
  readonly requiredSurfaces: readonly DshSurfaceId[];
  readonly inputOwnership: 'none' | 'control-panel' | 'shared-api' | 'wlt' | 'media-runtime';
  readonly runtimeTruth: 'backend-api' | 'wlt-read-model' | 'media-runtime' | 'policy-only';
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly onDemandPolicySummary: readonly DshOnDemandPolicy[];
  readonly evidenceRequired: boolean;
  readonly screenshotRequired: boolean;
  readonly notes: string;
};

export const DSH_CONTROL_PANEL_GOVERNANCE_MAP: Readonly<Record<DshControlPanelSectionId, DshControlPanelGovernanceEntry>> = {
  dashboard: {
    sectionId: 'dashboard',
    sectionLabel: 'لوحة القيادة',
    ownerRole: 'DSH Closure Evidence Owner',
    relatedRegistryFlowIds: [
      'order-accept',
      'client-order-tracking',
      'partner-finance-bridge',
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-read-model',
    varsReference: 'platform',
    fullStackCapabilities: ['foundation', 'control-panel-governance', 'wlt-finance-read-model'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'none',
    runtimeTruth: 'policy-only',
    allowedActions: ['عرض ملخص الإغلاق', 'فتح الأدلة عند الطلب', 'توجيه المستخدم إلى القسم المالك'],
    forbiddenActions: ['اعتماد إغلاق نهائي', 'تنفيذ mutation', 'استبدال أدلة الأقسام المالكة'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'لوحة القيادة تعرض ملخص الإغلاق والروابط فقط. كل قرار أو إجراء يبقى داخل القسم المالك ولا يتحول dashboard إلى مالك بديل.',
  },
  operations: {
    sectionId: 'operations',
    sectionLabel: 'العمليات',
    ownerRole: 'DSH Operations Command',
    relatedRegistryFlowIds: [
      'order-accept',
      'order-get',
      'order-handoff',
      'order-prepare',
      'order-ready',
      'order-out-for-delivery',
      'client-order-tracking',
      'captain-order-pickup',
      'captain-map-navigation',
      'assisted-order-desk',
      'order-rescue',
      'ops-intervention-playbook',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['order-lifecycle', 'captain-delivery', 'partner-operations', 'notifications'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'backend-api',
    allowedActions: ['تشغيل التنفيذ الحي', 'إعادة الإسناد', 'متابعة الضغط والسعة', 'فتح المالك الصحيح للحالة'],
    forbiddenActions: ['اعتماد مالي', 'اعتماد شريك نهائي', 'نشر كتالوج', 'إغلاق تذكرة دعم خارج مالكها'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'العمليات تملك التنفيذ الحي فقط. أي policy أو finance أو partner lifecycle أو catalog governance يوجّه إلى القسم المالك.',
  },
  support: {
    sectionId: 'support',
    sectionLabel: 'الدعم',
    ownerRole: 'Support and Escalation Queue Owner',
    relatedRegistryFlowIds: [
      'client-order-issue',
      'order-issue-queue',
      'order-chat-send',
      'order-chat-read-ack',
      'order-quick-reply-config',
      'order-quick-reply-settings',
      'order-quick-reply-setup',
      'captain-proof-of-delivery',
      'field-readiness-escalation',
      'control-escalation-queue',
      'customer-360',
      'manual-call-intake',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-reference-required',
    varsReference: 'platform',
    fullStackCapabilities: ['support-escalation', 'captain-delivery', 'field-readiness'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'backend-api',
    allowedActions: ['إدارة التذاكر', 'متابعة الرسائل', 'تصعيد المتابعة', 'فتح الأدلة عند الطلب'],
    forbiddenActions: ['نسخ واجهات الموبايل كما هي', 'بدء استرداد مالي', 'تغيير policy من داخل التذكرة'],
    onDemandPolicySummary: ['summary-only', 'chat-on-open', 'evidence-on-open', 'detail-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'الدعم هو المالك المركزي لـ tickets والمحادثات والمتابعة بعد التصعيد. العميل يراه داخل الطلب فقط، والشريك داخل command center فقط.',
  },
  finance: {
    sectionId: 'finance',
    sectionLabel: 'المالية',
    ownerRole: 'Finance Read-Only Owner with WLT Ledger Reference',
    relatedRegistryFlowIds: [
      'partner-finance-bridge',
      'partner-settlement-summary',
      'partner-commission-summary',
      'client-cart-checkout',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'wlt-finance',
    financeReference: 'wlt-read-model',
    varsReference: 'wlt-bridge',
    fullStackCapabilities: ['wlt-finance-read-model', 'cart-checkout', 'order-lifecycle'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'wlt',
    runtimeTruth: 'wlt-read-model',
    allowedActions: ['عرض قراءة مالية', 'فتح مرجع WLT', 'توضيح owner المالي', 'إظهار أثر الحالة فقط'],
    forbiddenActions: ['refund mutation', 'settlement mutation', 'commission mutation', 'ledger mutation'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'WLT هو ledger owner. DSH finance surfaces للقراءة والحوكمة فقط ولا تنفذ أي تعديل مالي.',
  },
  catalogs: {
    sectionId: 'catalogs',
    sectionLabel: 'الكتالوجات',
    ownerRole: 'Catalog Governance Owner',
    relatedRegistryFlowIds: [
      'inventory-adjust',
      'inventory-update',
      'items-upsert',
      'doc-upload',
      'video-upload',
      'field-store-onboarding',
      'field-store-visit',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['catalog-store', 'media-runtime', 'field-readiness'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'backend-api',
    allowedActions: ['مراجعة barcode وSKU وGTIN', 'حل التعارضات', 'اعتماد النشر', 'فتح التفاصيل عند الطلب'],
    forbiddenActions: ['تحميل payload ثقيل دائمًا', 'تكرار publication logic داخل التسويق أو العمليات'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'الكتالوجات تملك item governance والنشر والتعارضات. partner يغيّر local override فقط وfield يجمع التحقق والأدلة.',
  },
  partners: {
    sectionId: 'partners',
    sectionLabel: 'الشركاء',
    ownerRole: 'Partner Lifecycle Owner',
    relatedRegistryFlowIds: [
      'intake-start',
      'store-nomination',
      'doc-upload',
      'field-store-onboarding',
      'field-readiness-escalation',
    ],
    relatedMobileSurfaces: ['app-partner', 'app-field', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'blocked-by-policy',
    varsReference: 'platform',
    fullStackCapabilities: ['field-readiness', 'partner-operations', 'catalog-store'],
    requiredSurfaces: ['app-partner', 'app-field', 'control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'backend-api',
    allowedActions: ['اعتماد الشريك', 'مراجعة الوثائق', 'إدارة readiness وtopology وdeactivation', 'فتح handoff للكتالوج والتسويق'],
    forbiddenActions: ['منح final approval من app-partner', 'نسخ منطق الشركاء داخل العمليات أو التسويق'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'الشركاء هو owner لدورة حياة الشريك كاملة. app-field يجمع البيانات، وapp-partner يظل مستهلكًا للحالة لا مالكًا نهائيًا لها.',
  },
  marketing: {
    sectionId: 'marketing',
    sectionLabel: 'التسويق',
    ownerRole: 'Campaign and Content Governance Owner',
    relatedRegistryFlowIds: [
      'video-upload',
      'store-nomination',
      'partner-finance-bridge',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-reference-required',
    varsReference: 'platform',
    fullStackCapabilities: ['catalog-store', 'media-runtime'],
    requiredSurfaces: ['app-client', 'app-partner', 'control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'backend-api',
    allowedActions: ['إدارة الحملات والعروض والميديا', 'إظهار publication bridge', 'إحالة incidents إلى support أو operations'],
    forbiddenActions: ['اعتماد partner activation النهائي', 'اعتماد catalog publication النهائي بدون owner catalogs'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open', 'evidence-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'التسويق يملك المحتوى والحملات والعروض. النشر النهائي والعلاقات المالية والتفعيل النهائي تعود لأصحابها.',
  },
  platform: {
    sectionId: 'platform',
    sectionLabel: 'المنصة',
    ownerRole: 'Platform Policy and Vars Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
      'client-cart-checkout',
      'partner-finance-bridge',
    ],
    relatedMobileSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'wlt-read-model',
    varsReference: 'platform',
    fullStackCapabilities: ['foundation', 'actor-auth-permissions', 'control-panel-governance', 'notifications'],
    requiredSurfaces: ['app-client', 'app-partner', 'app-captain', 'app-field', 'control-panel', 'wlt-finance'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'policy-only',
    allowedActions: ['عرض vars/providers/rollouts/services/health/audit', 'إظهار scope وprecedence', 'فتح WLT bridge reference عند الحاجة'],
    forbiddenActions: ['backend/env mutation', 'provider switching الفعلي', 'finance mutation'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    evidenceRequired: true,
    screenshotRequired: true,
    notes: 'platform هو owner للسياسات القابلة للضبط والـ runtime/read-only references فقط. لا يملك catalog/partner day-to-day decisions.',
  },
  administration: {
    sectionId: 'administration',
    sectionLabel: 'الإدارة',
    ownerRole: 'Roles and Approval Chain Governance Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['actor-auth-permissions', 'control-panel-governance'],
    requiredSurfaces: ['control-panel'],
    inputOwnership: 'control-panel',
    runtimeTruth: 'policy-only',
    allowedActions: ['إدارة الأدوار', 'إظهار approval chain', 'ربط permissions بالحوكمة'],
    forbiddenActions: ['تخزين منطق تشغيلي يومي', 'تكرار sections الأخرى'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    evidenceRequired: false,
    screenshotRequired: true,
    notes: 'administration يحكم الصلاحيات وسلسلة الاعتماد فقط، ولا يجب أن يتحول إلى مستودع logic تشغيلي أو مالي أو تسويقي.',
  },
  hr: {
    sectionId: 'hr',
    sectionLabel: 'الموارد البشرية',
    ownerRole: 'Control Panel HR Blocked Reference Owner',
    relatedRegistryFlowIds: [
      'control-sla-policy',
      'control-escalation-queue',
    ],
    relatedMobileSurfaces: ['control-panel'],
    policyOwner: 'control-panel',
    escalationOwner: 'control-panel',
    financeReference: 'none',
    varsReference: 'platform',
    fullStackCapabilities: ['control-panel-governance'],
    requiredSurfaces: ['control-panel'],
    inputOwnership: 'none',
    runtimeTruth: 'policy-only',
    allowedActions: ['عرض حالة HR المحجوبة', 'توضيح سبب تعطيل الأفعال', 'توجيه الربط إلى backend HR لاحقًا'],
    forbiddenActions: ['إنشاء بيانات موظفين محلية', 'تفعيل إجراء HR بدون API', 'خلط HR مع administration أو operations'],
    onDemandPolicySummary: ['summary-only', 'detail-on-open'],
    evidenceRequired: false,
    screenshotRequired: true,
    notes: 'HR route موجود في الشل لكنه يبقى blocked/read-only حتى يثبت backend HR. لا يملك بيانات موظفين محلية ولا صلاحية تشغيلية حالية.',
  },
} as const;

export const DSH_CONTROL_PANEL_GOVERNANCE_LIST = DSH_CONTROL_PANEL_SECTION_IDS.map(
  (sectionId) => DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId],
) as readonly DshControlPanelGovernanceEntry[];

export function getDshControlPanelGovernanceEntry(sectionId: DshControlPanelSectionId): DshControlPanelGovernanceEntry {
  return DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId];
}

export function getDshControlPanelGovernanceEntries(): readonly DshControlPanelGovernanceEntry[] {
  return DSH_CONTROL_PANEL_GOVERNANCE_LIST;
}

export function findDshControlPanelGovernanceSectionByFlowId(flowId: string): DshControlPanelGovernanceEntry | undefined {
  return DSH_CONTROL_PANEL_GOVERNANCE_LIST.find((entry) => entry.relatedRegistryFlowIds.includes(flowId));
}

export function getDshControlPanelGovernanceSectionsForSurface(surfaceId: DshSurfaceId): readonly DshControlPanelGovernanceEntry[] {
  return DSH_CONTROL_PANEL_GOVERNANCE_LIST.filter((entry) => entry.relatedMobileSurfaces.includes(surfaceId));
}

export function resolveDshControlPanelSectionLabel(sectionId: DshControlPanelSectionId): string {
  return DSH_CONTROL_PANEL_GOVERNANCE_MAP[sectionId].sectionLabel;
}
