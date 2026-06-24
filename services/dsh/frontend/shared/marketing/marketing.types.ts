export type DshCampaign = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshBanner = {
  readonly id: string;
  readonly title: string;
  readonly imageUrl: string;
  readonly actionUrl: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPromo = {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshMarketingState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly T[] }
  | { readonly kind: "error"; readonly message: string };
