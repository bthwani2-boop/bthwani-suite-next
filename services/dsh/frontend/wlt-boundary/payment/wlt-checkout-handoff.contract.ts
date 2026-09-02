import type { components } from "@bthwani/wlt/openapi";

/** Cross-service envelopes are owned by WLT OpenAPI; this file exposes aliases only. */
export type WltPaymentCallbackEnvelope = components["schemas"]["WltPaymentCallbackEnvelope"];
export type DshCheckoutPaymentReference = components["schemas"]["DshCheckoutPaymentReference"];

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
