import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const client = createDshHttpClient(resolveDshApiBaseUrl(), "delivery-pricing");

export type DeliveryPricingMode = "bthwani_delivery" | "partner_delivery" | "pickup";
export type DeliveryPricingStatus = "active" | "paused" | "archived";

export type DeliveryPricingRecord = {
  readonly storeId: string;
  readonly fulfillmentMode: DeliveryPricingMode;
  readonly feeMinorUnits: number;
  readonly currency: string;
  readonly status: DeliveryPricingStatus;
  readonly pricingSource: "control_panel" | "partner_store" | "platform_default" | "migration_legacy";
  readonly createdByActorId: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DeliveryPricingMutation = {
  readonly feeMinorUnits: number;
  readonly currency: "YER";
  readonly status: DeliveryPricingStatus;
  readonly expectedVersion: number;
  readonly reason: string;
};

export function listPartnerDeliveryPricing(storeId: string): Promise<{ pricing: DeliveryPricingRecord[] }> {
  return client.request(`/dsh/partner/stores/${storeId}/delivery-pricing`);
}

export function updatePartnerDeliveryPricing(
  storeId: string,
  input: DeliveryPricingMutation,
): Promise<{ pricing: DeliveryPricingRecord }> {
  const fulfillmentMode: DeliveryPricingMode = "partner_delivery";
  return client.request(`/dsh/partner/stores/${storeId}/delivery-pricing/${fulfillmentMode}`, {
    method: "PUT",
    body: input,
  });
}

export function listOperatorDeliveryPricing(storeId: string): Promise<{ pricing: DeliveryPricingRecord[] }> {
  return client.request(`/dsh/operator/stores/${storeId}/delivery-pricing`);
}

export function updateOperatorDeliveryPricing(
  storeId: string,
  fulfillmentMode: DeliveryPricingMode,
  input: DeliveryPricingMutation,
): Promise<{ pricing: DeliveryPricingRecord }> {
  return client.request(`/dsh/operator/stores/${storeId}/delivery-pricing/${fulfillmentMode}`, {
    method: "PUT",
    body: input,
  });
}
