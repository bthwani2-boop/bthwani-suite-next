// Canonical location: dsh/frontend/shared/delivery/delivery.contract.ts
// Generated DSH OpenAPI owns fulfillment-mode values. This module contains
// presentation metadata and temporary pure projections only; it must not own
// enablement, pricing, commissions, permissions, or lifecycle authority.

import type { components } from "../../../clients/generated/dsh-api";

export type DshFulfillmentDeliveryMode = NonNullable<
  components["schemas"]["DshOrder"]["fulfillmentMode"]
>;

/** Presentation-only metadata. Availability and allowed actions come from DSH runtime responses. */
export type DshDeliveryModeDefinition = {
  readonly modeId: DshFulfillmentDeliveryMode;
  readonly label: string;
  readonly icon: string;
};

export const DSH_DELIVERY_MODE_DEFINITIONS: ReadonlyArray<DshDeliveryModeDefinition> = [
  {
    modeId: "bthwani_delivery",
    label: "توصيل بثواني",
    icon: "bicycle-outline",
  },
  {
    modeId: "partner_delivery",
    label: "توصيل المتجر",
    icon: "storefront-outline",
  },
  {
    modeId: "pickup",
    label: "استلم بنفسك",
    icon: "bag-handle-outline",
  },
] as const;

export function getDshDeliveryModeDefinition(
  mode: DshFulfillmentDeliveryMode,
): DshDeliveryModeDefinition {
  const definition = DSH_DELIVERY_MODE_DEFINITIONS.find((candidate) => candidate.modeId === mode);
  if (!definition) {
    throw new Error(`unsupported DSH fulfillment mode: ${mode}`);
  }
  return definition;
}

export function isDshFulfillmentDeliveryMode(
  value: string | null | undefined,
): value is DshFulfillmentDeliveryMode {
  return value === "bthwani_delivery" || value === "partner_delivery" || value === "pickup";
}
