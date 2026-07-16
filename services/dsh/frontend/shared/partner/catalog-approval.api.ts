// Real HTTP client for the DSH catalog approval queue
// (POST/GET /dsh/catalog-approvals, GET /dsh/partner/catalog-approvals,
// POST /dsh/catalog-approvals/{id}/transition).
// Replaces the previous in-memory mock in partner.workflow.ts.
import { getIdentityAccessToken } from '@bthwani/core-identity';
import { PlatformVarsRegistry } from '../platform/platform-vars';
import { createDshFlexibleHttpClient } from '../_kernel/dsh-http-request';
import type {
  ApprovalEntityType,
  ApprovalRecord,
  ApprovalRecordMetadata,
  ApprovalSourceSurface,
  ApprovalStage,
  PartnerQueueRecord,
} from './partner.types';

function resolveBaseUrl(): string | null {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

// Goes through the shared kernel HTTP client (approved adapter transport).
// An unreachable/misconfigured API still surfaces as null/empty rather than
// fabricated data — callers render honest empty states.
async function request<T>(path: string, options?: { method?: 'POST'; body?: unknown }): Promise<T | null> {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return null;
  const isBffMode = baseUrl.startsWith('/');
  const token = isBffMode ? undefined : getIdentityAccessToken();
  const { request: send } = createDshFlexibleHttpClient(baseUrl);
  try {
    return await send<T>(path, {
      ...(options?.method ? { method: options.method } : {}),
      ...(options?.body !== undefined ? { body: options.body } : {}),
      ...(token ? { token } : {}),
    });
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

async function createCatalogApproval(
  input: CreateCatalogApprovalInput,
): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>('/dsh/catalog-approvals', {
    method: 'POST',
    body: input,
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

async function getCatalogApproval(id: string): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}`,
  );
  return body?.record ?? null;
}

async function transitionCatalogApproval(
  id: string,
  toStage: ApprovalStage,
  actionLabel: string,
): Promise<ApprovalRecord | null> {
  const body = await request<{ record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}/transition`,
    { method: 'POST', body: { toStage, actionLabel } },
  );
  return body?.record ?? null;
}
