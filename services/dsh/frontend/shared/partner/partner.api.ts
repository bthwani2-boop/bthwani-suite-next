import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshPartner,
  DshPartnerSummary,
  DshPartnerDocument,
  DshPartnerFieldVisit,
  DshPartnerReadiness,
  DshPartnerAuditEvent,
  DshPartnerLinkedStore,
  DshFieldPartnerStoreDraft,
  DshFieldPartnerStoreDraftInput,
  DshCreatePartnerInput,
  DshUpdatePartnerRequest,
  DshPartnerTransitionInput,
  DshAddDocumentInput,
  DshReviewDocumentInput,
  DshCreatePartnerFieldVisitRequest,
  DshPartnerListResponse,
  DshPartnerOperationalScope,
  DshPartnerTeamMember,
  DshPartnerStoreCourierSettings,
  DshPartnerCoverageZone,
} from "./partner.types";
import { createPartnerMutationContext, type DshGovernedPartner, type PartnerMutationContext } from "./partner-onboarding.runtime";

const baseUrl = resolveDshApiBaseUrl();
const httpClient = createDshHttpClient(baseUrl, "partner");

type PartnerRequestOptions = {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly mutation?: PartnerMutationContext;
};

/**
 * JRN-001 uses the approved manual shared adapter until a runnable generated
 * request facade is available. Screens must never call fetch/axios directly.
 * Mutation identity and optimistic concurrency are translated here once.
 */
function request<T>(path: string, options: PartnerRequestOptions = {}): Promise<T> {
  const mutation = options.method && options.method !== "GET"
    ? {
        ...createPartnerMutationContext(options.method.toLowerCase(), path, options.mutation?.expectedVersion),
        ...options.mutation,
      }
    : options.mutation;
  return httpClient.request<T>(path, {
    ...(options.method !== undefined ? { method: options.method } : {}),
    ...(options.body !== undefined ? { body: options.body } : {}),
    ...(mutation?.idempotencyKey !== undefined ? { idempotencyKey: mutation.idempotencyKey } : {}),
    ...(mutation?.correlationId !== undefined ? { correlationId: mutation.correlationId } : {}),
    ...(mutation?.expectedVersion !== undefined ? { expectedVersion: mutation.expectedVersion } : {}),
  });
}

// ── Operator: partner lifecycle ─────────────────────────────────────────────

export function fetchPartners(params: { status?: string; limit?: number; offset?: number } = {}): Promise<DshPartnerListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return request(`/dsh/operator/partners${qs ? `?${qs}` : ""}`);
}

export function fetchPartner(partnerId: string): Promise<DshGovernedPartner> {
  return request(`/dsh/operator/partners/${partnerId}`);
}

export function createPartner(input: DshCreatePartnerInput, mutation?: PartnerMutationContext): Promise<DshPartner> {
  return request("/dsh/operator/partners", { method: "POST", body: input, mutation });
}

export function transitionPartner(
  partnerId: string,
  input: DshPartnerTransitionInput,
  version: number,
  mutation?: PartnerMutationContext,
): Promise<{ partner: DshGovernedPartner; event: DshPartnerAuditEvent }> {
  return request(`/dsh/operator/partners/${partnerId}/transition`, {
    method: "POST",
    body: input,
    mutation: { ...mutation, expectedVersion: version } as PartnerMutationContext,
  });
}

export function fetchPartnerReadiness(partnerId: string): Promise<DshPartnerReadiness> {
  return request(`/dsh/operator/partners/${partnerId}/readiness`);
}

export function fetchPartnerDocuments(partnerId: string): Promise<{ documents: DshPartnerDocument[] }> {
  return request(`/dsh/operator/partners/${partnerId}/documents`);
}

export function addPartnerDocument(
  partnerId: string,
  input: DshAddDocumentInput,
  mutation?: PartnerMutationContext,
): Promise<DshPartnerDocument> {
  return request(`/dsh/operator/partners/${partnerId}/documents`, { method: "POST", body: input, mutation });
}

export function reviewPartnerDocument(
  partnerId: string,
  docId: string,
  input: DshReviewDocumentInput,
  mutation?: PartnerMutationContext,
): Promise<{ document: DshPartnerDocument; review: unknown }> {
  return request(`/dsh/operator/partners/${partnerId}/documents/${docId}/review`, {
    method: "PATCH",
    body: input,
    mutation,
  });
}

export function fetchPartnerStores(partnerId: string): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`);
}

export function linkPartnerStore(
  partnerId: string,
  storeId: string,
  mutation?: PartnerMutationContext,
): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`, {
    method: "POST",
    body: { storeId },
    mutation,
  });
}

export function fetchPartnerAuditEvents(partnerId: string): Promise<{ events: DshPartnerAuditEvent[] }> {
  return request(`/dsh/operator/partners/${partnerId}/audit`);
}

export function fetchPartnerFieldVisits(partnerId: string): Promise<{ visits: DshPartnerFieldVisit[] }> {
  return request(`/dsh/operator/partners/${partnerId}/field-visits`);
}

// ── Partner self-view ───────────────────────────────────────────────────────

export function fetchPartnerSelfStatus(): Promise<DshGovernedPartner> {
  return request("/dsh/partner/activation/status");
}

export function fetchPartnerSelfReadiness(): Promise<DshPartnerReadiness> {
  return request("/dsh/partner/activation/readiness");
}

export function fetchPartnerScopes(): Promise<{ scopes: DshPartnerOperationalScope[] }> {
  return request("/dsh/partner/scopes");
}

export function fetchPartnerTeam(storeId: string): Promise<{ members: DshPartnerTeamMember[] }> {
  return request(`/dsh/partner/stores/${storeId}/team`);
}

export function invitePartnerTeamMember(
  storeId: string,
  identity: string,
  mutation?: PartnerMutationContext,
): Promise<{ success: boolean }> {
  return request(`/dsh/partner/stores/${storeId}/team/invites`, {
    method: "POST",
    body: { identity },
    mutation,
  });
}

export function executePartnerTeamMemberAction(
  storeId: string,
  memberId: string,
  action: string,
  mutation?: PartnerMutationContext,
): Promise<{ success: boolean }> {
  return request(`/dsh/partner/stores/${storeId}/team/members/${memberId}/action`, {
    method: "POST",
    body: { action },
    mutation,
  });
}

export function fetchPartnerStoreCourierSettings(storeId: string): Promise<DshPartnerStoreCourierSettings> {
  return request(`/dsh/partner/stores/${storeId}/courier-settings`);
}

export function updatePartnerStoreCourierSettings(
  storeId: string,
  settings: DshPartnerStoreCourierSettings,
  mutation?: PartnerMutationContext,
): Promise<DshPartnerStoreCourierSettings> {
  return request(`/dsh/partner/stores/${storeId}/courier-settings`, {
    method: "PUT",
    body: settings,
    mutation,
  });
}

export function fetchPartnerStoreCoverageZones(storeId: string): Promise<DshPartnerCoverageZone[]> {
  return request(`/dsh/partner/stores/${storeId}/coverage-zones`);
}

export function fetchPartnerStoreSettings(storeId: string): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`);
}

export function updatePartnerStoreSettings(
  storeId: string,
  settings: unknown,
  mutation?: PartnerMutationContext,
): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`, { method: "PATCH", body: settings, mutation });
}

// ── Field intake ────────────────────────────────────────────────────────────

export function fieldListDrafts(params: { status?: string; limit?: number; offset?: number } = {}): Promise<DshPartnerListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return request(`/dsh/field/partners${qs ? `?${qs}` : ""}`);
}

export function fieldCreateDraft(input: DshCreatePartnerInput, mutation?: PartnerMutationContext): Promise<DshPartner> {
  return request("/dsh/field/partners/drafts", { method: "POST", body: input, mutation });
}

export function fieldGetPartner(partnerId: string): Promise<DshGovernedPartner> {
  return request(`/dsh/field/partners/${partnerId}`);
}

export function fieldUpdatePartner(
  partnerId: string,
  input: DshUpdatePartnerRequest,
  version: number,
  mutation?: PartnerMutationContext,
): Promise<DshGovernedPartner> {
  return request(`/dsh/field/partners/${partnerId}`, {
    method: "PATCH",
    body: input,
    mutation: { ...mutation, expectedVersion: version } as PartnerMutationContext,
  });
}

export function fieldUploadDocument(
  partnerId: string,
  input: DshAddDocumentInput,
  mutation?: PartnerMutationContext,
): Promise<DshPartnerDocument> {
  return request(`/dsh/field/partners/${partnerId}/documents`, { method: "POST", body: input, mutation });
}

export function fieldCreateVisit(
  partnerId: string,
  input: DshCreatePartnerFieldVisitRequest,
  mutation?: PartnerMutationContext,
): Promise<DshPartnerFieldVisit> {
  return request(`/dsh/field/partners/${partnerId}/visits`, { method: "POST", body: input, mutation });
}

export function fieldSubmitPartner(
  partnerId: string,
  mutation?: PartnerMutationContext,
): Promise<{ partner: DshGovernedPartner; event: DshPartnerAuditEvent }> {
  return request(`/dsh/field/partners/${partnerId}/submit`, {
    method: "POST",
    body: { reason: "تأكيد من الميداني" },
    mutation,
  });
}

export function fieldGetReadiness(partnerId: string): Promise<DshPartnerReadiness> {
  return request(`/dsh/field/partners/${partnerId}/readiness`);
}

export function fieldListDocuments(partnerId: string): Promise<{ documents: DshPartnerDocument[] }> {
  return request(`/dsh/field/partners/${partnerId}/documents`);
}

export function fieldListFieldVisits(partnerId: string): Promise<{ visits: DshPartnerFieldVisit[] }> {
  return request(`/dsh/field/partners/${partnerId}/field-visits`);
}

export function fieldGetPartnerStore(partnerId: string): Promise<{ storeId: string; store: DshFieldPartnerStoreDraft }> {
  return request(`/dsh/field/partners/${partnerId}/store`);
}

export function fieldUpdatePartnerStore(
  partnerId: string,
  input: DshFieldPartnerStoreDraftInput,
  mutation?: PartnerMutationContext,
): Promise<{ storeId: string; store: DshFieldPartnerStoreDraft; audit: unknown }> {
  return request(`/dsh/field/partners/${partnerId}/store`, { method: "PATCH", body: input, mutation });
}

// ── Partner analytics (outside JRN-001 mutation scope) ─────────────────────

export function fetchPartnerPerformance(period: "today" | "week" | "month" = "today"): Promise<import("./partner.types").DshPartnerPerformanceResponse> {
  return request(`/dsh/partner/analytics/performance?period=${period}`);
}
