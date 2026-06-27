// partner.workflow.ts — partner operational workflow utilities
// Authority: dsh/frontend/shared/partner
// Promotion candidates, catalog queue, stage/owner translation utilities.

// ─── ApprovalStage ──────────────────────────────────────────────────────────
export type ApprovalStage =
  | 'partner-review'
  | 'partner-approved'
  | 'catalog-review'
  | 'catalog-adopted'
  | 'marketing-review'
  | 'marketing-approved'
  | 'client-visible'
  | 'rejected';

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

export function getPartnerQueueRecords(
  _storeId: string,
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

