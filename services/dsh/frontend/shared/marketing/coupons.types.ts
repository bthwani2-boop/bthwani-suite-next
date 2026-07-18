export type CouponStatus = "draft" | "active" | "paused" | "archived";
export type CouponDiscountType = "percent" | "fixed";
export type CouponFulfillmentMode = "bthwani_delivery" | "partner_delivery" | "pickup";

export type CouponRecord = {
  readonly id: string;
  readonly nameAr: string;
  readonly description: string;
  readonly codeLast4: string;
  readonly storeId?: string;
  readonly discountType: CouponDiscountType;
  readonly discountPercent: number;
  readonly fixedDiscountMinorUnits: number;
  readonly maxDiscountMinorUnits: number;
  readonly minSubtotalMinorUnits: number;
  readonly globalUsageLimit: number;
  readonly perClientUsageLimit: number;
  readonly eligibleFulfillmentModes: readonly CouponFulfillmentMode[];
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly status: CouponStatus;
  readonly createdByActorId: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CouponCreatePayload = {
  readonly nameAr: string;
  readonly description?: string;
  /** Returned once by the server; the backend stores only a digest and last four. */
  readonly code: string;
  readonly storeId?: string;
  readonly discountType: CouponDiscountType;
  readonly discountPercent?: number;
  readonly fixedDiscountMinorUnits?: number;
  readonly maxDiscountMinorUnits?: number;
  readonly minSubtotalMinorUnits?: number;
  readonly globalUsageLimit?: number;
  readonly perClientUsageLimit?: number;
  readonly eligibleFulfillmentModes?: readonly CouponFulfillmentMode[];
  readonly startsAt?: string;
  readonly endsAt?: string;
};

export type CouponUpdatePayload = Omit<Partial<CouponCreatePayload>, "code"> & {
  readonly status?: CouponStatus;
  readonly expectedVersion: number;
};

export type IssuedCoupon = {
  readonly coupon: CouponRecord;
  readonly code: string;
};
