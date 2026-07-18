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

export type DshClientMapState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };
