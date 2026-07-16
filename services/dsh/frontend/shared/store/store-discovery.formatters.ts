import type { DshFulfillmentDeliveryMode } from "../delivery/delivery.contract";

export function formatServiceArea(
  cityLabel: string,
  serviceAreaLabel: string,
): string {
  return `${serviceAreaLabel} • ${cityLabel}`;
}

export type DshDeliveryMode = "delivery" | "express" | "pickup";

const DELIVERY_MODE_LABELS: Record<DshDeliveryMode, string> = {
  delivery: "توصيل المتجر (الشريك)",
  express: "توصيل بثواني (المنصة)",
  pickup: "استلم بنفسك",
};

export function formatDeliveryMode(mode: DshDeliveryMode): string {
  return DELIVERY_MODE_LABELS[mode];
}

export function formatDeliveryModes(
  modes: readonly DshDeliveryMode[],
  emptyLabel = "لا توجد طرق خدمة مفعلة",
): string {
  return modes.map(formatDeliveryMode).join("، ") || emptyLabel;
}

// Store publication uses a legacy "delivery | express | pickup" vocabulary
// (DshStoreDeliveryMode in the OpenAPI contract) that predates the DSH
// checkout/order fulfillment-mode contract. This is the single authoritative
// mapping between the two — every surface deriving checkout fulfillment
// availability from a store's enabled delivery modes must go through this,
// never re-guess the mapping from formatted labels.
const DELIVERY_MODE_TO_FULFILLMENT_MODE: Record<DshDeliveryMode, DshFulfillmentDeliveryMode> = {
  delivery: "partner_delivery",
  express: "bthwani_delivery",
  pickup: "pickup",
};

export function toFulfillmentMode(mode: DshDeliveryMode): DshFulfillmentDeliveryMode {
  return DELIVERY_MODE_TO_FULFILLMENT_MODE[mode];
}

export function toFulfillmentModes(
  modes: readonly DshDeliveryMode[],
): readonly DshFulfillmentDeliveryMode[] {
  return modes.map(toFulfillmentMode);
}
