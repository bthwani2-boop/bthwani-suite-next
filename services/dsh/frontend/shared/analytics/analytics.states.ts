import type {
  DshPlatformKpis,
  DshOrderAnalytics,
  DshDeliveryAnalytics,
  DshSupportAnalytics,
  DshStoreAnalytics,
  DshPartnerPerformance,
} from "./analytics.types";

export type DshPlatformKpisState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly kpis: DshPlatformKpis }
  | { readonly kind: "error"; readonly message: string };

export type DshOrderAnalyticsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshOrderAnalytics }
  | { readonly kind: "error"; readonly message: string };

export type DshDeliveryAnalyticsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshDeliveryAnalytics }
  | { readonly kind: "error"; readonly message: string };

export type DshSupportAnalyticsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshSupportAnalytics }
  | { readonly kind: "error"; readonly message: string };

export type DshStoreAnalyticsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshStoreAnalytics }
  | { readonly kind: "error"; readonly message: string };

export type DshPartnerPerformanceState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: DshPartnerPerformance }
  | { readonly kind: "error"; readonly message: string };

export const platformKpisIdle = (): DshPlatformKpisState => ({ kind: "idle" });
export const platformKpisLoading = (): DshPlatformKpisState => ({ kind: "loading" });
export const platformKpisSuccess = (kpis: DshPlatformKpis): DshPlatformKpisState => ({ kind: "success", kpis });
export const platformKpisError = (message: string): DshPlatformKpisState => ({ kind: "error", message });

export const orderAnalyticsIdle = (): DshOrderAnalyticsState => ({ kind: "idle" });
export const orderAnalyticsLoading = (): DshOrderAnalyticsState => ({ kind: "loading" });
export const orderAnalyticsSuccess = (data: DshOrderAnalytics): DshOrderAnalyticsState => ({ kind: "success", data });
export const orderAnalyticsError = (message: string): DshOrderAnalyticsState => ({ kind: "error", message });

export const deliveryAnalyticsIdle = (): DshDeliveryAnalyticsState => ({ kind: "idle" });
export const deliveryAnalyticsLoading = (): DshDeliveryAnalyticsState => ({ kind: "loading" });
export const deliveryAnalyticsSuccess = (data: DshDeliveryAnalytics): DshDeliveryAnalyticsState => ({ kind: "success", data });
export const deliveryAnalyticsError = (message: string): DshDeliveryAnalyticsState => ({ kind: "error", message });

export const supportAnalyticsIdle = (): DshSupportAnalyticsState => ({ kind: "idle" });
export const supportAnalyticsLoading = (): DshSupportAnalyticsState => ({ kind: "loading" });
export const supportAnalyticsSuccess = (data: DshSupportAnalytics): DshSupportAnalyticsState => ({ kind: "success", data });
export const supportAnalyticsError = (message: string): DshSupportAnalyticsState => ({ kind: "error", message });

export const storeAnalyticsIdle = (): DshStoreAnalyticsState => ({ kind: "idle" });
export const storeAnalyticsLoading = (): DshStoreAnalyticsState => ({ kind: "loading" });
export const storeAnalyticsSuccess = (data: DshStoreAnalytics): DshStoreAnalyticsState => ({ kind: "success", data });
export const storeAnalyticsError = (message: string): DshStoreAnalyticsState => ({ kind: "error", message });

export const partnerPerfIdle = (): DshPartnerPerformanceState => ({ kind: "idle" });
export const partnerPerfLoading = (): DshPartnerPerformanceState => ({ kind: "loading" });
export const partnerPerfSuccess = (data: DshPartnerPerformance): DshPartnerPerformanceState => ({ kind: "success", data });
export const partnerPerfError = (message: string): DshPartnerPerformanceState => ({ kind: "error", message });
