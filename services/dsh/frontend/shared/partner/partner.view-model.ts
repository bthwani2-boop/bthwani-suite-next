import type { DshPartner, DshPartnerSummary, DshPartnerReadiness } from "./partner.types";
import type { DshPartnerActivationStatus } from "./partner-activation.model";
import { getDshPartnerActivationStatusLabel, getDshPartnerActivationStateMetadata, getDshPartnerReadinessChecklist } from "./partner-activation.model";

export type DshPartnerListRowViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly category: string;
  readonly activationStatus: string;
  readonly statusLabel: string;
  readonly statusTone: "success" | "warning" | "danger" | "info" | "muted";
  readonly nextAction: string;
  readonly blockedReason: string;
  readonly createdAt: string;
  readonly isClientVisible: boolean;
  readonly isDeactivated: boolean;
  readonly isRejected: boolean;
};

export type DshPartnerBankAccountViewModel = {
  readonly hasBankAccount: boolean;
  readonly beneficiaryName: string;
  readonly bankName: string;
  readonly bankBranch: string;
  readonly maskedAccountNumber: string;
  readonly maskedIban: string;
  readonly settlementPreferenceLabel: string;
  readonly bankAccountHolderMatchesOwner: boolean;
  readonly bankNotes: string;
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
  readonly bankAccount: DshPartnerBankAccountViewModel;
  readonly activationStatus: string;
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
  readonly canActivatePartner: boolean;
  readonly canPublishStoreToClient: boolean;
  readonly blockerLabel: string;
  readonly partnerActivationBlockedReason: string;
  readonly storePublicationBlockedReason: string;
  readonly items: readonly { id: string; label: string; satisfied: boolean; blockedReason?: string | undefined }[];
};

const SETTLEMENT_PREFERENCE_LABELS: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  mobile_wallet: "محفظة جوال",
  "": "غير محدد",
};

// Control-panel display masking: reveal only the last 4 characters of
// sensitive bank identifiers (accountNumber/iban).
function maskBankIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return `${"•".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

function buildBankAccountViewModel(p: DshPartner): DshPartnerBankAccountViewModel {
  const hasBankAccount = Boolean(
    p.beneficiaryName || p.bankName || p.accountNumber || p.iban
  );
  return {
    hasBankAccount,
    beneficiaryName: p.beneficiaryName || "—",
    bankName: p.bankName || "—",
    bankBranch: p.bankBranch || "—",
    maskedAccountNumber: maskBankIdentifier(p.accountNumber),
    maskedIban: maskBankIdentifier(p.iban),
    settlementPreferenceLabel: SETTLEMENT_PREFERENCE_LABELS[p.settlementPreference] ?? p.settlementPreference,
    bankAccountHolderMatchesOwner: p.bankAccountHolderMatchesOwner,
    bankNotes: p.bankNotes || "—",
  };
}

function resolveStatusTone(status: DshPartnerActivationStatus): "success" | "warning" | "danger" | "info" | "muted" {
  if (status === "client_visible" || status === "partner_active") return "success";
  if (status === "ops_rejected" || status === "partner_deactivated") return "danger";
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
    activationStatus: status,
    statusLabel: getDshPartnerActivationStatusLabel(status),
    statusTone: resolveStatusTone(status),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    createdAt: p.createdAt,
    isClientVisible: status === "client_visible",
    isDeactivated: status === "partner_deactivated",
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
    ownerName: p.ownerName,
    primaryPhone: p.primaryPhone,
    email: p.email,
    category: p.category,
    bankAccount: buildBankAccountViewModel(p),
    activationStatus: status,
    statusLabel: getDshPartnerActivationStatusLabel(status),
    statusTone: resolveStatusTone(status),
    nextAction: meta?.nextAction ?? "",
    blockedReason: meta?.blockedReason ?? "",
    rejectionReason: "", // backend maps rejection reason inside audit/events or notes
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
  return {
    allGatesPassed: r.canActivate,
    canActivatePartner: r.canActivatePartner,
    canPublishStoreToClient: r.canPublishStoreToClient,
    blockerLabel: r.blockedReason ?? "",
    partnerActivationBlockedReason: r.partnerActivationBlockedReason ?? "",
    storePublicationBlockedReason: r.storePublicationBlockedReason ?? "",
    items: r.checklist.map(item => ({
      id: item.id,
      label: item.label,
      satisfied: item.satisfied,
      blockedReason: item.blockedReason,
    })),
  };
}
