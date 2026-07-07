// partner.types.ts — partner operational workflow type definitions
// Authority: dsh/frontend/shared/partner

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

export type DshPromotionCandidate = {
  readonly id: string;
  readonly productId: string;
  readonly storeId: string;
  readonly candidacyScore: number;
  readonly reason: string;
};

export type PartnerQueueRecord = {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: 'product' | 'category' | 'store';
  readonly stage: ApprovalStage;
  readonly owner: 'partner' | 'catalog' | 'marketing' | 'system';
  readonly createdAt: string;
};

export type UiAuditRow = {
  id: string; who: string; why: string; when: string; permissionResult: string;
  slaBreachReason: string; supportTicketLink: string; proofRequired: string;
  evidenceState: string; resolutionPath: string; note: string; statusTone: string;
};
