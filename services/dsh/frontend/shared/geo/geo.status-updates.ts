export type CustomerOrderStatusMilestone =
  | "order_accepted"
  | "store_preparing"
  | "picked_up"
  | "on_the_way"
  | "captain_arrived"
  | "delivered";

export const CUSTOMER_STATUS_MILESTONE_LABELS: Record<CustomerOrderStatusMilestone, string> = {
  order_accepted: "تم قبول الطلب",
  store_preparing: "المتجر يجهز طلبك",
  picked_up: "تم استلام الطلب من المتجر",
  on_the_way: "الطلب في الطريق إليك",
  captain_arrived: "الكابتن وصل",
  delivered: "تم التسليم",
};

export function toCustomerStatusMilestone(deliveryStatus: string): CustomerOrderStatusMilestone {
  switch (deliveryStatus) {
    case "assigned":
    case "driver_assigned":
      return "order_accepted";
    case "driver_arrived_store":
      return "store_preparing";
    case "picked_up":
      return "picked_up";
    case "arrived_customer":
      return "on_the_way";
    default:
      return "delivered";
  }
}

export function toCustomerStatusLabel(deliveryStatus: string): string {
  return CUSTOMER_STATUS_MILESTONE_LABELS[toCustomerStatusMilestone(deliveryStatus)];
}
