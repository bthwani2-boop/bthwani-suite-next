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

const baseUrl = resolveDshApiBaseUrl();
const httpClient = createDshHttpClient(baseUrl, "partner");

/**
 * OpenAPI Operation Binding Matrix — contracts/dsh.openapi.yaml
 * This file implements the manual shared API adapter. Each function maps directly to an OpenAPI operationId.
 *
 * | Function Name            | Method | Route                                                   | OpenAPI operationId          |
 * |--------------------------|--------|---------------------------------------------------------|------------------------------|
 * | fetchPartners            | GET    | /dsh/operator/partners                                  | listDshPartners              |
 * | createPartner            | POST   | /dsh/operator/partners                                  | createDshPartner             |
 * | fetchPartner             | GET    | /dsh/operator/partners/{partnerId}                      | getDshPartner                |
 * | transitionPartner        | POST   | /dsh/operator/partners/{partnerId}/transition           | transitionDshPartner         |
 * | fetchPartnerReadiness    | GET    | /dsh/operator/partners/{partnerId}/readiness            | getDshPartnerReadiness       |
 * | fetchPartnerDocuments    | GET    | /dsh/operator/partners/{partnerId}/documents            | listDshPartnerDocuments      |
 * | addPartnerDocument       | POST   | /dsh/operator/partners/{partnerId}/documents            | addDshPartnerDocument        |
 * | reviewPartnerDocument    | PATCH  | /dsh/operator/partners/{partnerId}/documents/{docId}/review | reviewDshPartnerDocument |
 * | fetchPartnerStores       | GET    | /dsh/operator/partners/{partnerId}/stores               | listDshPartnerStores         |
 * | linkPartnerStore         | POST   | /dsh/operator/partners/{partnerId}/stores               | linkDshPartnerStore          |
 * | fetchPartnerAuditEvents  | GET    | /dsh/operator/partners/{partnerId}/audit                | listDshPartnerAuditEvents    |
 * | fetchListFieldVisits     | GET    | /dsh/operator/partners/{partnerId}/field-visits         | listDshPartnerFieldVisits    |
 * | fetchPartnerSelfStatus   | GET    | /dsh/partner/activation/status                          | getDshPartnerActivationStatus |
 * | fetchPartnerSelfReadiness | GET   | /dsh/partner/activation/readiness                       | getDshPartnerSelfReadiness   |
 * | fieldListDrafts          | GET    | /dsh/field/partners                                     | listFieldPartnerDrafts       |
 * | fieldCreateDraft         | POST   | /dsh/field/partners/drafts                              | createFieldPartnerDraft      |
 * | fieldGetPartner          | GET    | /dsh/field/partners/{partnerId}                         | getFieldPartnerDraft         |
 * | fieldUpdatePartner       | PATCH  | /dsh/field/partners/{partnerId}                         | updateFieldPartnerDraft      |
 * | fieldGetReadiness        | GET    | /dsh/field/partners/{partnerId}/readiness               | getFieldPartnerReadiness     |
 * | fieldGetPartnerStore     | GET    | /dsh/field/partners/{partnerId}/store                   | getFieldPartnerStore         |
 * | fieldUpdatePartnerStore  | PATCH  | /dsh/field/partners/{partnerId}/store                   | updateFieldPartnerStore      |
 * | fieldUploadDocument      | POST   | /dsh/field/partners/{partnerId}/documents               | uploadFieldPartnerDocument   |
 * | fieldListDocuments       | GET    | /dsh/field/partners/{partnerId}/documents               | listFieldPartnerDocuments    |
 * | fieldCreateVisit         | POST   | /dsh/field/partners/{partnerId}/visits                  | createFieldPartnerVisit      |
 * | fieldListFieldVisits     | GET    | /dsh/field/partners/{partnerId}/field-visits            | listFieldPartnerFieldVisits  |
 * | fieldSubmitPartner       | POST   | /dsh/field/partners/{partnerId}/submit                  | submitFieldPartnerDraft      |
 *
 * api_client_policy: manual shared adapter (Option B).
 * - All functions live in the DSH shared brain only; screens must never fetch directly
 *   (policy: surface code must never call fetch/axios directly; use shared adapters only).
 * - Every function is bound to one OpenAPI operationId above; any drift between this
 *   table and contracts/dsh.openapi.yaml is a defect.
 * - Reason the generated facade is not used yet: the generated openapi-typescript client
 *   (clients/generated/dsh-api.ts) exposes types only — no runnable request facade is
 *   generated for these operations, so this isolated adapter carries transport until a
 *   generated request facade is stabilized. No business logic lives here.
 */
function request<T>(path: string, options: { readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; readonly body?: unknown } = {}): Promise<T> {
  return httpClient.request<T>(path, options);
}

// ── Operator: partner CRUD ────────────────────────────────────────────────────

export function fetchPartners(params: { status?: string; limit?: number; offset?: number } = {}): Promise<DshPartnerListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return request(`/dsh/operator/partners${qs ? `?${qs}` : ""}`);
}

export function fetchPartner(partnerId: string): Promise<DshPartner> {
  return request(`/dsh/operator/partners/${partnerId}`);
}

export function createPartner(input: DshCreatePartnerInput): Promise<DshPartner> {
  return request("/dsh/operator/partners", { method: "POST", body: input });
}

export function transitionPartner(partnerId: string, input: DshPartnerTransitionInput, version?: number): Promise<{ partner: DshPartner; event: DshPartnerAuditEvent }> {
  const qs = version !== undefined ? `?version=${version}` : "";
  return request(`/dsh/operator/partners/${partnerId}/transition${qs}`, { method: "POST", body: input });
}

export function fetchPartnerReadiness(partnerId: string): Promise<DshPartnerReadiness> {
  return request(`/dsh/operator/partners/${partnerId}/readiness`);
}

export function fetchPartnerDocuments(partnerId: string): Promise<{ documents: DshPartnerDocument[] }> {
  return request(`/dsh/operator/partners/${partnerId}/documents`);
}

export function addPartnerDocument(partnerId: string, input: DshAddDocumentInput): Promise<DshPartnerDocument> {
  return request(`/dsh/operator/partners/${partnerId}/documents`, { method: "POST", body: input });
}

export function reviewPartnerDocument(partnerId: string, docId: string, input: DshReviewDocumentInput): Promise<{ document: DshPartnerDocument; review: unknown }> {
  return request(`/dsh/operator/partners/${partnerId}/documents/${docId}/review`, { method: "PATCH", body: input });
}

export function fetchPartnerStores(partnerId: string): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`);
}

export function linkPartnerStore(partnerId: string, storeId: string): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`, { method: "POST", body: { storeId } });
}

export function fetchPartnerAuditEvents(partnerId: string): Promise<{ events: DshPartnerAuditEvent[] }> {
  return request(`/dsh/operator/partners/${partnerId}/audit`);
}

// ── Partner self-view ─────────────────────────────────────────────────────────

export function fetchPartnerSelfStatus(): Promise<DshPartner> {
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

export function invitePartnerTeamMember(storeId: string, identity: string): Promise<{ success: boolean }> {
  return request(`/dsh/partner/stores/${storeId}/team/invites`, { method: "POST", body: { identity } });
}

export function executePartnerTeamMemberAction(storeId: string, memberId: string, actionLabel: string): Promise<{ success: boolean }> {
  return request(`/dsh/partner/stores/${storeId}/team/members/${memberId}/action`, { method: "POST", body: { actionLabel } });
}

export function fetchPartnerStoreCourierSettings(storeId: string): Promise<DshPartnerStoreCourierSettings> {
  return request(`/dsh/partner/stores/${storeId}/courier-settings`);
}

export function updatePartnerStoreCourierSettings(storeId: string, settings: DshPartnerStoreCourierSettings): Promise<DshPartnerStoreCourierSettings> {
  return request(`/dsh/partner/stores/${storeId}/courier-settings`, { method: "PUT", body: settings });
}

export function fetchPartnerStoreCoverageZones(storeId: string): Promise<DshPartnerCoverageZone[]> {
  return request(`/dsh/partner/stores/${storeId}/coverage-zones`);
}

export function fetchPartnerStoreSettings(storeId: string): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`);
}

export function updatePartnerStoreSettings(storeId: string, settings: unknown): Promise<unknown> {
  return request(`/dsh/partner/stores/${storeId}/settings`, { method: "PATCH", body: settings });
}

// ── Field intake ──────────────────────────────────────────────────────────────

export function fieldListDrafts(params: { status?: string; limit?: number; offset?: number } = {}): Promise<DshPartnerListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return request(`/dsh/field/partners${qs ? `?${qs}` : ""}`);
}

export function fieldCreateDraft(input: DshCreatePartnerInput): Promise<DshPartner> {
  return request("/dsh/field/partners/drafts", { method: "POST", body: input });
}

// ── Partner: analytics ────────────────────────────────────────────────────

export function fetchPartnerPerformance(period: 'today' | 'week' | 'month' = 'today'): Promise<import('./partner.types').DshPartnerPerformanceResponse> {
  return request(`/dsh/partner/analytics/performance?period=${period}`);
}

export function fieldUpdatePartner(partnerId: string, input: DshUpdatePartnerRequest, version: number): Promise<DshPartner> {
  return request(`/dsh/field/partners/${partnerId}?version=${version}`, { method: "PATCH", body: input });
}

export function fieldGetPartner(partnerId: string): Promise<DshPartner> {
  return request(`/dsh/field/partners/${partnerId}`);
}

export function fieldUploadDocument(partnerId: string, input: DshAddDocumentInput): Promise<DshPartnerDocument> {
  return request(`/dsh/field/partners/${partnerId}/documents`, { method: "POST", body: input });
}

export function fieldCreateVisit(partnerId: string, input: DshCreatePartnerFieldVisitRequest): Promise<DshPartnerFieldVisit> {
  return request(`/dsh/field/partners/${partnerId}/visits`, { method: "POST", body: input });
}

export function fieldSubmitPartner(partnerId: string): Promise<{ partner: DshPartner; event: DshPartnerAuditEvent }> {
  return request(`/dsh/field/partners/${partnerId}/submit`, { method: "POST", body: { reason: "تأكيد من الميداني" } });
}

export function fetchPartnerFieldVisits(partnerId: string): Promise<{ visits: DshPartnerFieldVisit[] }> {
  return request(`/dsh/operator/partners/${partnerId}/field-visits`);
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

// ── Field: first-store draft ────────────────────────────────────────────────
export function fieldGetPartnerStore(partnerId: string): Promise<{ storeId: string; store: DshFieldPartnerStoreDraft }> {
  return request(`/dsh/field/partners/${partnerId}/store`);
}

export function fieldUpdatePartnerStore(
  partnerId: string,
  input: DshFieldPartnerStoreDraftInput
): Promise<{ storeId: string; store: DshFieldPartnerStoreDraft; audit: unknown }> {
  return request(`/dsh/field/partners/${partnerId}/store`, { method: "PATCH", body: input });
}
