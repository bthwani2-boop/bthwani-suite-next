import type { DshPartner, DshPartnerReadiness } from "./partner.types";
import type { DshPartnerActivationStatus } from "./partner-activation.model";
import { getDshPartnerActivationStatusLabel, getDshPartnerActivationStateMetadata, getDshPartnerReadinessChecklist } from "./partner-activation.model";


export type DshPartnerListRowViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly category: string;
  readonly onboardingStatus: string;
  readonly statusLabel: string;
  readonly statusTone: "success" | "warning" | "danger" | "info" | "muted";
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly createdAt: string;
  readonly isClientVisible: boolean;
  readonly isDeactivated: boolean;
  readonly isRejected: boolean;
};

export type DshPartnerDetailViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly legalNameEn: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerName: string;
  readonly primaryPhone: string;
  readonly email: string;
  readonly category: string;
  readonly onboardingStatus: string;
  readonly statusLabel: string;
  readonly statusTone: "success" | "warning" | "danger" | "info" | "muted";
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly rejectionReason: string;
  readonly auditRequired: boolean;
  readonly allowedNextStatuses: readonly string[];
  readonly canActivate: boolean;
  readonly canDeactivate: boolean;
  readonly canReject: boolean;
  readonly isClientVisible: boolean;
  readonly checklist: readonly { id: string; label: string; satisfied: boolean; blockedReason?: string | undefined }[];
};

export type DshPartnerReadinessViewModel = {
  readonly allGatesPassed: boolean;
  readonly blockerLabel: string;
  readonly items: readonly { id: string; label: string; satisfied: boolean; blockedReason?: string | undefined }[];
};

function resolveStatusTone(status: DshPartnerActivationStatus): "success" | "warning" | "danger" | "info" | "muted" {
  if (status === "client_visible" || status === "partner_active") return "success";
  if (status === "ops_rejected" || status === "partner_deactivated") return "danger";
  if (status === "documents_missing" || status === "catalog_not_ready" || status === "delivery_modes_not_ready") return "warning";
  if (status === "ops_review" || status === "ops_approved") return "info";
  return "muted";
}

export function buildPartnerListRowViewModel(p: DshPartner): DshPartnerListRowViewModel {
  const meta = getDshPartnerActivationStateMetadata(p.onboardingStatus);
  return {
    id: p.id,
    displayName: p.displayName,
    legalNameAr: p.legalNameAr,
    category: p.category,
    onboardingStatus: p.onboardingStatus,
    statusLabel: getDshPartnerActivationStatusLabel(p.onboardingStatus),
    statusTone: resolveStatusTone(p.onboardingStatus),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    createdAt: p.createdAt,
    isClientVisible: p.onboardingStatus === "client_visible",
    isDeactivated: p.onboardingStatus === "partner_deactivated",
    isRejected: p.onboardingStatus === "ops_rejected",
  };
}

export function buildPartnerDetailViewModel(p: DshPartner): DshPartnerDetailViewModel {
  const status = p.onboardingStatus;
  const meta = getDshPartnerActivationStateMetadata(status);
  const checklist = getDshPartnerReadinessChecklist(status);
  return {
    id: p.id,
    displayName: p.displayName,
    legalNameAr: p.legalNameAr,
    legalNameEn: p.legalNameEn,
    legalIdentityType: p.legalIdentityType,
    legalIdentityNumber: p.legalIdentityNumber,
    ownerName: p.ownerName,
    primaryPhone: p.primaryPhone,
    email: p.email,
    category: p.category,
    onboardingStatus: p.onboardingStatus,
    statusLabel: getDshPartnerActivationStatusLabel(status),
    statusTone: resolveStatusTone(status),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    rejectionReason: p.rejectionReason,
    auditRequired: meta?.auditRequired ?? false,
    allowedNextStatuses: meta?.allowedNextStatuses ?? [],
    canActivate: meta?.allowedNextStatuses.includes("partner_active") ?? false,
    canDeactivate: meta?.allowedNextStatuses.includes("partner_deactivated") ?? false,
    canReject: meta?.allowedNextStatuses.includes("ops_rejected") ?? false,
    isClientVisible: status === "client_visible",
    checklist: checklist.map(c => ({ ...c })),
  };
}

export function buildPartnerReadinessViewModel(r: DshPartnerReadiness): DshPartnerReadinessViewModel {
  const allPassed = r.documentsDone && r.catalogDone && r.deliveryDone && r.partnerActive;
  return {
    allGatesPassed: allPassed,
    blockerLabel: r.blockerSummary || (allPassed ? "" : "شرط غير مستوفٍ"),
    items: [
      { id: "documents", label: "الوثائق معتمدة",               satisfied: r.documentsDone, ...(!r.documentsDone && r.blockerSummary ? { blockedReason: r.blockerSummary } : {}) },
      { id: "catalog",   label: "الكتالوج جاهز ومعتمد",         satisfied: r.catalogDone,   ...(!r.catalogDone   && r.blockerSummary ? { blockedReason: r.blockerSummary } : {}) },
      { id: "delivery",  label: "أوضاع التوصيل مهيأة",          satisfied: r.deliveryDone,  ...(!r.deliveryDone  && r.blockerSummary ? { blockedReason: r.blockerSummary } : {}) },
      { id: "active",    label: "الشريك نشط (اعتماد العمليات)", satisfied: r.partnerActive, ...(!r.partnerActive  && r.blockerSummary ? { blockedReason: r.blockerSummary } : {}) },
    ],
  };
}
