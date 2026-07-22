// Public capability entrypoint for governed coupons and funding readback.
export type {
  CouponStatus,
  CouponDiscountType,
  CouponFulfillmentMode,
  CouponFundingSource,
  CouponFundingPolicy,
  CouponFundingReconciliationStatus,
  CouponFundingLifecycleRecord,
  CouponRecord,
  CouponCreatePayload,
  CouponUpdatePayload,
  IssuedCoupon,
  CouponListResponse,
} from "./coupons.types";

export { useCouponsController } from "./use-coupons-controller";
