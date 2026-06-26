// DSH partner API client — typed against the Go backend.
// No fetch directly in surfaces. All calls go through shared controllers.
import { resolveDshApiBaseUrl } from "../frontend/shared/_kernel/dsh-api-base-url";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DshPartnerActivationStatus =
  | "draft"
  | "submitted"
  | "field_visit_scheduled"
  | "field_visit_completed"
  | "documents_missing"
  | "documents_uploaded"
  | "documents_verified"
  | "catalog_not_ready"
  | "catalog_ready"
  | "delivery_modes_not_ready"
  | "delivery_modes_ready"
  | "ops_review"
  | "ops_approved"
  | "ops_rejected"
  | "partner_active"
  | "partner_deactivated"
  | "client_visible"
  | "client_hidden";

export type DshPartner = {
  id: string;
  legalNameAr: string;
  legalNameEn: string;
  displayName: string;
  legalIdentityType: string;
  legalIdentityNumber: string;
  ownerName: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  category: string;
  activationStatus: DshPartnerActivationStatus;
  createdByActorId: string;
  createdBySurface: string;
  notes: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DshPartnerSummary = {
  id: string;
  displayName: string;
  legalNameAr: string;
  category: string;
  activationStatus: DshPartnerActivationStatus;
  primaryPhone: string;
  createdAt: string;
  updatedAt: string;
};

export type DshPartnerDocument = {
  id: string;
  partnerId: string;
  documentType: string;
  documentStatus: "pending" | "under_review" | "approved" | "rejected";
  uploadedByActorId: string;
  mediaRef: string;
  notes: string;
  rejectionReason: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DshPartnerFieldVisit = {
  id: string;
  partnerId: string;
  storeId: string;
  fieldActorId: string;
  visitStatus: "draft" | "in_progress" | "submitted" | "escalated";
  visitNotes: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  evidenceMediaRefs: string[];
  version: number;
  createdAt: string;
  submittedAt: string | null;
};

export type DshPartnerActivationEvent = {
  id: string;
  partnerId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  actorSurface: string;
  reason: string;
  correlationId: string;
  createdAt: string;
};

export type DshPartnerReadinessItem = {
  id: string;
  label: string;
  satisfied: boolean;
  blockedReason?: string;
};

export type DshPartnerReadiness = {
  partnerId: string;
  canActivate: boolean;
  blockedReason?: string;
  checklist: DshPartnerReadinessItem[];
};

export type DshPartnerListResponse = {
  partners: DshPartnerSummary[];
  pagination: { total: number; limit: number; offset: number };
};

export type DshPartnerApiError = {
  kind: "not_found" | "conflict" | "invalid_transition" | "forbidden" | "validation_error" | "network_error" | "unknown";
  message: string;
  rawStatus?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return resolveDshApiBaseUrl();
}

async function apiRequest<T>(
  url: string,
  options: RequestInit,
  token?: string,
): Promise<{ ok: true; data: T } | { ok: false; error: DshPartnerApiError }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let code = "UNKNOWN";
      try {
        const body = (await res.json()) as { code?: string; message?: string };
        code = body.code ?? code;
        const kind = resolveErrorKind(res.status, code);
        return { ok: false, error: { kind, message: body.message ?? res.statusText, rawStatus: res.status } };
      } catch {
        return { ok: false, error: { kind: "unknown", message: res.statusText, rawStatus: res.status } };
      }
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: { kind: "network_error", message: String(err) } };
  }
}

function resolveErrorKind(status: number, code: string): DshPartnerApiError["kind"] {
  if (status === 404 || code === "NOT_FOUND") return "not_found";
  if (status === 409 || code === "CONFLICT" || code === "VERSION_CONFLICT") return "conflict";
  if (status === 422 || code === "INVALID_TRANSITION") return "invalid_transition";
  if (status === 403 || code === "FORBIDDEN") return "forbidden";
  if (status === 400 || code === "VALIDATION_ERROR") return "validation_error";
  return "unknown";
}

// ─── Partner CRUD ─────────────────────────────────────────────────────────────

export async function fetchCreatePartner(input: {
  legalNameAr: string;
  displayName: string;
  primaryPhone: string;
  legalIdentityType: string;
  legalIdentityNumber: string;
  legalNameEn?: string;
  ownerName?: string;
  secondaryPhone?: string;
  email?: string;
  category?: string;
  notes?: string;
}, token: string) {
  return apiRequest<DshPartner>(`${baseUrl()}/dsh/field/partners/drafts`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function fetchPartner(partnerId: string, token: string) {
  return apiRequest<DshPartner>(`${baseUrl()}/dsh/partners/${partnerId}`, {
    method: "GET",
  }, token);
}

export async function fetchListPartners(params: {
  status?: DshPartnerActivationStatus;
  limit?: number;
  offset?: number;
}, token: string) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return apiRequest<DshPartnerListResponse>(`${baseUrl()}/dsh/partners?${qs}`, {
    method: "GET",
  }, token);
}

export async function fetchUpdatePartner(partnerId: string, input: {
  displayName?: string;
  ownerName?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  notes?: string;
}, token: string) {
  return apiRequest<DshPartner>(`${baseUrl()}/dsh/partners/${partnerId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, token);
}

export async function fetchPartnerReadiness(partnerId: string, token: string) {
  return apiRequest<DshPartnerReadiness>(`${baseUrl()}/dsh/partners/${partnerId}/readiness`, {
    method: "GET",
  }, token);
}

// ─── Activation transition ────────────────────────────────────────────────────

export async function fetchActivationTransition(partnerId: string, input: {
  toStatus: DshPartnerActivationStatus;
  reason?: string;
}, token: string) {
  return apiRequest<{ partner: DshPartner; event: DshPartnerActivationEvent }>(
    `${baseUrl()}/dsh/partners/${partnerId}/activation-transitions`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function fetchListDocuments(partnerId: string, token: string) {
  return apiRequest<{ documents: DshPartnerDocument[] }>(
    `${baseUrl()}/dsh/partners/${partnerId}/documents`,
    { method: "GET" },
    token,
  );
}

export async function fetchUploadDocument(partnerId: string, input: {
  documentType: string;
  mediaRef: string;
  notes?: string;
}, token: string) {
  return apiRequest<DshPartnerDocument>(
    `${baseUrl()}/dsh/field/partners/${partnerId}/documents`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export async function fetchReviewDocument(partnerId: string, documentId: string, input: {
  decision: "approved" | "rejected" | "needs_resubmit";
  reason?: string;
}, token: string) {
  return apiRequest<{ document: DshPartnerDocument; review: unknown }>(
    `${baseUrl()}/dsh/partners/${partnerId}/documents/${documentId}/review`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

// ─── Field visits ─────────────────────────────────────────────────────────────

export async function fetchCreateFieldVisit(partnerId: string, input: {
  storeId?: string;
  visitNotes?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  evidenceMediaRefs?: string[];
}, token: string) {
  return apiRequest<DshPartnerFieldVisit>(
    `${baseUrl()}/dsh/field/partners/${partnerId}/visits`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export async function fetchListFieldVisits(partnerId: string, token: string) {
  return apiRequest<{ visits: DshPartnerFieldVisit[] }>(
    `${baseUrl()}/dsh/partners/${partnerId}/field-visits`,
    { method: "GET" },
    token,
  );
}

// ─── Field submit ─────────────────────────────────────────────────────────────

export async function fetchSubmitPartner(partnerId: string, token: string) {
  return apiRequest<{ partner: DshPartner; event: DshPartnerActivationEvent }>(
    `${baseUrl()}/dsh/field/partners/${partnerId}/submit`,
    { method: "POST", body: JSON.stringify({ reason: "تأكيد من الميداني" }) },
    token,
  );
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function fetchPartnerAudit(partnerId: string, token: string) {
  return apiRequest<{ events: DshPartnerActivationEvent[] }>(
    `${baseUrl()}/dsh/partners/${partnerId}/audit`,
    { method: "GET" },
    token,
  );
}

// ─── Partner self ─────────────────────────────────────────────────────────────

export async function fetchPartnerMe(token: string) {
  return apiRequest<Pick<DshPartner, "id" | "displayName" | "legalNameAr" | "category" | "activationStatus" | "primaryPhone" | "email" | "createdAt" | "updatedAt">>(
    `${baseUrl()}/dsh/partner/me`,
    { method: "GET" },
    token,
  );
}

export async function fetchPartnerMeReadiness(token: string) {
  return apiRequest<DshPartnerReadiness>(
    `${baseUrl()}/dsh/partner/me/readiness`,
    { method: "GET" },
    token,
  );
}
