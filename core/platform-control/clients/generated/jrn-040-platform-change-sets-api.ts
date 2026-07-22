/**
 * Generated contract types for JRN-040 platform change sets.
 * Source: core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml
 */

export type PlatformChangeSetStatus =
  | "draft"
  | "validated"
  | "submitted"
  | "approved"
  | "rejected"
  | "applied"
  | "rolled_back"
  | "failed";

export type PlatformChangeTargetType = "variable" | "feature_flag";

export interface PlatformChangeSetItem {
  id: string;
  targetType: PlatformChangeTargetType;
  targetKey: string;
  ownerService: string;
  scopeType: string;
  scopeId?: string;
  valueType: string;
  classification: string;
  expectedRevision: number;
  preconditionSnapshot?: unknown;
  validatedRevision?: number;
  itemValidatedAt?: string;
  beforeValue?: unknown;
  proposedValue: unknown;
  appliedRevision?: number;
}

export interface PlatformChangeSet {
  id: string;
  title: string;
  reason: string;
  impactAssessment: string;
  rollbackPlan: string;
  status: PlatformChangeSetStatus;
  proposerActorId: string;
  approverActorId?: string;
  appliedByActorId?: string;
  rejectedByActorId?: string;
  rejectionReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  appliedAt?: string;
  rolledBackAt?: string;
  items: PlatformChangeSetItem[];
}

export interface CreatePlatformChangeSetItemInput {
  targetType: PlatformChangeTargetType;
  targetKey: string;
  ownerService: string;
  scopeType?: string;
  scopeId?: string;
  valueType?: string;
  classification?: string;
  expectedRevision: number;
  proposedValue: unknown;
}

export interface CreatePlatformChangeSetInput {
  title: string;
  reason: string;
  impactAssessment: string;
  rollbackPlan: string;
  items: CreatePlatformChangeSetItemInput[];
}

export interface RejectPlatformChangeSetInput {
  reason: string;
}

export interface RollbackPlatformChangeSetInput {
  reason: string;
}

export interface PlatformChangeSetResponse {
  changeSet: PlatformChangeSet;
}

export interface PlatformChangeSetListResponse {
  changeSets: PlatformChangeSet[];
}
