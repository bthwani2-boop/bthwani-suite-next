export type DshVerifiedMapLocation = {
  readonly providerCode: string;
  readonly providerPlaceId: string;
  readonly displayName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly countryCode?: string;
  readonly administrativeArea?: string;
  readonly locality?: string;
  readonly postalCode?: string;
  readonly confidence?: number;
  readonly serviceAreaCode?: string;
  readonly serviceAreaName?: string;
  readonly serviceAreaVersion?: number;
  readonly serviceAreaVerified: boolean;
};

export type DshMapSearchInput = {
  readonly query: string;
  readonly limit?: number;
  readonly language?: string;
  readonly countryCodes?: readonly string[];
};

export type DshMapReverseInput = {
  readonly latitude: number;
  readonly longitude: number;
  readonly language?: string;
};

export type DshMapProviderHealthItem = {
  readonly kind: "map" | "maps";
  readonly status: string;
  readonly checkedAt: string;
  readonly message?: string;
};

export type DshMapProviderHealth = {
  readonly configured: boolean;
  readonly status: "healthy" | "degraded" | "unknown" | "not_configured";
  readonly checkedAt: string;
  readonly providers: readonly DshMapProviderHealthItem[];
};

export type DshMapProviderHealthState =
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshMapProviderHealth }
  | { readonly kind: "error"; readonly message: string };

export type DshServiceAreaBounds = {
  readonly minLongitude: number;
  readonly minLatitude: number;
  readonly maxLongitude: number;
  readonly maxLatitude: number;
};

export type DshServiceArea = {
  readonly serviceAreaCode: string;
  readonly displayName: string;
  readonly polygon: readonly (readonly [number, number])[];
  readonly pointCount: number;
  readonly bounds: DshServiceAreaBounds;
  readonly active: boolean;
  readonly priority: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshServiceAreaUpsertInput = {
  readonly displayName: string;
  readonly polygon: readonly (readonly [number, number])[];
  readonly active: boolean;
  readonly priority: number;
  readonly expectedVersion: number;
  readonly reason: string;
};

export type DshClientMapState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshServiceAreaState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: readonly DshServiceArea[] }
  | { readonly kind: "error"; readonly message: string };
