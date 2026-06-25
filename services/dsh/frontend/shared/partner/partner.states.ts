import type { DshPartner, DshPartnerDocument, DshPartnerReadiness, DshPartnerAuditEvent, DshPartnerStore } from "./partner.types";

// ── List state ────────────────────────────────────────────────────────────────

export type DshPartnerListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partners: DshPartner[]; readonly total: number; readonly page: number }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "offline" };

// ── Detail state ──────────────────────────────────────────────────────────────

export type DshPartnerDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partner: DshPartner }
  | { readonly kind: "not_found" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly message: string };

// ── Mutation state ────────────────────────────────────────────────────────────

export type DshPartnerMutationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly partner: DshPartner }
  | { readonly kind: "invalid_transition"; readonly message: string }
  | { readonly kind: "version_conflict" }
  | { readonly kind: "error"; readonly message: string };

// ── Documents state ───────────────────────────────────────────────────────────

export type DshPartnerDocumentsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly documents: DshPartnerDocument[]; readonly total: number }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

// ── Readiness state ───────────────────────────────────────────────────────────

export type DshPartnerReadinessState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly readiness: DshPartnerReadiness }
  | { readonly kind: "error"; readonly message: string };

// ── Audit state ───────────────────────────────────────────────────────────────

export type DshPartnerAuditState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly events: DshPartnerAuditEvent[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

// ── Stores state ──────────────────────────────────────────────────────────────

export type DshPartnerStoresState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly stores: DshPartnerStore[]; readonly total: number }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };
