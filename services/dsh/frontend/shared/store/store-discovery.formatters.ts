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
