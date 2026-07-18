"use client";

import { useCallback, useEffect, useState } from "react";
import { createCoupon, fetchCoupons, updateCoupon } from "./marketing.api";
import type {
  CouponCreatePayload,
  CouponRecord,
  CouponStatus,
  CouponUpdatePayload,
  IssuedCoupon,
} from "./coupons.types";

export type CouponsControllerState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly coupons: readonly CouponRecord[] }
  | { readonly kind: "error"; readonly message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "تعذر تنفيذ عملية الكوبون.";
}

export function useCouponsController(authKind: string) {
  const [state, setState] = useState<CouponsControllerState>({ kind: "loading" });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [issuedCoupon, setIssuedCoupon] = useState<IssuedCoupon | null>(null);
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ kind: "error", message: "يلزم تسجيل الدخول بصلاحية التسويق." });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetchCoupons();
      setState(response.coupons.length
        ? { kind: "success", coupons: response.coupons }
        : { kind: "empty" });
      return true;
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
      return false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (payload: CouponCreatePayload) => {
    setMutationLoading(true);
    setMutationError(null);
    setIssuedCoupon(null);
    try {
      const response = await createCoupon(payload);
      setIssuedCoupon(response.issued);
      await load();
      return true;
    } catch (error) {
      setMutationError(errorMessage(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [load]);

  const update = useCallback(async (coupon: CouponRecord, payload: Omit<CouponUpdatePayload, "expectedVersion">) => {
    setMutationLoading(true);
    setMutationError(null);
    try {
      await updateCoupon(coupon.id, { ...payload, expectedVersion: coupon.version });
      await load();
      return true;
    } catch (error) {
      setMutationError(errorMessage(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [load]);

  const setStatus = useCallback(async (coupon: CouponRecord, status: CouponStatus) => {
    return update(coupon, { status });
  }, [update]);

  return {
    state,
    mutationError,
    mutationLoading,
    issuedCoupon,
    clearIssuedCoupon: () => setIssuedCoupon(null),
    reload: load,
    create,
    update,
    setStatus,
  };
}
