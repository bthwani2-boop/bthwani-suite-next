// Real HTTP client for the DSH catalog approval queue.
import { getIdentityAccessToken } from '@bthwani/core-identity';
import { PlatformVarsRegistry } from '../platform/platform-vars';
import { createDshFlexibleHttpClient } from '../_kernel/dsh-http-request';
import type {
  ApprovalEntityType,
  ApprovalRecordMetadata,
  ApprovalSourceSurface,
  ApprovalStage,
} from './partner.types';

export type CatalogApprovalAuditEntry = {
  readonly at: string;
  readonly fromStage: ApprovalStage;
  readonly toStage: ApprovalStage;
  readonly owner: string;
  readonly actionLabel: string;
};

export type CatalogApprovalRecord = {
  readonly id: string;
  readonly entityType: ApprovalEntityType;
  readonly entityId?: string;
  readonly source: ApprovalSourceSurface;
  readonly stage: ApprovalStage;
  readonly title: string;
  readonly submittedAt: string;
  readonly updatedAt?: string;
  readonly metadata?: ApprovalRecordMetadata;
  readonly auditTrail?: readonly CatalogApprovalAuditEntry[];
};

export type PartnerCatalogApprovalQueueRecord = {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: ApprovalEntityType;
  readonly stage: ApprovalStage;
  readonly owner: ApprovalSourceSurface;
  readonly createdAt: string;
};

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
  readonly title: string;
  readonly metadata?: ApprovalRecordMetadata;
};

export async function createCatalogApproval(input: CreateCatalogApprovalInput): Promise<CatalogApprovalRecord> {
  const body = await request<{ readonly record: CatalogApprovalRecord }>('/dsh/catalog-approvals', {
    method: 'POST',
    body: input,
  });
  return body.record;
}

export async function listCatalogApprovals(filters?: {
  readonly entityType?: ApprovalEntityType;
  readonly stage?: ApprovalStage;
  readonly source?: ApprovalSourceSurface;
}): Promise<CatalogApprovalRecord[]> {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.source) params.set('source', filters.source);
  const qs = params.toString();
  const body = await request<{ readonly records: CatalogApprovalRecord[] }>(
    `/dsh/catalog-approvals${qs ? `?${qs}` : ''}`,
  );
  return body.records ?? [];
}

export async function listPartnerCatalogQueue(): Promise<PartnerCatalogApprovalQueueRecord[]> {
  const body = await request<{ readonly records: PartnerCatalogApprovalQueueRecord[] }>(
    '/dsh/partner/catalog-approvals',
  );
  return body.records ?? [];
}

export async function getCatalogApproval(id: string): Promise<CatalogApprovalRecord> {
  const body = await request<{ readonly record: CatalogApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}`,
  );
  return body.record;
}

export async function transitionCatalogApproval(
  id: string,
  toStage: ApprovalStage,
  actionLabel: string,
): Promise<CatalogApprovalRecord> {
  const body = await request<{ readonly record: CatalogApprovalRecord }>(
    `/dsh/catalog-approvals/${encodeURIComponent(id)}/transition`,
    { method: 'POST', body: { toStage, actionLabel } },
  );
  return body.record;
}
