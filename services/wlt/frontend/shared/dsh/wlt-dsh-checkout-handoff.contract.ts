import type { WltPaymentStatusReference } from "./wlt-dsh-boundary.types";

export type WltPaymentCallbackEnvelope = {
  readonly paymentSessionId: string;
  readonly checkoutIntentId: string;
  readonly paymentStatus: WltPaymentStatusReference;
  readonly occurredAt: string;
};

export type DshCheckoutPaymentReference = {
  readonly paymentSessionId: string;
  readonly paymentStatus: WltPaymentStatusReference;
};

export const WLT_DSH_CHECKOUT_BOUNDARY = {
  owner: "wlt",
  contractState: "PAYMENT_SESSION_REFERENCE_ACTIVE",
  dshMayVerifyProviderSignature: false,
  dshUiMayCreatePaymentSession: false,
  dshFrontendSharedMayCreatePaymentSession: false,
  dshBackendMayRequestPaymentSessionReference: true,
  dshMayStoreWltReferenceReadOnly: true,
  wltOwnsPaymentSessionTruth: true,
  wltOwnsPaymentStatusTruth: true,
  dshMayMutateLedger: false,
  dshMayFinalizeRefund: false,
} as const;
