import type { DshOrder, DshOrdersListState } from "./orders.types";
import { orderActionErrorState, orderActionSuccessState, ordersErrorState } from "./orders.states";
import { hasRejectReason, resolveOrdersListState } from "./orders.view-model";

export type OrderErrorKind = "permission_denied" | "offline" | "conflict" | "not_found" | "error";
export function resolveOrdersLoadSuccess(orders: readonly DshOrder[]): DshOrdersListState { return resolveOrdersListState(orders); }
export function resolveOrdersLoadError(classified: { readonly kind: OrderErrorKind }, scope: "client" | "partner" | "operator"): DshOrdersListState {
  if (classified.kind === "offline") return ordersErrorState("لا يوجد اتصال بالإنترنت.");
  if (scope === "partner") return ordersErrorState("تعذر تحميل طلبات المتجر.");
  if (scope === "operator") return ordersErrorState("تعذر تحميل قائمة الطلبات.");
  return ordersErrorState("تعذر تحميل الطلبات.");
}
export function resolveCreateOrderError(classified: { readonly kind: OrderErrorKind }) {
  if (classified.kind === "offline") return orderActionErrorState("لا يوجد اتصال بالإنترنت.");
  if (classified.kind === "permission_denied") return orderActionErrorState("يلزم تسجيل الدخول لإنشاء الطلب.");
  return orderActionErrorState("تعذر إنشاء الطلب.");
}
export function resolveRejectOrderValidation(reason: string) { return hasRejectReason(reason) ? null : orderActionErrorState("سبب الرفض مطلوب."); }
export function resolvePartnerOrderActionError(classified: { readonly kind: OrderErrorKind }, action: "accept" | "reject" | "preparing" | "ready") {
  if (classified.kind === "conflict") {
    if (action === "accept") return orderActionErrorState("الطلب في حالة لا تسمح بالقبول.");
    if (action === "reject") return orderActionErrorState("الطلب في حالة لا تسمح بالرفض.");
    return orderActionErrorState("الطلب في حالة لا تسمح بالتجهيز.");
  }
  if (action === "accept") return orderActionErrorState("تعذر قبول الطلب.");
  if (action === "reject") return orderActionErrorState("تعذر رفض الطلب.");
  return orderActionErrorState("تعذر تحديث حالة الطلب.");
}
export function shouldLoadPartnerOrders(storeId: string): boolean { return storeId.trim() !== ""; }
