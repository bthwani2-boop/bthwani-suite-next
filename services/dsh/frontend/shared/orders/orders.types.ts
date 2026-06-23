export type DshOrderStatus =
  | "pending"
  | "store_accepted"
  | "preparing"
  | "ready_for_pickup"
  | "driver_assigned"
  | "driver_arrived_store"
  | "picked_up"
  | "arrived_customer"
  | "delivered"
  | "cancelled";

export type DshOrderItem = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
};

export type DshOrder = {
  readonly id: string;
  readonly checkoutIntentId: string;
  readonly storeId: string;
  readonly clientId: string;
  readonly status: DshOrderStatus;
  readonly rejectionReason: string;
  /** Opaque WLT payment reference. Empty string until WLT-001 approved. DSH never mutates financial truth. */
  readonly wltPaymentRefId: string;
  readonly items: readonly DshOrderItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreateOrderInput = {
  readonly checkoutIntentId: string;
  readonly storeId: string;
  readonly items: readonly {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
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
