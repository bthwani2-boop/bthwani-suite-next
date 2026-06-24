export type DshZone = {
  readonly id: string;
  readonly name: string;
  readonly cityCode: string;
  readonly isActive: boolean;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshSlaRule = {
  readonly id: string;
  readonly zoneId: string;
  readonly category: string;
  readonly maxPrepMins: number;
  readonly maxDeliveryMins: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshCapacityConfig = {
  readonly id: string;
  readonly zoneId: string;
  readonly maxConcurrentOrders: number;
  readonly maxCaptainsOnline: number;
  readonly throttleThreshold: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshZoneServiceability = {
  readonly zoneId: string;
  readonly isActive: boolean;
  readonly activeStores: number;
  readonly slaAvailable: boolean;
};

export type DshPlatformState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };
