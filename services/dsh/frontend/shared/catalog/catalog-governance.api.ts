import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { StoreAssortment } from "./central-catalog.types";
import type {
  AssortmentPauseState,
  CatalogAttribute,
  CatalogAttributeDataType,
  CatalogAttributeOption,
  CatalogAuditEntry,
  CatalogGovernancePage,
  CatalogNodeAttributeRule,
  CatalogRollbackResult,
  MasterProductAttributeValue,
  MasterProductRelationship,
  MasterProductRelationshipType,
} from "./catalog-governance.types";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "catalog-governance-corr");

export interface CreateCatalogAttributeInput {
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly dataType: CatalogAttributeDataType;
  readonly isFilterable: boolean;
  readonly isRequired: boolean;
  readonly isVariantAxis: boolean;
  readonly isGlobal: boolean;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export async function fetchOperatorCatalogAttributes(): Promise<readonly CatalogAttribute[]> {
  const response = await request<{ readonly attributes: readonly CatalogAttribute[] }>(
    "/dsh/operator/catalog/attributes",
  );
  return response.attributes;
}

export async function createOperatorCatalogAttribute(
  input: CreateCatalogAttributeInput,
): Promise<CatalogAttribute> {
  const response = await request<{ readonly attribute: CatalogAttribute }>(
    "/dsh/operator/catalog/attributes",
    { method: "POST", body: input },
  );
  return response.attribute;
}

export async function fetchOperatorCatalogAttributeOptions(
  attributeId: string,
): Promise<readonly CatalogAttributeOption[]> {
  const response = await request<{ readonly options: readonly CatalogAttributeOption[] }>(
    `/dsh/operator/catalog/attributes/${encodeURIComponent(attributeId)}/options`,
  );
  return response.options;
}

export async function createOperatorCatalogAttributeOption(
  attributeId: string,
  input: {
    readonly code: string;
    readonly labelAr: string;
    readonly labelEn: string;
    readonly sortOrder: number;
    readonly isActive: boolean;
  },
): Promise<CatalogAttributeOption> {
  const response = await request<{ readonly option: CatalogAttributeOption }>(
    `/dsh/operator/catalog/attributes/${encodeURIComponent(attributeId)}/options`,
    { method: "POST", body: input },
  );
  return response.option;
}

export async function upsertOperatorCatalogNodeAttributeRule(
  nodeId: string,
  attributeId: string,
  input: {
    readonly isRequired: boolean;
    readonly isFilterable: boolean;
    readonly isVariantAxis: boolean;
    readonly sortOrder: number;
    readonly expectedVersion?: number;
  },
): Promise<CatalogNodeAttributeRule> {
  const response = await request<{ readonly rule: CatalogNodeAttributeRule }>(
    `/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}/attributes/${encodeURIComponent(attributeId)}`,
    { method: "PUT", body: input },
  );
  return response.rule;
}

export async function fetchOperatorMasterProductAttributeValues(
  productId: string,
): Promise<readonly MasterProductAttributeValue[]> {
  const response = await request<{ readonly values: readonly MasterProductAttributeValue[] }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}/attribute-values`,
  );
  return response.values;
}

export async function upsertOperatorMasterProductAttributeValue(
  productId: string,
  attributeId: string,
  input: {
    readonly value: unknown;
    readonly locale?: string | null;
    readonly expectedVersion?: number;
  },
): Promise<MasterProductAttributeValue> {
  const response = await request<{ readonly value: MasterProductAttributeValue }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}/attribute-values/${encodeURIComponent(attributeId)}`,
    { method: "PUT", body: input },
  );
  return response.value;
}

export async function fetchOperatorMasterProductRelationships(
  productId: string,
): Promise<readonly MasterProductRelationship[]> {
  const response = await request<{ readonly relationships: readonly MasterProductRelationship[] }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}/relationships`,
  );
  return response.relationships;
}

export async function upsertOperatorMasterProductRelationship(
  productId: string,
  input: {
    readonly targetMasterProductId: string;
    readonly relationshipType: MasterProductRelationshipType;
    readonly priority: number;
    readonly reason: string;
    readonly isActive: boolean;
    readonly expectedVersion?: number;
  },
): Promise<MasterProductRelationship> {
  const response = await request<{ readonly relationship: MasterProductRelationship }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}/relationships`,
    { method: "PUT", body: input },
  );
  return response.relationship;
}

export async function deleteOperatorMasterProductRelationship(
  productId: string,
  relationshipId: string,
  expectedVersion: number,
): Promise<void> {
  await request<void>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}/relationships/${encodeURIComponent(relationshipId)}?expectedVersion=${expectedVersion}`,
    { method: "DELETE" },
  );
}

export async function fetchOperatorAssortmentPauses(
  storeId: string,
): Promise<readonly AssortmentPauseState[]> {
  const response = await request<{ readonly pauses: readonly AssortmentPauseState[] }>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment-pauses`,
  );
  return response.pauses;
}

async function mutateAssortmentPause(
  path: string,
  input: Record<string, unknown>,
): Promise<{ readonly assortment: StoreAssortment; readonly pause: AssortmentPauseState }> {
  return request<{ readonly assortment: StoreAssortment; readonly pause: AssortmentPauseState }>(
    path,
    { method: "POST", body: input },
  );
}

export async function pauseOperatorStoreAssortment(
  storeId: string,
  productId: string,
  input: { readonly reason: string; readonly pausedUntil?: string | null; readonly expectedVersion: number },
) {
  return mutateAssortmentPause(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(productId)}/pause`,
    input,
  );
}

export async function resumeOperatorStoreAssortment(
  storeId: string,
  productId: string,
  expectedVersion: number,
) {
  return mutateAssortmentPause(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(productId)}/resume`,
    { expectedVersion },
  );
}

export async function fetchPartnerCatalogAttributes(): Promise<readonly CatalogAttribute[]> {
  const response = await request<{ readonly attributes: readonly CatalogAttribute[] }>(
    "/dsh/partner/catalog/attributes",
  );
  return response.attributes;
}

export async function fetchPartnerCatalogAttributeOptions(attributeId: string) {
  const response = await request<{ readonly options: readonly CatalogAttributeOption[] }>(
    `/dsh/partner/catalog/attributes/${encodeURIComponent(attributeId)}/options`,
  );
  return response.options;
}

export async function fetchPartnerMasterProductAttributeValues(productId: string) {
  const response = await request<{ readonly values: readonly MasterProductAttributeValue[] }>(
    `/dsh/partner/catalog/master-products/${encodeURIComponent(productId)}/attribute-values`,
  );
  return response.values;
}

export async function fetchPartnerMasterProductRelationships(productId: string) {
  const response = await request<{ readonly relationships: readonly MasterProductRelationship[] }>(
    `/dsh/partner/catalog/master-products/${encodeURIComponent(productId)}/relationships`,
  );
  return response.relationships;
}

export async function fetchPartnerAssortmentPauses(storeId: string) {
  const response = await request<{ readonly pauses: readonly AssortmentPauseState[] }>(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment-pauses`,
  );
  return response.pauses;
}

export async function pausePartnerStoreAssortment(
  storeId: string,
  productId: string,
  input: { readonly reason: string; readonly pausedUntil?: string | null; readonly expectedVersion: number },
) {
  return mutateAssortmentPause(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(productId)}/pause`,
    input,
  );
}

export async function resumePartnerStoreAssortment(
  storeId: string,
  productId: string,
  expectedVersion: number,
) {
  return mutateAssortmentPause(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(productId)}/resume`,
    { expectedVersion },
  );
}

export async function fetchFieldCatalogAttributes(): Promise<readonly CatalogAttribute[]> {
  const response = await request<{ readonly attributes: readonly CatalogAttribute[] }>(
    "/dsh/field/catalog/attributes",
  );
  return response.attributes;
}

export async function fetchFieldCatalogAttributeOptions(attributeId: string) {
  const response = await request<{ readonly options: readonly CatalogAttributeOption[] }>(
    `/dsh/field/catalog/attributes/${encodeURIComponent(attributeId)}/options`,
  );
  return response.options;
}

export async function fetchFieldMasterProductAttributeValues(productId: string) {
  const response = await request<{ readonly values: readonly MasterProductAttributeValue[] }>(
    `/dsh/field/catalog/master-products/${encodeURIComponent(productId)}/attribute-values`,
  );
  return response.values;
}

export async function fetchFieldMasterProductRelationships(productId: string) {
  const response = await request<{ readonly relationships: readonly MasterProductRelationship[] }>(
    `/dsh/field/catalog/master-products/${encodeURIComponent(productId)}/relationships`,
  );
  return response.relationships;
}

export async function fetchFieldAssortmentPauses(partnerId: string) {
  const response = await request<{ readonly pauses: readonly AssortmentPauseState[] }>(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/assortment-pauses`,
  );
  return response.pauses;
}

export async function pauseFieldStoreAssortment(
  partnerId: string,
  productId: string,
  input: { readonly reason: string; readonly pausedUntil?: string | null; readonly expectedVersion: number },
) {
  return mutateAssortmentPause(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/assortment/${encodeURIComponent(productId)}/pause`,
    input,
  );
}

export async function resumeFieldStoreAssortment(
  partnerId: string,
  productId: string,
  expectedVersion: number,
) {
  return mutateAssortmentPause(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/assortment/${encodeURIComponent(productId)}/resume`,
    { expectedVersion },
  );
}

export async function fetchOperatorCatalogAudit(query?: {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly action?: CatalogAuditEntry["action"];
  readonly limit?: number;
  readonly offset?: number;
}): Promise<CatalogGovernancePage<CatalogAuditEntry>> {
  const params = new URLSearchParams();
  if (query?.entityType) params.set("entityType", query.entityType);
  if (query?.entityId) params.set("entityId", query.entityId);
  if (query?.action) params.set("action", query.action);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const suffix = params.toString();
  const response = await request<{
    readonly audit: readonly CatalogAuditEntry[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  }>(suffix ? `/dsh/operator/catalog/audit?${suffix}` : "/dsh/operator/catalog/audit");
  return {
    items: response.audit,
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  };
}

export async function rollbackOperatorCatalogAudit(
  auditId: string,
  input: { readonly expectedVersion: number; readonly reason: string },
): Promise<CatalogRollbackResult> {
  const response = await request<{ readonly rollback: CatalogRollbackResult }>(
    `/dsh/operator/catalog/audit/${encodeURIComponent(auditId)}/rollback`,
    { method: "POST", body: input },
  );
  return response.rollback;
}
