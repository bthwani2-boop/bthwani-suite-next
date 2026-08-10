// Canonical location: dsh/frontend/shared/delivery/delivery.contract.ts
// Generated DSH OpenAPI owns fulfillment-mode values. This module contains
// presentation metadata and temporary pure projections only; it must not own
// enablement, pricing, commissions, permissions, or lifecycle authority.

import type { components } from "../../../clients/generated/dsh-api";

export type ActiveOrderPhase = "pickup" | "delivery";

export type StoreCourierStage =
  | "ready_for_pickup"
  | "picked_up"
  | "out_for_delivery"
  | "delivery_failed"
  | "delivered";

export type DshFulfillmentDeliveryMode = NonNullable<
  components["schemas"]["DshOrder"]["fulfillmentMode"]
>;

export type DshDeliveryModeTrackingStageFilter = {
  readonly showCaptainStages: boolean;
  readonly showPickupStoreInstructions: boolean;
  readonly showPartnerCourierStatus: boolean;
  readonly showDeliveryDropoffAddress: boolean;
};

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

/**
 * Temporary pure projection for consumers not yet migrated to server-provided
 * allowed actions. It must never be used as a permission or enablement check.
 */
export function isDshModeDispatchRequired(mode: DshFulfillmentDeliveryMode): boolean {
  return mode === "bthwani_delivery";
}

/**
 * Presentation-only timeline projection. Backend order state and allowedActions
 * remain authoritative for transitions and mutations.
 */
export function getDshModeTrackingStageFilter(
  mode: DshFulfillmentDeliveryMode,
): DshDeliveryModeTrackingStageFilter {
  return {
    showCaptainStages: mode === "bthwani_delivery",
    showPickupStoreInstructions: mode === "pickup",
    showPartnerCourierStatus: mode === "partner_delivery",
    showDeliveryDropoffAddress: mode !== "pickup",
  };
}

export function isDshFulfillmentDeliveryMode(
  value: string | null | undefined,
): value is DshFulfillmentDeliveryMode {
  return value === "bthwani_delivery" || value === "partner_delivery" || value === "pickup";
}
