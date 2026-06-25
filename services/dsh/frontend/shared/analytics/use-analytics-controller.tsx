import { useCallback, useEffect, useState } from "react";
import {
  fetchPlatformKpis,
  fetchOrderAnalytics,
  fetchDeliveryAnalytics,
  fetchSupportAnalytics,
  fetchStoreAnalytics,
  fetchPartnerPerformance,
} from "./analytics.api";
import {
  platformKpisIdle, platformKpisLoading, platformKpisSuccess, platformKpisError,
  orderAnalyticsIdle, orderAnalyticsLoading, orderAnalyticsSuccess, orderAnalyticsError,
  deliveryAnalyticsIdle, deliveryAnalyticsLoading, deliveryAnalyticsSuccess, deliveryAnalyticsError,
  supportAnalyticsIdle, supportAnalyticsLoading, supportAnalyticsSuccess, supportAnalyticsError,
  storeAnalyticsIdle, storeAnalyticsLoading, storeAnalyticsSuccess, storeAnalyticsError,
  partnerPerfIdle, partnerPerfLoading, partnerPerfSuccess, partnerPerfError,
} from "./analytics.states";
import type { DshAnalyticsPeriod } from "./analytics.types";

function isAuthenticated(authKind: string) {
  return authKind === "authenticated";
}

function resolveMessage(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال بالإنترنت";
  if (e?.status === 401) return "الجلسة منتهية، يرجى إعادة تسجيل الدخول";
  return "تعذّر تحميل البيانات، يرجى المحاولة مجدداً";
}

export function useOperatorAnalyticsDashboardController(authKind = "unauthenticated", period: DshAnalyticsPeriod = "today") {
  const [platformState, setPlatformState] = useState(platformKpisIdle());
  const [orderState, setOrderState] = useState(orderAnalyticsIdle());
  const [deliveryState, setDeliveryState] = useState(deliveryAnalyticsIdle());
  const [supportState, setSupportState] = useState(supportAnalyticsIdle());
  const [storeState, setStoreState] = useState(storeAnalyticsIdle());

  const load = useCallback(async (p: DshAnalyticsPeriod) => {
    setPlatformState(platformKpisLoading());
    setOrderState(orderAnalyticsLoading());
    setDeliveryState(deliveryAnalyticsLoading());
    setSupportState(supportAnalyticsLoading());
    setStoreState(storeAnalyticsLoading());

    const [platform, orders, delivery, support, stores] = await Promise.allSettled([
      fetchPlatformKpis(p),
      fetchOrderAnalytics(p),
      fetchDeliveryAnalytics(p),
      fetchSupportAnalytics(p),
      fetchStoreAnalytics(),
    ]);

    setPlatformState(platform.status === "fulfilled" ? platformKpisSuccess(platform.value) : platformKpisError(resolveMessage(platform.reason)));
    setOrderState(orders.status === "fulfilled" ? orderAnalyticsSuccess(orders.value) : orderAnalyticsError(resolveMessage(orders.reason)));
    setDeliveryState(delivery.status === "fulfilled" ? deliveryAnalyticsSuccess(delivery.value) : deliveryAnalyticsError(resolveMessage(delivery.reason)));
    setSupportState(support.status === "fulfilled" ? supportAnalyticsSuccess(support.value) : supportAnalyticsError(resolveMessage(support.reason)));
    setStoreState(stores.status === "fulfilled" ? storeAnalyticsSuccess(stores.value) : storeAnalyticsError(resolveMessage(stores.reason)));
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load(period);
  }, [authKind, period, load]);

  const reload = useCallback(() => void load(period), [load, period]);

  return { platformState, orderState, deliveryState, supportState, storeState, reload };
}

export function usePartnerPerformanceController(authKind = "unauthenticated", period: DshAnalyticsPeriod = "today") {
  const [state, setState] = useState(partnerPerfIdle());

  const load = useCallback(async (p: DshAnalyticsPeriod) => {
    setState(partnerPerfLoading());
    try {
      const data = await fetchPartnerPerformance(p);
      setState(partnerPerfSuccess(data));
    } catch (err) {
      setState(partnerPerfError(resolveMessage(err)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load(period);
  }, [authKind, period, load]);

  const reload = useCallback(() => void load(period), [load, period]);

  return { state, reload };
}
