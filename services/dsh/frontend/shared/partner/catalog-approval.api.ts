// Real HTTP client for the DSH catalog approval queue
// (POST/GET /dsh/catalog-approvals, GET /dsh/partner/catalog-approvals,
// POST /dsh/catalog-approvals/{id}/transition).
// Replaces the previous in-memory mock in partner.workflow.ts.
import { PlatformVarsRegistry } from '../platform/platform-vars';
import type {
  ApprovalEntityType,
  ApprovalRecord,
  ApprovalRecordMetadata,
  ApprovalSourceSurface,
  ApprovalStage,
  PartnerQueueRecord,
} from './partner.workflow';

function resolveBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

function authHeaders(): Record<string, string> {
  const token = PlatformVarsRegistry.get('dshAuthBearerToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(new URL(path, baseUrl).toString(), {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type CreateCatalogApprovalInput = {
  entityType: ApprovalEntityType;
  entityId?: string;
  source?: ApprovalSourceSurface;
  stage?: ApprovalStage;
  title: string;
  metadata?: ApprovalRecordMetadata;
};

export async function createCatalogApproval(
  input: CreateCatalogApprovalInput,
): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>('/dsh/catalog-approvals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body?.record ?? null;
}

export async function listCatalogApprovals(filters?: {
  entityType?: ApprovalEntityType;
  stage?: ApprovalStage;
  source?: ApprovalSourceSurface;
}): Promise<ApprovalRecord[]> {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.source) params.set('source', filters.source);
  const qs = params.toString();
  const body = await request<{ records: ApprovalRecord[] }>(
    `/dsh/catalog-approvals${qs ? `?${qs}` : ''}`,
  );
  return body?.records ?? [];
}

export async function listPartnerCatalogQueue(): Promise<PartnerQueueRecord[]> {
  const body = await request<{ records: PartnerQueueRecord[] }>('/dsh/partner/catalog-approvals');
  return body?.records ?? [];
}

export async function getCatalogApproval(id: string): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}`,
  );
  return body?.record ?? null;
}

export async function transitionCatalogApproval(
  id: string,
  toStage: ApprovalStage,
  actionLabel: string,
): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}/transition`,
    { method: 'POST', body: JSON.stringify({ toStage, actionLabel }) },
  );
  return body?.record ?? null;
}
