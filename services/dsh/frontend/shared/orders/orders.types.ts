import type { components } from "../../../clients/generated/dsh-api";

export type DshOrderStatus = components["schemas"]["DshOrderStatus"];
export type DshOrderItem = components["schemas"]["DshOrderItem"];
export type DshOrder = components["schemas"]["DshOrder"];

export type DshCreateOrderInput = {
  readonly checkoutIntentId: string;
};

export type DshRejectOrderInput = {
  readonly reason: string;
};

export type DshOrdersListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly orders: readonly DshOrder[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshOrderDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly order: DshOrder }
  | { readonly kind: "error"; readonly message: string };

export type DshOrderActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly order: DshOrder }
  | { readonly kind: "error"; readonly message: string };

export const ORDER_STATUS_LABELS: Record<DshOrderStatus, string> = {
  pending: "قيد الانتظار",
  store_accepted: "تم القبول",
  preparing: "قيد التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  driver_assigned: "تم تعيين الكابتن",
  driver_arrived_store: "وصل الكابتن للمتجر",
  picked_up: "تم الاستلام",
  arrived_customer: "وصل الكابتن للعميل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};
