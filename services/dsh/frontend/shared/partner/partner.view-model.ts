import type { DshPartner, DshPartnerSummary, DshPartnerReadiness } from "./partner.types";
import type { DshPartnerActivationStatus } from "./partner-activation.model";
import { getDshPartnerActivationStatusLabel, getDshPartnerActivationStateMetadata, getDshPartnerReadinessChecklist } from "./partner-activation.model";

const BUSINESS_VERTICAL_LABELS: Record<string, string> = {
  "domain-restaurants": "مطاعم",
  "domain-groceries": "مقاضي ومتاجر غذائية",
  "domain-pharmacy": "صيدلية",
  "domain-bthwani-store": "متجر بثواني",
};

export function getDshBusinessVerticalLabel(verticalId: string, legacyCategory = ""): string {
  return BUSINESS_VERTICAL_LABELS[verticalId] ?? (legacyCategory && legacyCategory !== "default" ? legacyCategory : "غير محدد");
}

export type DshPartnerListRowViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly category: string;
  readonly businessVerticalId: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly statusLabel: string;
  readonly statusTone: "success" | "warning" | "danger" | "info" | "muted";
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly createdAt: string;
  readonly isClientVisible: boolean;
  readonly isDeactivated: boolean;
  readonly isRejected: boolean;
};

export type DshPartnerPayoutDestinationViewModel = {
  readonly configured: boolean;
  readonly destinationId: string;
  readonly method: string;
  readonly maskedReference: string;
  readonly verificationStatus: string;
};

export type DshPartnerDetailViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly legalNameEn: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerActorId: string;
  readonly workforcePersonId: string;
  readonly primaryPhone: string;
  readonly email: string;
  readonly category: string;
  readonly businessVerticalId: string;
  readonly payoutDestination: DshPartnerPayoutDestinationViewModel;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly statusLabel: string;
  readonly statusTone: "success" | "warning" | "danger" | "info" | "muted";
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly rejectionReason: string;
  readonly auditRequired: boolean;
  readonly allowedNextStatuses: readonly DshPartnerActivationStatus[];
  readonly canActivate: boolean;
  readonly canDeactivate: boolean;
  readonly canReject: boolean;
  readonly isClientVisible: boolean;
  readonly checklist: readonly { id: string; label: string; satisfied: boolean; blockedReason?: string | undefined }[];
};

export type DshPartnerReadinessViewModel = {
  readonly allGatesPassed: boolean;
  readonly canActivatePartner: boolean;
  readonly intakeComplete: boolean;
  readonly publicationDecision: "PUBLISHED" | "BLOCKED";
  readonly blockingReasons: readonly string[];
  readonly blockerLabel: string;
  readonly partnerActivationBlockedReason: string;
  readonly items: readonly { id: string; label: string; satisfied: boolean; blockedReason?: string | undefined }[];
};

function buildPayoutDestinationViewModel(p: DshPartner): DshPartnerPayoutDestinationViewModel {
  const configured = Boolean(
    p.payoutDestinationId &&
    p.destinationMethod === "official_wallet" &&
    p.maskedDestinationReference,
  );
  return {
    configured,
    destinationId: p.payoutDestinationId || "",
    method: p.destinationMethod || "",
    maskedReference: p.maskedDestinationReference || "",
    verificationStatus: p.destinationVerificationStatus || "",
  };
}

function resolveStatusTone(status: DshPartnerActivationStatus): "success" | "warning" | "danger" | "info" | "muted" {
  if (status === "client_visible" || status === "partner_active") return "success";
  if (status === "ops_rejected" || status === "partner_terminated") return "danger";
  if (status === "documents_missing" || status === "catalog_not_ready" || status === "delivery_modes_not_ready") return "warning";
  if (status === "ops_review" || status === "ops_approved") return "info";
  return "muted";
}

export function buildPartnerListRowViewModel(p: DshPartnerSummary | DshPartner): DshPartnerListRowViewModel {
  const status = p.activationStatus;
  const meta = getDshPartnerActivationStateMetadata(status);
  return {
    id: p.id,
    displayName: p.displayName,
    legalNameAr: p.legalNameAr,
    category: p.category,
    businessVerticalId: p.businessVerticalId,
    activationStatus: status,
    statusLabel: getDshPartnerActivationStatusLabel(status),
    statusTone: resolveStatusTone(status),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    createdAt: p.createdAt,
    isClientVisible: status === "client_visible",
    isDeactivated: status === "partner_terminated",
    isRejected: status === "ops_rejected",
  };
}

export function buildPartnerDetailViewModel(p: DshPartner): DshPartnerDetailViewModel {
  const status = p.activationStatus;
  const meta = getDshPartnerActivationStateMetadata(status);
  const checklist = getDshPartnerReadinessChecklist(status);
  return {
    id: p.id,
    displayName: p.displayName,
    legalNameAr: p.legalNameAr,
    legalNameEn: p.legalNameEn,
    legalIdentityType: p.legalIdentityType,
    legalIdentityNumber: p.legalIdentityNumber,
    ownerActorId: p.ownerActorId,
    workforcePersonId: p.workforcePersonId,
    primaryPhone: p.primaryPhone,
    email: p.email,
    category: p.category,
    businessVerticalId: p.businessVerticalId,
    payoutDestination: buildPayoutDestinationViewModel(p),
    activationStatus: status,
    statusLabel: getDshPartnerActivationStatusLabel(status),
    statusTone: resolveStatusTone(status),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    rejectionReason: "", // backend maps rejection reason inside audit/events or notes
    auditRequired: meta?.auditRequired ?? false,
    allowedNextStatuses: meta?.allowedNextStatuses ?? [],
    canActivate: meta?.allowedNextStatuses.includes("partner_active") ?? false,
    canDeactivate: meta?.allowedNextStatuses.includes("partner_terminated") ?? false,
    canReject: meta?.allowedNextStatuses.includes("ops_rejected") ?? false,
    isClientVisible: status === "client_visible",
    checklist: checklist.map(c => ({ ...c })),
  };
}

export function buildPartnerReadinessViewModel(r: DshPartnerReadiness): DshPartnerReadinessViewModel {
  return {
    allGatesPassed: r.canActivate,
    canActivatePartner: r.canActivatePartner,
    intakeComplete: r.intakeComplete,
    publicationDecision: r.publicationDecision,
    blockingReasons: [...r.blockingReasons],
    blockerLabel: r.blockedReason ?? "",
    partnerActivationBlockedReason: r.partnerActivationBlockedReason ?? "",
    items: r.checklist.map(item => ({
      id: item.id,
      label: item.label,
      satisfied: item.satisfied,
      blockedReason: item.blockedReason,
    })),
  };
}
