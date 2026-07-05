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

// Real DSH backend calls (GET /dsh/catalog-approvals, GET /dsh/partner/catalog-approvals).
// No in-memory mock: an unreachable/misconfigured API surfaces as an empty
// list rather than fabricated data.
export async function getAllApprovalRecords(): Promise<ApprovalRecord[]> {
  const { listCatalogApprovals } = await import('./catalog-approval.api');
  return listCatalogApprovals();
}

export async function getPartnerQueueRecords(
  _storeId?: string,
): Promise<readonly PartnerQueueRecord[]> {
  const { listPartnerCatalogQueue } = await import('./catalog-approval.api');
  return listPartnerCatalogQueue();
}

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
