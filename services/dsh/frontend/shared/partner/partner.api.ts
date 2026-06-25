import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  DshPartner,
  DshPartnerDocument,
  DshPartnerReadiness,
  DshPartnerAuditEvent,
  DshPartnerStore,
  DshCreatePartnerInput,
  DshPartnerTransitionInput,
  DshAddDocumentInput,
  DshReviewDocumentInput,
} from "./partner.types";

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = { readonly method?: string; readonly body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  return response.json() as Promise<T>;
}

// ── Operator: partner CRUD ────────────────────────────────────────────────────

export function fetchPartners(params: { status?: string; category?: string; limit?: number; offset?: number } = {}): Promise<{ partners: DshPartner[]; total: number }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.category) q.set("category", params.category);
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

export function transitionPartner(partnerId: string, input: DshPartnerTransitionInput): Promise<DshPartner> {
  return request(`/dsh/operator/partners/${partnerId}/transition`, { method: "POST", body: input });
}

export function fetchPartnerReadiness(partnerId: string): Promise<DshPartnerReadiness> {
  return request(`/dsh/operator/partners/${partnerId}/readiness`);
}

export function fetchPartnerDocuments(partnerId: string): Promise<{ documents: DshPartnerDocument[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/documents`);
}

export function addPartnerDocument(partnerId: string, input: DshAddDocumentInput): Promise<DshPartnerDocument> {
  return request(`/dsh/operator/partners/${partnerId}/documents`, { method: "POST", body: input });
}

export function reviewPartnerDocument(partnerId: string, docId: string, input: DshReviewDocumentInput): Promise<DshPartnerDocument> {
  return request(`/dsh/operator/partners/${partnerId}/documents/${docId}/review`, { method: "PATCH", body: input });
}

export function fetchPartnerStores(partnerId: string): Promise<{ stores: DshPartnerStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`);
}

export function linkPartnerStore(partnerId: string, storeId: string): Promise<{ stores: DshPartnerStore[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/stores`, { method: "POST", body: { storeId } });
}

export function fetchPartnerAuditEvents(partnerId: string): Promise<{ events: DshPartnerAuditEvent[]; total: number }> {
  return request(`/dsh/operator/partners/${partnerId}/audit`);
}

// ── Partner self-view ─────────────────────────────────────────────────────────

export function fetchPartnerSelfStatus(): Promise<DshPartner> {
  return request("/dsh/partner/activation/status");
}

export function fetchPartnerSelfReadiness(): Promise<DshPartnerReadiness> {
  return request("/dsh/partner/activation/readiness");
}

// ── Field intake ──────────────────────────────────────────────────────────────

export function submitFieldPartnerIntake(input: DshCreatePartnerInput): Promise<DshPartner> {
  return request("/dsh/field/partner-intake", { method: "POST", body: input });
}
