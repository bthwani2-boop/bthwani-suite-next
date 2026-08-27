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
} from './partner.types';

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

export function translateStage(stage: string | undefined): string {
  if (!stage) return '—';
  return STAGE_LABELS[stage] ?? stage;
}

export function translateOwner(owner: string | undefined): string {
  if (!owner) return '—';
  return OWNER_LABELS[owner] ?? owner;
}


// ─── Live Order Decisions & Auditing ────────────────────────────────────────
