export type CartServiceabilityRequest = {
  readonly storeId: string;
  readonly serviceAreaCode: string;
  readonly items: readonly { readonly productId: string; readonly quantity: number }[];
};

export type CartServiceabilityResult = {
  readonly serviceable: boolean;
  readonly code: "serviceable" | "store_unavailable" | "out_of_area" | "catalog_unavailable";
  readonly reason?: string;
};

export type CheckoutIntentDraft = {
  readonly cartId: string;
  readonly serviceability: CartServiceabilityResult;
  readonly paymentReference: null;
  readonly contractState: "DSH_004_CONTRACT_ONLY";
};

export type CancelCheckoutIntentContract = {
  readonly checkoutIntentId: string;
  readonly reason: string;
  readonly refundRequested: false;
};
