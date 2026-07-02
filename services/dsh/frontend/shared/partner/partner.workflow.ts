// partner.workflow.ts — partner operational workflow utilities
// Authority: dsh/frontend/shared/partner
// Promotion candidates, catalog queue, stage/owner translation utilities.

import { addDshAuditEntry } from '../identity-access/dsh-role-permission.model';
import type { DshAuditEntry } from '../identity-access/dsh-role-permission.model';
import type { DshOperationsDecisionKind, DshOrderLifecycleStatus } from '../orders';

// ─── ApprovalStage ──────────────────────────────────────────────────────────
export type ApprovalStage =
  | 'partner-submitted'
  | 'field-submitted'
  | 'partner-review'
  | 'partner-approved'
  | 'marketing-review'
  | 'marketing-approved'
  | 'catalog-adopted'
  | 'client-visible'
  | 'rejected'
  | 'needs-fix';

export type ApprovalEntityType =
  | 'product'
  | 'product-media'
  | 'category-suggestion'
  | 'store'
  | 'partner-offer'
  | 'video'
  | 'banner'
  | 'promo';

export const MARKETING_SIGNAL_ENTITY_TYPES: ReadonlyArray<ApprovalEntityType> = [
  'product', 'product-media', 'category-suggestion', 'store',
];

export const MARKETING_SIGNAL_STAGES: ReadonlyArray<ApprovalStage> = [
  'marketing-review', 'marketing-approved', 'needs-fix', 'catalog-adopted', 'rejected',
];

export type ApprovalSourceSurface =
  | 'app-partner'
  | 'app-field'
  | 'control-panel-partners'
  | 'control-panel-marketing'
  | 'control-panel-catalog'
  | 'app-client';

export type AuditTrailEntry = {
  at: string;
  fromStage: ApprovalStage;
  toStage: ApprovalStage;
  owner: ApprovalSourceSurface;
  actionLabel: string;
};

export type ApprovalRecordMetadata = {
  requiredFix?: string;
  rejectionReason?: string;
  mediaPolicy?: string;
  mediaKey?: string;
  nextOwner?: string;
  systemNote?: string;
  address?: string;
  categoryId?: string;
  publishStage?: string;
  supportsPickup?: boolean;
  supportsPartnerDelivery?: boolean;
};

export type ApprovalRecord = {
  id: string;
  entityType: ApprovalEntityType;
  source: ApprovalSourceSurface;
  stage: ApprovalStage;
  title: string;
  submittedAt: string;
  metadata?: ApprovalRecordMetadata;
  auditTrail?: AuditTrailEntry[];
};

// ─── Promotion Candidates ───────────────────────────────────────────────────
export type DshPromotionCandidate = {
  readonly id: string;
  readonly productId: string;
  readonly storeId: string;
  readonly candidacyScore: number;
  readonly reason: string;
};

export function dshPromotionCandidates(
  _storeId: string,
): readonly DshPromotionCandidate[] {
  return [];
}

// ─── Catalog Queue Records ──────────────────────────────────────────────────
export type PartnerQueueRecord = {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: 'product' | 'category' | 'store';
  readonly stage: ApprovalStage;
  readonly owner: 'partner' | 'catalog' | 'marketing' | 'system';
  readonly createdAt: string;
};

const PARTNER_QUEUE_STAGES: ReadonlyArray<ApprovalStage> = ['partner-submitted', 'field-submitted', 'partner-review', 'partner-approved', 'needs-fix', 'rejected'];
const MARKETING_QUEUE_STAGES: ReadonlyArray<ApprovalStage> = ['marketing-review', 'marketing-approved', 'needs-fix'];
const CATALOG_QUEUE_STAGES: ReadonlyArray<ApprovalStage> = ['marketing-approved', 'catalog-adopted', 'client-visible', 'needs-fix', 'rejected'];

let _globalStore: ApprovalRecord[] = [
  { id: 'intake-1', entityType: 'product', source: 'app-partner', stage: 'partner-submitted', title: 'منتج جديد من الشريك غير موجود في الكتالوج', submittedAt: new Date(Date.now() - 3600_000 * 48).toISOString(), auditTrail: [] },
  { id: 'intake-2', entityType: 'category-suggestion', source: 'app-partner', stage: 'partner-review', title: 'اقتراح فئة من الشريك', submittedAt: new Date(Date.now() - 3600_000 * 36).toISOString(), auditTrail: [] },
  { id: 'intake-3', entityType: 'store', source: 'app-field', stage: 'field-submitted', title: 'منتج/متجر من الميداني', submittedAt: new Date(Date.now() - 3600_000 * 30).toISOString(), auditTrail: [] },
  { id: 'intake-4', entityType: 'product-media', source: 'app-partner', stage: 'needs-fix', title: 'صورة المنتج غير واضحة', submittedAt: new Date(Date.now() - 3600_000 * 24).toISOString(), metadata: { requiredFix: 'يرجى إعادة تصوير المنتج بإضاءة أفضل وخلفية بيضاء.' }, auditTrail: [{ at: new Date(Date.now() - 3600_000 * 20).toISOString(), fromStage: 'partner-submitted', toStage: 'needs-fix', owner: 'control-panel-partners', actionLabel: 'طلب تعديل' }] },
  { id: 'intake-5', entityType: 'partner-offer', source: 'app-partner', stage: 'rejected', title: 'عرض خصم 90%', submittedAt: new Date(Date.now() - 3600_000 * 72).toISOString(), metadata: { rejectionReason: 'نسبة الخصم عالية جداً وتؤثر على هامش الربح المتفق عليه.' }, auditTrail: [{ at: new Date(Date.now() - 3600_000 * 68).toISOString(), fromStage: 'partner-submitted', toStage: 'rejected', owner: 'control-panel-partners', actionLabel: 'رفض' }] },
  { id: 'intake-6', entityType: 'product', source: 'app-partner', stage: 'marketing-review', title: 'وجبة غداء عمل — من بوابة الشركاء', submittedAt: new Date(Date.now() - 3600_000 * 18).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 16).toISOString(), fromStage: 'partner-submitted', toStage: 'partner-review', owner: 'control-panel-partners', actionLabel: 'قبول أولي' }, { at: new Date(Date.now() - 3600_000 * 14).toISOString(), fromStage: 'partner-review', toStage: 'marketing-review', owner: 'control-panel-partners', actionLabel: 'تحويل للتسويق' }] },
  { id: 'intake-7', entityType: 'product', source: 'app-partner', stage: 'client-visible', title: 'ساندوتش دجاج مشوي', submittedAt: new Date(Date.now() - 3600_000 * 96).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 90).toISOString(), fromStage: 'partner-submitted', toStage: 'marketing-review', owner: 'control-panel-partners', actionLabel: 'قبول للتسويق' }, { at: new Date(Date.now() - 3600_000 * 84).toISOString(), fromStage: 'marketing-review', toStage: 'marketing-approved', owner: 'control-panel-marketing', actionLabel: 'اعتماد تسويقي' }, { at: new Date(Date.now() - 3600_000 * 78).toISOString(), fromStage: 'marketing-approved', toStage: 'catalog-adopted', owner: 'control-panel-catalog', actionLabel: 'اعتماد مركزي' }, { at: new Date(Date.now() - 3600_000 * 72).toISOString(), fromStage: 'catalog-adopted', toStage: 'client-visible', owner: 'control-panel-catalog', actionLabel: 'تفعيل للعميل' }] },
  { id: 'mr-001', entityType: 'product-media', source: 'app-partner', stage: 'marketing-review', title: 'صورة برغر كلاسيك — مطعم البيت', submittedAt: new Date(Date.now() - 3600_000 * 2).toISOString(), metadata: { mediaKey: 'product.chicken.v1', mediaPolicy: 'catalog-owned-media', nextOwner: 'control-panel-catalog', systemNote: 'جودة الصورة مقبولة، تحتاج قص RTL' }, auditTrail: [] },
  { id: 'mr-002', entityType: 'product', source: 'app-partner', stage: 'marketing-review', title: 'منتج جديد: عصير رمان طبيعي', submittedAt: new Date(Date.now() - 3600_000 * 5).toISOString(), metadata: { mediaKey: 'product.yogurt.v1', mediaPolicy: 'catalog-owned-media', nextOwner: 'control-panel-catalog', systemNote: 'منتج جديد يحتاج اعتماد تسويقي قبل الكتالوج' }, auditTrail: [] },
  { id: 'mr-003', entityType: 'product-media', source: 'app-partner', stage: 'marketing-approved', title: 'صورة بيتزا مارغريتا — شريك مطعم', submittedAt: new Date(Date.now() - 3600_000 * 8).toISOString(), metadata: { mediaKey: 'product.pasta.v1', mediaPolicy: 'partner-owned-exception', nextOwner: 'control-panel-catalog', systemNote: 'استثناء شريك: الصورة مرتبطة ببراند المطعم' }, auditTrail: [{ at: new Date(Date.now() - 3600_000 * 6).toISOString(), fromStage: 'marketing-review', toStage: 'marketing-approved', owner: 'control-panel-marketing', actionLabel: 'اعتماد تسويقي' }] },
  { id: 'mr-004', entityType: 'category-suggestion', source: 'control-panel-marketing', stage: 'marketing-review', title: 'فئة مقترحة: مأكولات صحية', submittedAt: new Date(Date.now() - 3600_000 * 1).toISOString(), metadata: { mediaKey: 'category.main.restaurants.v1', mediaPolicy: 'catalog-owned-media', nextOwner: 'control-panel-catalog', systemNote: 'فئة جديدة تحتاج موافقة التسويق قبل إنشائها في الكتالوج' }, auditTrail: [] },
  { id: 'mr-005', entityType: 'product-media', source: 'app-partner', stage: 'needs-fix', title: 'صورة سلطة يونانية — دقة منخفضة', submittedAt: new Date(Date.now() - 3600_000 * 12).toISOString(), metadata: { mediaKey: 'product.salad.v1', mediaPolicy: 'catalog-owned-media', nextOwner: 'app-partner', systemNote: 'الصورة أقل من 800×600 — يُرجى إعادة الرفع' }, auditTrail: [{ at: new Date(Date.now() - 3600_000 * 10).toISOString(), fromStage: 'marketing-review', toStage: 'needs-fix', owner: 'control-panel-marketing', actionLabel: 'طلب تعديل' }] },
  { id: 'mr-006', entityType: 'store', source: 'app-partner', stage: 'marketing-review', title: 'غلاف متجر: مطعم الياسمين', submittedAt: new Date(Date.now() - 3600_000 * 4).toISOString(), metadata: { mediaKey: 'store.hittin.cover.v1', mediaPolicy: 'restaurant-exception', nextOwner: 'control-panel-catalog', systemNote: 'غلاف متجر — استثناء مطعم، يخضع لسياسة الوسائط الخاصة' }, auditTrail: [] },
  { id: 'mr-007', entityType: 'product-media', source: 'app-partner', stage: 'marketing-review', title: 'تعارض وسائط: صورة مكررة لمنتجين', submittedAt: new Date(Date.now() - 1800_000).toISOString(), metadata: { mediaKey: 'product.roll.v1', mediaPolicy: 'media-conflict', nextOwner: 'control-panel-marketing', systemNote: 'نفس الصورة مرتبطة بمنتجين مختلفين — يتطلب حلاً' }, auditTrail: [] },
  { id: 'mr-008', entityType: 'product', source: 'app-partner', stage: 'catalog-adopted', title: 'وجبة عائلية مكتملة — أُرسلت للكتالوج', submittedAt: new Date(Date.now() - 3600_000 * 24).toISOString(), metadata: { mediaKey: 'product.chicken.v1', mediaPolicy: 'catalog-owned-media', nextOwner: 'control-panel-catalog', systemNote: 'مكتمل — ظاهر في الكتالوج' }, auditTrail: [{ at: new Date(Date.now() - 3600_000 * 20).toISOString(), fromStage: 'marketing-review', toStage: 'marketing-approved', owner: 'control-panel-marketing', actionLabel: 'اعتماد تسويقي' }, { at: new Date(Date.now() - 3600_000 * 16).toISOString(), fromStage: 'marketing-approved', toStage: 'catalog-adopted', owner: 'control-panel-marketing', actionLabel: 'إرسال للكتالوج' }] },
  { id: 'cat-1', entityType: 'product', source: 'control-panel-marketing', stage: 'catalog-adopted', title: 'عنصر معتمد — في الكتالوج (مسودة)', submittedAt: new Date(Date.now() - 3600_000 * 60).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 56).toISOString(), fromStage: 'marketing-approved', toStage: 'catalog-adopted', owner: 'control-panel-catalog', actionLabel: 'اعتماد مركزي' }] },
  { id: 'cat-2', entityType: 'product', source: 'control-panel-catalog', stage: 'client-visible', title: 'عنصر ظاهر للعميل', submittedAt: new Date(Date.now() - 3600_000 * 120).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 100).toISOString(), fromStage: 'catalog-adopted', toStage: 'client-visible', owner: 'control-panel-catalog', actionLabel: 'تفعيل للعميل' }] },
  { id: 'cat-3', entityType: 'partner-offer', source: 'control-panel-marketing', stage: 'marketing-approved', title: 'عرض ترويجي من التسويق', submittedAt: new Date(Date.now() - 3600_000 * 10).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 8).toISOString(), fromStage: 'marketing-review', toStage: 'marketing-approved', owner: 'control-panel-marketing', actionLabel: 'اعتماد تسويقي' }] },
  { id: 'cat-4', entityType: 'product-media', source: 'control-panel-marketing', stage: 'marketing-approved', title: 'صورة مطعم مخصصة', submittedAt: new Date(Date.now() - 3600_000 * 6).toISOString(), auditTrail: [{ at: new Date(Date.now() - 3600_000 * 4).toISOString(), fromStage: 'marketing-review', toStage: 'marketing-approved', owner: 'control-panel-marketing', actionLabel: 'اعتماد تسويقي' }] },
];

export function getAllApprovalRecords(): ApprovalRecord[] {
  return _globalStore;
}

export function getPartnerQueueRecords(
  _storeId?: string,
): readonly PartnerQueueRecord[] {
  return [];
}

// ─── Ownership / Surface Filters ────────────────────────────────────────────
export function isPartnerOwnedException(stage: ApprovalStage | string): boolean {
  return stage === 'partner-review' || stage === 'rejected';
}

export function canRenderInClientSurface(stage: ApprovalStage | string): boolean {
  return stage === 'client-visible';
}

// ─── Translation Helpers ────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  'partner-review':    'مراجعة الشريك',
  'partner-approved':  'موافقة الشريك',
  'catalog-review':    'مراجعة الكتالوج',
  'catalog-adopted':   'معتمد',
  'marketing-review':  'مراجعة التسويق',
  'marketing-approved':'موافقة التسويق',
  'client-visible':    'ظاهر للعميل',
  'rejected':          'مرفوض',
};

const OWNER_LABELS: Record<string, string> = {
  partner:   'الشريك',
  catalog:   'الكتالوج',
  marketing: 'التسويق',
  system:    'النظام',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  product:  'منتج',
  category: 'تصنيف',
  store:    'متجر',
};

export function translateStage(stage: string | undefined): string {
  if (!stage) return '—';
  return STAGE_LABELS[stage] ?? stage;
}

export function translateOwner(owner: string | undefined): string {
  if (!owner) return '—';
  return OWNER_LABELS[owner] ?? owner;
}

export function translateEntityType(entityType: string | undefined): string {
  if (!entityType) return '—';
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

// ─── Live Order Decisions & Auditing ────────────────────────────────────────

export type LiveOrderDecisionRecord = {
  decision: DshOperationsDecisionKind;
  note: string;
  submitted: boolean;
  nextLifecycleStatus: DshOrderLifecycleStatus;
};

let _globalLiveOrderDecisions: Record<string, LiveOrderDecisionRecord> = {};

const PENDING_APPROVAL_LOOKUP: Record<string, { customerName: string; storeName: string }> = {
  'PA-0081': { customerName: 'أحمد محمد', storeName: 'بيك إن بريستو' },
  'PA-0082': { customerName: 'سارة خالد', storeName: 'برغر لاب' },
};

export type UiAuditRow = {
  id: string; who: string; why: string; when: string; permissionResult: string;
  slaBreachReason: string; supportTicketLink: string; proofRequired: string;
  evidenceState: string; resolutionPath: string; note: string; statusTone: string;
};

let _globalUiAuditRows: UiAuditRow[] = [];

export function getDynamicUiAudits(): UiAuditRow[] { return _globalUiAuditRows; }

export function getLiveOrderDecisions(): Record<string, LiveOrderDecisionRecord> {
  return _globalLiveOrderDecisions;
}

export function updateLiveOrderDecision(
  orderId: string,
  decision: DshOperationsDecisionKind,
  note: string,
  nextLifecycleStatus: DshOrderLifecycleStatus,
): void {
  _globalLiveOrderDecisions = { ..._globalLiveOrderDecisions, [orderId]: { decision, note, submitted: true, nextLifecycleStatus } };

  const info = PENDING_APPROVAL_LOOKUP[orderId] || { customerName: 'عميل', storeName: 'متجر' };
  const orderLabel = `${info.customerName} — ${info.storeName}`;
  const decisionResult = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending';
  const decisionLabel = decision === 'approve' ? 'موافق' : decision === 'reject' ? 'مرفوض' : 'طلب تعديل';
  const statusTone = decision === 'approve' ? 'success' : decision === 'reject' ? 'danger' : 'warning';

  const auditEntry: DshAuditEntry = {
    entryId: `${orderId}-audit`,
    actorRoleId: 'platform-operator',
    actorName: 'مشغّل المنصة',
    timestamp: new Date().toISOString(),
    section: 'catalog-approval',
    sensitiveAction: 'approve-catalog',
    decision: decisionResult,
    reason: note || 'مراجعة واعتماد الطلب المعلق تشغيلياً.',
    evidence: 'مرفقات الطلب ومستند إثبات الشريك',
    relatedEntityId: orderId,
    relatedEntityLabel: orderLabel,
    affectedSurfaces: ['control-panel', 'app-partner', 'app-client'],
    wltReadOnly: false,
    rollbackNote: decision === 'approve' ? 'يمكن إلغاء الموافقة وإعادة الطلب للمراجعة' : undefined,
  };
  addDshAuditEntry(auditEntry);

  const ticketId = orderId === 'PA-0081' ? 'تذكرة-4022' : orderId === 'PA-0082' ? 'تذكرة-4025' : 'عام';
  const uiAuditRow: UiAuditRow = {
    id: `${orderId}-audit`, who: 'مشغّل المنصة', why: 'قرار مراجعة العمليات', when: 'منذ ثوانٍ',
    permissionResult: decisionLabel, slaBreachReason: 'مراجعة تشغيلية', supportTicketLink: ticketId,
    proofRequired: 'صورة إثبات', evidenceState: 'مكتمل', resolutionPath: 'حل',
    note: note || 'مراجعة واعتماد الطلب المعلق تشغيلياً.', statusTone: statusTone,
  };
  _globalUiAuditRows = [uiAuditRow, ..._globalUiAuditRows];
}
