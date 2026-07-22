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
  ApprovalSourceSurface,
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

function dshPromotionCandidates(
  _storeId: string,
): readonly DshPromotionCandidate[] {
  return [];
}

const APPROVAL_SOURCE_SURFACES: readonly ApprovalSourceSurface[] = [
  'app-partner',
  'app-field',
  'control-panel-partners',
  'control-panel-marketing',
  'control-panel-catalog',
  'app-client',
];

function normalizeApprovalSource(value: string): ApprovalSourceSurface {
  return APPROVAL_SOURCE_SURFACES.includes(value as ApprovalSourceSurface)
    ? value as ApprovalSourceSurface
    : 'control-panel-catalog';
}

function normalizePartnerQueueEntityType(
  entityType: ApprovalEntityType,
): PartnerQueueRecord['entityType'] | null {
  if (entityType === 'product' || entityType === 'store') return entityType;
  if (entityType === 'category-suggestion') return 'category';
  return null;
}

function normalizePartnerQueueOwner(
  source: ApprovalSourceSurface,
): PartnerQueueRecord['owner'] {
  if (source === 'app-partner' || source === 'control-panel-partners') return 'partner';
  if (source === 'control-panel-catalog') return 'catalog';
  if (source === 'control-panel-marketing') return 'marketing';
  return 'system';
}

// Real DSH backend calls (GET /dsh/catalog-approvals, GET /dsh/partner/catalog-approvals).
// No in-memory mock: an unreachable/misconfigured API surfaces as an empty
// list rather than fabricated data.
export async function getAllApprovalRecords(): Promise<ApprovalRecord[]> {
  const { listCatalogApprovals } = await import('./catalog-approval.api');
  const records = await listCatalogApprovals();
  return records.map((record) => ({
    id: record.id,
    entityType: record.entityType,
    source: record.source,
    stage: record.stage,
    title: record.title,
    submittedAt: record.submittedAt,
    ...(record.metadata ? { metadata: record.metadata } : {}),
    ...(record.auditTrail
      ? {
          auditTrail: record.auditTrail.map((entry) => ({
            at: entry.at,
            fromStage: entry.fromStage,
            toStage: entry.toStage,
            owner: normalizeApprovalSource(entry.owner),
            actionLabel: entry.actionLabel,
          })),
        }
      : {}),
  }));
}

async function getPartnerQueueRecords(
  _storeId?: string,
): Promise<readonly PartnerQueueRecord[]> {
  const { listPartnerCatalogQueue } = await import('./catalog-approval.api');
  const records = await listPartnerCatalogQueue();
  return records.flatMap((record) => {
    const entityType = normalizePartnerQueueEntityType(record.entityType);
    if (!entityType) return [];
    return [{
      id: record.id,
      entityId: record.entityId,
      entityType,
      stage: record.stage,
      owner: normalizePartnerQueueOwner(record.owner),
      createdAt: record.createdAt,
    }];
  });
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
