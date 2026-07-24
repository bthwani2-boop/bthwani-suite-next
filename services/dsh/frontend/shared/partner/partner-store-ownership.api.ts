import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { DshPartnerLinkedStore } from "./partner.types";
import { fetchPartnerStores } from "./partner.api";

const ownershipClient = createDshHttpClient(resolveDshApiBaseUrl(), "partner-store-ownership");

export type GovernedPartnerStoreLinkInput = Readonly<{
  storeId: string;
  reason?: string;
  expectedStoreVersion?: number;
}>;

export function fetchGovernedPartnerStores(
  partnerId: string,
): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  return fetchPartnerStores(partnerId);
}

export function linkOrTransferPartnerStore(
  partnerId: string,
  input: GovernedPartnerStoreLinkInput,
): Promise<{ stores: DshPartnerLinkedStore[]; total: number }> {
  const storeId = input.storeId.trim();
  if (!storeId) {
    return Promise.reject({
      kind: "invalid_request",
      code: "STORE_ID_REQUIRED",
      message: "storeId is required",
    });
  }
  const expectedStoreVersion = input.expectedStoreVersion;
  if (expectedStoreVersion !== undefined && (!Number.isInteger(expectedStoreVersion) || expectedStoreVersion < 1)) {
    return Promise.reject({
      kind: "invalid_request",
      code: "INVALID_STORE_VERSION",
      message: "expectedStoreVersion must be a positive integer",
    });
  }

  const correlationId = `partner-store.${partnerId}.${storeId}.${Date.now().toString(36)}`;
  return ownershipClient.request(`/dsh/operator/partners/${encodeURIComponent(partnerId)}/stores`, {
    method: "POST",
    body: {
      storeId,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
      ...(expectedStoreVersion !== undefined ? { expectedStoreVersion } : {}),
    },
    correlationId,
    idempotencyKey: correlationId,
  });
}
