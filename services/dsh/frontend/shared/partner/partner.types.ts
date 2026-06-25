import type { DshPartnerActivationStatus } from './partner-activation.model';

export type DshPartner = {
  readonly id: string;
  readonly legalNameAr: string;
  readonly legalNameEn: string;
  readonly displayName: string;
  readonly legalIdentityType: 'national_id' | 'commercial_registration' | 'other';
  readonly legalIdentityNumber: string;
  readonly ownerName: string;
  readonly primaryPhone: string;
  readonly secondaryPhone: string;
  readonly email: string;
  readonly category: 'restaurant' | 'grocery' | 'pharmacy' | 'bakery' | 'other';
  readonly onboardingStatus: DshPartnerActivationStatus;
  readonly rejectionReason: string;
  readonly createdBy: string;
  readonly assignedFieldAgent: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerDocument = {
  readonly id: string;
  readonly partnerId: string;
  readonly docType: 'national_id' | 'commercial_registration' | 'lease_contract' | 'health_certificate' | 'other';
  readonly status: 'uploaded' | 'verified' | 'rejected' | 'replacement_requested';
  readonly mediaRef: string;
  readonly notes: string;
  readonly reviewedBy: string;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerReadiness = {
  readonly partnerId: string;
  readonly status: string;
  readonly documentsDone: boolean;
  readonly catalogDone: boolean;
  readonly deliveryDone: boolean;
  readonly partnerActive: boolean;
  readonly clientVisible: boolean;
  readonly blockerSummary: string;
};

export type DshPartnerAuditEvent = {
  readonly id: string;
  readonly partnerId: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly actorId: string;
  readonly actorSurface: string;
  readonly reason: string;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshPartnerStore = {
  readonly id: string;
  readonly partnerId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly status: string;
  readonly isVisible: boolean;
  readonly cityCode: string;
  readonly createdAt: string;
};

export type DshCreatePartnerInput = {
  readonly legalNameAr: string;
  readonly legalNameEn?: string;
  readonly displayName: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerName: string;
  readonly primaryPhone: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly category: string;
  readonly createdBy?: string;
  readonly assignedFieldAgent?: string;
  readonly idempotencyKey?: string;
};

export type DshPartnerTransitionInput = {
  readonly targetStatus: string;
  readonly reason?: string;
  readonly actorId?: string;
  readonly actorSurface?: string;
  readonly correlationId?: string;
  readonly version?: number;
};

export type DshAddDocumentInput = {
  readonly docType: string;
  readonly mediaRef: string;
  readonly notes?: string;
};

export type DshReviewDocumentInput = {
  readonly status: 'verified' | 'rejected' | 'replacement_requested';
  readonly notes?: string;
  readonly reviewedBy: string;
};
