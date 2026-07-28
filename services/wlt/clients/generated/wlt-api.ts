/**
 * Generated client surface for the canonical modular WLT contracts.
 *
 * Source contracts:
 * - services/wlt/contracts/wlt.openapi.yaml
 * - services/wlt/contracts/wlt.payments.openapi.yaml
 * - services/wlt/contracts/jrn-035-refunds.openapi.yaml
 * - services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml
 * - services/wlt/contracts/jrn-037-payouts-destinations.openapi.yaml
 * - services/wlt/contracts/jrn-038-cod-custody.openapi.yaml
 *
 * Direct ledger mutation and partner-only payout-destination operations are
 * intentionally absent. Financial writes are exposed only through governed
 * domain operations.
 */

export type WltActorType = "client" | "partner" | "captain" | "field" | "system" | "platform";
export type WltPayoutActorType = "partner" | "captain" | "field";
export type WltPaymentStatus =
  | "reference_created"
  | "pending_provider"
  | "authorization_pending"
  | "authorized"
  | "capture_pending"
  | "captured"
  | "cod_pending"
  | "cod_collected"
  | "failed"
  | "expired"
  | "provider_result_unknown";

export type WltErrorEnvelope = {
  error: { code: string; message: string };
};

export type WltRequestContext = {
  Authorization: string;
  "X-Service-Caller": "dsh";
  "X-Tenant-ID": string;
  "X-Correlation-ID"?: string;
  "Idempotency-Key"?: string;
};

export interface paths {
  "/wlt/health": { get: operations["getWltHealth"] };
  "/wlt/readiness": { get: operations["getWltReadiness"] };
  "/wlt/references/payment-status": { get: operations["getWltPaymentStatusRef"] };
  "/wlt/references/settlement-status": { get: operations["getWltSettlementStatusRef"] };
  "/wlt/references/refund-status": { get: operations["getWltRefundStatusRef"] };
  "/wlt/references/wallet-status": { get: operations["getWltWalletStatusRef"] };
  "/wlt/wallets/{actorType}/{actorId}": { get: operations["getWltWallet"] };

  "/wlt/payment-sessions": { post: operations["createWltPaymentSession"] };
  "/wlt/payment-sessions/{paymentSessionId}": { get: operations["getWltPaymentSession"] };
  "/wlt/payment-sessions/{paymentSessionId}/authorize": { post: operations["authorizeWltPaymentSession"] };
  "/wlt/payment-sessions/{paymentSessionId}/capture": { post: operations["captureWltPaymentSession"] };
  "/wlt/payment-sessions/{paymentSessionId}/expire": { post: operations["expireWltPaymentSession"] };
  "/wlt/payment-sessions/{paymentSessionId}/cancel-for-order": { post: operations["cancelWltPaymentSessionForOrder"] };
  "/wlt/payment-sessions/{paymentSessionId}/timeline": { get: operations["getWltPaymentSessionTimeline"] };

  "/wlt/refunds": {
    get: operations["listWltRefunds"];
    post: operations["createWltRefund"];
  };
  "/wlt/refunds/{refundId}": { get: operations["getWltRefund"] };
  "/wlt/refunds/{refundId}/approve": { post: operations["approveWltRefund"] };
  "/wlt/refunds/{refundId}/complete": { post: operations["completeWltRefund"] };
  "/wlt/refunds/{refundId}/reject": { post: operations["rejectWltRefund"] };
  "/wlt/refunds/{refundId}/reconcile": { post: operations["reconcileWltRefund"] };

  "/wlt/settlements": {
    get: operations["listWltSettlements"];
    post: operations["createWltSettlement"];
  };
  "/wlt/settlements/{settlementId}": { get: operations["getWltSettlement"] };
  "/wlt/settlements/{settlementId}/post": { post: operations["postWltSettlement"] };
  "/wlt/settlements/summary": { get: operations["getWltSettlementSummary"] };

  "/wlt/commission-policies": { put: operations["upsertWltCommissionPolicy"] };
  "/wlt/commissions": {
    get: operations["listWltCommissions"];
    post: operations["createWltCommission"];
  };
  "/wlt/commissions/{commissionId}": { get: operations["getWltCommission"] };
  "/wlt/commissions/{commissionId}/adjust": { post: operations["adjustWltCommission"] };
  "/wlt/commissions/{commissionId}/confirm": { post: operations["confirmWltCommission"] };
  "/wlt/commissions/{commissionId}/settle": { post: operations["settleWltCommission"] };
  "/wlt/commissions/{commissionId}/reject": { post: operations["rejectWltCommission"] };
  "/wlt/commissions/{commissionId}/reverse": { post: operations["reverseWltCommission"] };

  "/wlt/cod-records": {
    get: operations["listWltCodRecords"];
    post: operations["createWltCodRecord"];
  };
  "/wlt/cod-records/{codRecordId}": { get: operations["getWltCodRecord"] };
  "/wlt/cod-records/{codRecordId}/collect": { post: operations["collectWltCod"] };
  "/wlt/cod-records/{codRecordId}/remit": { post: operations["remitWltCod"] };

  "/wlt/payout-destinations/{actorType}/{actorId}": {
    get: operations["getWltTypedPayoutDestination"];
    put: operations["upsertWltTypedPayoutDestination"];
  };
  "/wlt/payout-destinations/{actorType}/{actorId}/deactivate": {
    post: operations["deactivateWltTypedPayoutDestination"];
  };
  "/wlt/payout-requests": {
    get: operations["listWltPayoutRequests"];
    post: operations["createWltDestinationBoundPayoutRequest"];
  };
  "/wlt/payout-requests/{payoutId}": { get: operations["getWltPayoutRequest"] };
  "/wlt/payout-requests/{payoutId}/approve": { post: operations["approveWltPayoutRequest"] };
  "/wlt/payout-requests/{payoutId}/reject": { post: operations["rejectWltPayoutRequest"] };
  "/wlt/payout-requests/{payoutId}/process": { post: operations["processWltPayoutRequest"] };
  "/wlt/payout-requests/{payoutId}/complete": { post: operations["completeWltPayoutRequest"] };
  "/wlt/payout-requests/{payoutId}/reconcile": { post: operations["reconcileWltPayoutRequest"] };

  "/wlt/ledger/entries": {
    get: operations["listWltLedgerEntries"];
    post?: never;
  };
  "/wlt/ledger/entries/{entryId}": { get: operations["getWltLedgerEntry"] };
  "/wlt/ledger/financial-summary": { get: operations["getWltLedgerFinancialSummary"] };
}

export interface operations {
  getWltHealth: WltOperation;
  getWltReadiness: WltOperation;
  getWltPaymentStatusRef: WltOperation;
  getWltSettlementStatusRef: WltOperation;
  getWltRefundStatusRef: WltOperation;
  getWltWalletStatusRef: WltOperation;
  getWltWallet: WltOperation;

  createWltPaymentSession: WltOperation;
  getWltPaymentSession: WltOperation;
  authorizeWltPaymentSession: WltOperation;
  captureWltPaymentSession: WltOperation;
  expireWltPaymentSession: WltOperation;
  cancelWltPaymentSessionForOrder: WltOperation;
  getWltPaymentSessionTimeline: WltOperation;

  createWltRefund: WltOperation;
  getWltRefund: WltOperation;
  listWltRefunds: WltOperation;
  approveWltRefund: WltOperation;
  completeWltRefund: WltOperation;
  rejectWltRefund: WltOperation;
  reconcileWltRefund: WltOperation;

  createWltSettlement: WltOperation;
  getWltSettlement: WltOperation;
  listWltSettlements: WltOperation;
  postWltSettlement: WltOperation;
  getWltSettlementSummary: WltOperation;

  upsertWltCommissionPolicy: WltOperation;
  createWltCommission: WltOperation;
  getWltCommission: WltOperation;
  listWltCommissions: WltOperation;
  adjustWltCommission: WltOperation;
  confirmWltCommission: WltOperation;
  settleWltCommission: WltOperation;
  rejectWltCommission: WltOperation;
  reverseWltCommission: WltOperation;

  createWltCodRecord: WltOperation;
  getWltCodRecord: WltOperation;
  listWltCodRecords: WltOperation;
  collectWltCod: WltOperation;
  remitWltCod: WltOperation;

  getWltTypedPayoutDestination: WltOperation;
  upsertWltTypedPayoutDestination: WltOperation;
  deactivateWltTypedPayoutDestination: WltOperation;
  listWltPayoutRequests: WltOperation;
  createWltDestinationBoundPayoutRequest: WltOperation;
  getWltPayoutRequest: WltOperation;
  approveWltPayoutRequest: WltOperation;
  rejectWltPayoutRequest: WltOperation;
  processWltPayoutRequest: WltOperation;
  completeWltPayoutRequest: WltOperation;
  reconcileWltPayoutRequest: WltOperation;

  listWltLedgerEntries: WltOperation;
  getWltLedgerEntry: WltOperation;
  getWltLedgerFinancialSummary: WltOperation;
}

export type WltOperation = {
  parameters?: {
    header?: Partial<WltRequestContext>;
    path?: Record<string, string>;
    query?: Record<string, string | number | boolean | undefined>;
  };
  requestBody?: { content: { "application/json": unknown } };
  responses: Record<number | string, { content?: { "application/json": unknown } }>;
};

export interface components {
  schemas: {
    WltPaymentSession: { status: WltPaymentStatus; [key: string]: unknown };
    WltPaymentSessionResponse: { paymentSession: components["schemas"]["WltPaymentSession"] };
    WltRefund: Record<string, unknown>;
    WltRefundResponse: Record<string, unknown>;
    WltSettlement: Record<string, unknown>;
    WltSettlementResponse: Record<string, unknown>;
    WltCommission: Record<string, unknown>;
    WltCommissionResponse: Record<string, unknown>;
    WltCodRecord: Record<string, unknown>;
    WltCodRecordResponse: Record<string, unknown>;
    WltLedgerEntry: Record<string, unknown>;
    WltLedgerEntryResponse: Record<string, unknown>;
    ErrorEnvelope: WltErrorEnvelope;
  };
}
