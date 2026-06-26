import type { DshPartner, DshPartnerSummary, DshPartnerDocument, DshPartnerReadiness } from "./partner.types";
import { getPartnerActivationStatusLabel, getPartnerStateMetadata, isClientVisible } from "./partner.states";
import { DOCUMENT_TYPE_LABELS } from "./partner.types";

// ─── View model for admin (control-panel) ────────────────────────────────────

export type PartnerAdminRow = {
  id: string;
  displayName: string;
  legalNameAr: string;
  category: string;
  activationStatusLabel: string;
  activationStatus: DshPartner["activationStatus"];
  primaryPhone: string;
  ownerName: string;
  nextAction: string;
  isVisible: boolean;
  createdAt: string;
};

export function partnerSummaryToAdminRow(p: DshPartnerSummary): PartnerAdminRow {
  const meta = getPartnerStateMetadata(p.activationStatus);
  return {
    id: p.id,
    displayName: p.displayName,
    legalNameAr: p.legalNameAr,
    category: p.category,
    activationStatusLabel: getPartnerActivationStatusLabel(p.activationStatus),
    activationStatus: p.activationStatus,
    primaryPhone: p.primaryPhone,
    ownerName: "",
    nextAction: meta.nextAction,
    isVisible: isClientVisible(p.activationStatus),
    createdAt: p.createdAt,
  };
}

// ─── View model for partner-self (app-partner) ───────────────────────────────

export type PartnerSelfViewModel = {
  displayName: string;
  statusLabel: string;
  nextAction: string;
  blockedReason: string;
  isActive: boolean;
  isDeactivated: boolean;
  isClientVisible: boolean;
  isSubmitted: boolean;
  canUploadDocuments: boolean;
};

export function partnerToSelfViewModel(p: Pick<DshPartner, "displayName" | "activationStatus">): PartnerSelfViewModel {
  const meta = getPartnerStateMetadata(p.activationStatus);
  const status = p.activationStatus;
  return {
    displayName: p.displayName,
    statusLabel: getPartnerActivationStatusLabel(status),
    nextAction: meta.nextAction,
    blockedReason: meta.blockedReason,
    isActive: status === "partner_active" || status === "client_visible" || status === "client_hidden",
    isDeactivated: status === "partner_deactivated",
    isClientVisible: isClientVisible(status),
    isSubmitted: status !== "draft",
    canUploadDocuments: meta.visibleToPartner && (
      status === "documents_missing" || status === "documents_uploaded"
    ),
  };
}

// ─── View model for field (app-field) ────────────────────────────────────────

export type PartnerFieldViewModel = {
  displayName: string;
  statusLabel: string;
  nextAction: string;
  canSubmit: boolean;
  isSubmitted: boolean;
  isVisible: boolean;
};

export function partnerToFieldViewModel(p: Pick<DshPartner, "displayName" | "activationStatus">): PartnerFieldViewModel {
  const meta = getPartnerStateMetadata(p.activationStatus);
  const status = p.activationStatus;
  return {
    displayName: p.displayName,
    statusLabel: getPartnerActivationStatusLabel(status),
    nextAction: meta.nextAction,
    canSubmit: status === "draft" || status === "field_visit_scheduled",
    isSubmitted: status !== "draft",
    isVisible: meta.visibleToField,
  };
}

// ─── Document view model ──────────────────────────────────────────────────────

export type DocumentViewModel = {
  id: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "muted";
  rejectionReason: string;
  mediaRef: string;
  canReview: boolean;
};

export function documentToViewModel(doc: DshPartnerDocument): DocumentViewModel {
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.documentType;
  const statusLabels: Record<string, string> = {
    pending: "بانتظار المراجعة",
    under_review: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
  };
  const statusTones: Record<string, DocumentViewModel["statusTone"]> = {
    pending: "muted",
    under_review: "warning",
    approved: "success",
    rejected: "danger",
  };
  return {
    id: doc.id,
    typeLabel,
    statusLabel: statusLabels[doc.documentStatus] ?? doc.documentStatus,
    statusTone: statusTones[doc.documentStatus] ?? "muted",
    rejectionReason: doc.rejectionReason,
    mediaRef: doc.mediaRef,
    canReview: doc.documentStatus !== "approved",
  };
}

// ─── Readiness view model ─────────────────────────────────────────────────────

export type ReadinessViewModel = {
  canActivate: boolean;
  blockedReason: string;
  checklist: Array<{ label: string; satisfied: boolean; blockedReason: string }>;
};

export function readinessToViewModel(r: DshPartnerReadiness): ReadinessViewModel {
  return {
    canActivate: r.canActivate,
    blockedReason: r.blockedReason ?? "",
    checklist: r.checklist.map((item) => ({
      label: item.label,
      satisfied: item.satisfied,
      blockedReason: item.blockedReason ?? "",
    })),
  };
}
