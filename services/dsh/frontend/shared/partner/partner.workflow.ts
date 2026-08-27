// partner.workflow.ts — partner operational workflow utilities
// Authority: dsh/frontend/shared/partner
// Stage/owner translation utilities and client-visibility policy.


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
} from './partner.types';


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
