import type { DshPartner, DshPartnerSummary, DshPartnerDocument, DshPartnerReadiness, DshPartnerActivationStatus } from "./partner.types";
import {
  fetchListPartners,
  fetchPartner,
  fetchActivationTransition,
  fetchListDocuments,
  fetchReviewDocument,
  fetchPartnerReadiness,
  fetchPartnerAudit,
  fetchListFieldVisits,
} from "../../../clients/partner-client";
import type { DshPartnerActivationEvent, DshPartnerFieldVisit, DshPartnerListResponse } from "./partner.types";

// ─── State shapes ─────────────────────────────────────────────────────────────

export type PartnerListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: DshPartnerListResponse }
  | { kind: "error"; message: string };

export type PartnerDetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; partner: DshPartner; documents: DshPartnerDocument[]; visits: DshPartnerFieldVisit[]; audit: DshPartnerActivationEvent[] }
  | { kind: "error"; message: string };

export type PartnerActionState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; partner: DshPartner }
  | { kind: "error"; message: string };

export type PartnerDocumentActionState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export type PartnerReadinessState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; readiness: DshPartnerReadiness }
  | { kind: "error"; message: string };

// ─── Core functions (not hooks — hooks wrap these) ────────────────────────────

export async function loadPartnerList(
  params: { status?: DshPartnerActivationStatus; limit?: number; offset?: number },
  token: string,
): Promise<PartnerListState> {
  const result = await fetchListPartners(params, token);
  if (result.ok) {
    return { kind: "success", data: result.data };
  }
  return { kind: "error", message: result.error.message };
}

export async function loadPartnerDetail(
  partnerId: string,
  token: string,
): Promise<PartnerDetailState> {
  const [partnerRes, docsRes, visitsRes, auditRes] = await Promise.all([
    fetchPartner(partnerId, token),
    fetchListDocuments(partnerId, token),
    fetchListFieldVisits(partnerId, token),
    fetchPartnerAudit(partnerId, token),
  ]);

  if (!partnerRes.ok) {
    return { kind: "error", message: partnerRes.error.message };
  }

  return {
    kind: "success",
    partner: partnerRes.data,
    documents: docsRes.ok ? docsRes.data.documents : [],
    visits: visitsRes.ok ? visitsRes.data.visits : [],
    audit: auditRes.ok ? auditRes.data.events : [],
  };
}

export async function performTransition(
  partnerId: string,
  toStatus: DshPartnerActivationStatus,
  reason: string,
  token: string,
): Promise<PartnerActionState> {
  const result = await fetchActivationTransition(partnerId, { toStatus, reason }, token);
  if (result.ok) {
    return { kind: "success", partner: result.data.partner };
  }
  const errMsg =
    result.error.kind === "invalid_transition"
      ? "الانتقال غير مسموح به من الحالة الحالية"
      : result.error.kind === "conflict"
      ? "الشريك عُدِّل من مكان آخر — حدِّث الصفحة وأعد المحاولة"
      : result.error.message;
  return { kind: "error", message: errMsg };
}

export async function performDocumentReview(
  partnerId: string,
  documentId: string,
  decision: "approved" | "rejected" | "needs_resubmit",
  reason: string,
  token: string,
): Promise<PartnerDocumentActionState> {
  const result = await fetchReviewDocument(partnerId, documentId, { decision, reason }, token);
  if (result.ok) {
    return { kind: "success" };
  }
  return { kind: "error", message: result.error.message };
}

export async function loadReadiness(
  partnerId: string,
  token: string,
): Promise<PartnerReadinessState> {
  const result = await fetchPartnerReadiness(partnerId, token);
  if (result.ok) {
    return { kind: "success", readiness: result.data };
  }
  return { kind: "error", message: result.error.message };
}
