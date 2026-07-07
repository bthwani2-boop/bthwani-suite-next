// partner.workflow.ts — partner operational workflow utilities
// Authority: dsh/frontend/shared/partner
// Promotion candidates, catalog queue, stage/owner translation utilities.


export type {
  ApprovalStage,
  ApprovalEntityType,
  ApprovalSourceSurface,
  AuditTrailEntry,
  ApprovalRecordMetadata,
  ApprovalRecord,
  DshPromotionCandidate,
  PartnerQueueRecord,
} from './partner.types';

import type {
  ApprovalStage,
  ApprovalEntityType,
  DshPromotionCandidate,
  PartnerQueueRecord,
  ApprovalRecord,
} from './partner.types';

export const MARKETING_SIGNAL_ENTITY_TYPES: ReadonlyArray<ApprovalEntityType> = [
  'product', 'product-media', 'category-suggestion', 'store',
];

export const MARKETING_SIGNAL_STAGES: ReadonlyArray<ApprovalStage> = [
  'marketing-review', 'marketing-approved', 'needs-fix', 'catalog-adopted', 'rejected',
];

export function dshPromotionCandidates(
  _storeId: string,
): readonly DshPromotionCandidate[] {
  return [];
}

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

export type UiAuditRow = {
  id: string; who: string; why: string; when: string; permissionResult: string;
  slaBreachReason: string; supportTicketLink: string; proofRequired: string;
  evidenceState: string; resolutionPath: string; note: string; statusTone: string;
};

let _globalUiAuditRows: UiAuditRow[] = [];

export function getDynamicUiAudits(): UiAuditRow[] { return _globalUiAuditRows; }
