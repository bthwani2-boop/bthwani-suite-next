export type DshOpsApprovalOrder = {
  id: string;
  fulfillmentMode: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  paymentMethod: string;
  paymentStatus: string;
  couponCode?: string;
  customerNote?: string;
  customerInstructions?: string;
  cartItems: { title: string; priceLabel: string; qty: number }[];
  totalLabel: string;
  eventLog: { status: string; actor: string; timestamp: string }[];
};

