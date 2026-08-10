import type { GovernedProblem } from "../_kernel/governed-problem";

/** Error state shared by the partner controllers: message for display, problem for the governed reason code, allowed next action, retry semantics, and support reference. */
export type DshPartnerErrorState = { readonly kind: "error"; readonly message: string; readonly problem: GovernedProblem };

import type { DshPartner, DshPartnerSummary, DshPartnerDocument, DshPartnerReadiness, DshPartnerAuditEvent, DshPartnerLinkedStore, DshPartnerFieldVisit } from "./partner.types";

// ── List state ────────────────────────────────────────────────────────────────

export type DshPartnerListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partners: DshPartnerSummary[]; readonly total: number; readonly page: number }
  | { readonly kind: "empty" }
  | DshPartnerErrorState
  | { readonly kind: "offline" };

// ── Detail state ──────────────────────────────────────────────────────────────

export type DshPartnerDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partner: DshPartner }
  | { readonly kind: "not_found" }
  | { readonly kind: "forbidden" }
  | DshPartnerErrorState;

// ── Mutation state ────────────────────────────────────────────────────────────

export type DshPartnerMutationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partner: DshPartner }
  | { readonly kind: "invalid_transition"; readonly message: string }
  | { readonly kind: "version_conflict" }
  | DshPartnerErrorState;

// ── Documents state ───────────────────────────────────────────────────────────

export type DshPartnerDocumentsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly documents: DshPartnerDocument[]; readonly total: number }
  | { readonly kind: "empty" }
  | DshPartnerErrorState;

// ── Readiness state ───────────────────────────────────────────────────────────

export type DshPartnerReadinessState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly readiness: DshPartnerReadiness }
  | DshPartnerErrorState;

// ── Audit state ───────────────────────────────────────────────────────────────

export type DshPartnerAuditState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly events: DshPartnerAuditEvent[] }
  | { readonly kind: "empty" }
  | DshPartnerErrorState;

// ── Stores state ──────────────────────────────────────────────────────────────

export type DshPartnerStoresState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly stores: DshPartnerLinkedStore[]; readonly total: number }
  | { readonly kind: "empty" }
  | DshPartnerErrorState;

// ── Field visits state ────────────────────────────────────────────────────────

export type DshPartnerVisitsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly visits: DshPartnerFieldVisit[] }
  | { readonly kind: "empty" }
  | DshPartnerErrorState;
