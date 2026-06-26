import type { DshPartnerActivationStatus } from './partner-activation.model';

export type DshPartner = {
  readonly id: string;
  readonly legalNameAr: string;
  readonly legalNameEn: string;
  readonly displayName: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerName: string;
  readonly primaryPhone: string;
  readonly secondaryPhone: string;
  readonly email: string;
  readonly category: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly notes: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerSummary = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly category: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly primaryPhone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerDocument = {
  readonly id: string;
  readonly partnerId: string;
  readonly documentType: string;
  readonly documentStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_resubmit';
  readonly uploadedByActorId: string;
  readonly mediaRef: string;
  readonly notes: string;
  readonly rejectionReason: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerFieldVisit = {
  readonly id: string;
  readonly partnerId: string;
  readonly storeId: string;
  readonly fieldActorId: string;
  readonly visitStatus: 'draft' | 'in_progress' | 'submitted' | 'escalated';
  readonly visitNotes: string;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly evidenceMediaRefs: string[];
  readonly version: number;
  readonly createdAt: string;
  readonly submittedAt: string | null;
};

export type DshPartnerReadinessItem = {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly blockedReason?: string;
};

export type DshPartnerReadiness = {
  readonly partnerId: string;
  readonly canActivate: boolean;
  readonly blockedReason?: string;
  readonly checklist: DshPartnerReadinessItem[];
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
  readonly ownerName?: string;
  readonly primaryPhone: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly category?: string;
  readonly notes?: string;
};

export type DshUpdatePartnerRequest = {
  readonly displayName?: string;
  readonly ownerName?: string;
  readonly primaryPhone?: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly notes?: string;
};

export type DshPartnerTransitionInput = {
  readonly toStatus: DshPartnerActivationStatus;
  readonly reason?: string;
};

export type DshAddDocumentInput = {
  readonly documentType: string;
  readonly mediaRef: string;
  readonly notes?: string;
};

export type DshReviewDocumentInput = {
  readonly decision: 'approved' | 'rejected' | 'needs_resubmit';
  readonly reason?: string;
};

export type DshCreatePartnerFieldVisitRequest = {
  readonly storeId?: string;
  readonly visitNotes?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
  readonly evidenceMediaRefs?: string[];
};

export type DshPartnerListResponse = {
  readonly partners: DshPartnerSummary[];
  readonly pagination: {
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  };
};

export type DshPartnerDocumentType =
  | "national_id"
  | "commercial_register"
  | "lease_agreement"
  | "health_certificate"
  | "store_photo"
  | "owner_photo"
  | "other";

export const REQUIRED_DOCUMENT_TYPES: DshPartnerDocumentType[] = [
  "national_id",
  "commercial_register",
];

export const DOCUMENT_TYPE_LABELS: Record<DshPartnerDocumentType, string> = {
  national_id: "الهوية الوطنية",
  commercial_register: "السجل التجاري",
  lease_agreement: "عقد الإيجار أو الملكية",
  health_certificate: "شهادة صحة / ترخيص",
  store_photo: "صورة المتجر",
  owner_photo: "صورة المالك",
  other: "مستند آخر",
};

