// dsh-client-binding.contracts.ts — checkout client binding stubs
// Authority: dsh/frontend/shared/checkout
// Fulfillment delivery mode types for DSH partner/client surfaces.

export type DshFulfillmentDeliveryMode =
  | 'standard'
  | 'express'
  | 'scheduled'
  | 'pickup'
  | 'captain_direct';

export type DshFulfillmentDeliveryModeConfig = {
  readonly mode: DshFulfillmentDeliveryMode;
  readonly label: string;
  readonly estimatedMinutes: number;
  readonly commissionRate: number;
};

export const DSH_FULFILLMENT_DELIVERY_MODE_CONFIGS: Record<
  DshFulfillmentDeliveryMode,
  DshFulfillmentDeliveryModeConfig
> = {
  standard:       { mode: 'standard',       label: 'عادي',         estimatedMinutes: 45, commissionRate: 0.15 },
  express:        { mode: 'express',         label: 'سريع',         estimatedMinutes: 20, commissionRate: 0.18 },
  scheduled:      { mode: 'scheduled',       label: 'مجدول',        estimatedMinutes: 0,  commissionRate: 0.12 },
  pickup:         { mode: 'pickup',          label: 'استلام ذاتي',  estimatedMinutes: 0,  commissionRate: 0.05 },
  captain_direct: { mode: 'captain_direct',  label: 'توصيل مباشر', estimatedMinutes: 30, commissionRate: 0.20 },
};
