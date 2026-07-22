// Real HTTP client for the DSH catalog approval queue.
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

type RequestOptions = { readonly method?: 'POST'; readonly body?: unknown };

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) throw new Error('DSH API base URL is not configured');
  const isBffMode = baseUrl.startsWith('/');
  const token = isBffMode ? undefined : getIdentityAccessToken();
  const { request: send } = createDshFlexibleHttpClient(baseUrl);
  return send<T>(path, {
    ...(options?.method ? { method: options.method } : {}),
    ...(options?.body !== undefined ? { body: options.body } : {}),
    ...(token ? { token } : {}),
  });
}

export type CreateCatalogApprovalInput = {
  readonly entityType: ApprovalEntityType;
  readonly entityId?: string;
  readonly source?: ApprovalSourceSurface;
  readonly stage?: ApprovalStage;
  readonly title: string;
  readonly metadata?: ApprovalRecordMetadata;
};

export async function createCatalogApproval(input: CreateCatalogApprovalInput): Promise<ApprovalRecord> {
  const body = await request<{ readonly record: ApprovalRecord }>('/dsh/catalog-approvals', {
    method: 'POST',
    body: input,
  });
  return body.record;
}

export async function listCatalogApprovals(filters?: {
  readonly entityType?: ApprovalEntityType;
  readonly stage?: ApprovalStage;
  readonly source?: ApprovalSourceSurface;
}): Promise<ApprovalRecord[]> {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.source) params.set('source', filters.source);
  const qs = params.toString();
  const body = await request<{ readonly records: ApprovalRecord[] }>(
    `/dsh/catalog-approvals${qs ? `?${qs}` : ''}`,
  );
  return body.records ?? [];
}

export async function listPartnerCatalogQueue(): Promise<PartnerQueueRecord[]> {
  const body = await request<{ readonly records: PartnerQueueRecord[] }>('/dsh/partner/catalog-approvals');
  return body.records ?? [];
}

export async function getCatalogApproval(id: string): Promise<ApprovalRecord> {
  const body = await request<{ readonly record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}`,
  );
  return body.record;
}

export async function transitionCatalogApproval(
  id: string,
  toStage: ApprovalStage,
  actionLabel: string,
): Promise<ApprovalRecord> {
  const body = await request<{ readonly record: ApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}/transition`,
    { method: 'POST', body: { toStage, actionLabel } },
  );
  return body.record;
}
