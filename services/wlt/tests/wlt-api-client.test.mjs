import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "../clients/generated/wlt-api.ts"), "utf-8");

describe("generated WLT API client coverage", () => {
  test("includes WLT Foundation base operations", () => {
    assert.match(source, /getWltHealth/);
    assert.match(source, /getWltReadiness/);
    assert.match(source, /getWltPaymentStatusRef/);
    assert.match(source, /getWltSettlementStatusRef/);
    assert.match(source, /getWltRefundStatusRef/);
    assert.match(source, /getWltWalletStatusRef/);
    assert.match(source, /createWltPaymentSessionReference/);
    assert.match(source, /getWltPaymentSessionReference/);
    assert.match(source, /WltPaymentSession/);
    assert.match(source, /WltPaymentSessionResponse/);
  });

  test("includes WLT Payment Sessions payment capture operations", () => {
    assert.match(source, /authorizeWltPaymentSession/);
    assert.match(source, /captureWltPaymentSession/);
    assert.match(source, /expireWltPaymentSession/);
    assert.match(source, /markWltCodCollected/);
    assert.match(source, /WltAuthorizePaymentSessionRequest/);
    assert.match(source, /WltAuthorizePaymentSessionResponse/);
    assert.match(source, /WltCapturePaymentSessionResponse/);
    assert.match(source, /WltExpirePaymentSessionResponse/);
    assert.match(source, /WltCodCollectResponse/);
  });

  test("includes WLT Refund Status refund operations", () => {
    assert.match(source, /createWltRefund/);
    assert.match(source, /getWltRefund/);
    assert.match(source, /listWltRefunds/);
    assert.match(source, /approveWltRefund/);
    assert.match(source, /completeWltRefund/);
    assert.match(source, /rejectWltRefund/);
    assert.match(source, /WltRefund[^s]/);
    assert.match(source, /WltCreateRefundRequest/);
    assert.match(source, /WltRefundResponse/);
    assert.match(source, /WltRefundsListResponse/);
    assert.match(source, /WltRejectRefundRequest/);
  });

  test("includes WLT Settlement Status settlement operations", () => {
    assert.match(source, /createWltSettlement/);
    assert.match(source, /getWltSettlement/);
    assert.match(source, /listWltSettlements/);
    assert.match(source, /postWltSettlement/);
    assert.match(source, /getWltSettlementSummary/);
    assert.match(source, /WltSettlement[^s]/);
    assert.match(source, /WltCreateSettlementRequest/);
    assert.match(source, /WltSettlementResponse/);
    assert.match(source, /WltSettlementsListResponse/);
    assert.match(source, /WltSettlementSummary/);
    assert.match(source, /WltSettlementSummaryResponse/);
  });

  test("includes WLT Commission COD commission operations", () => {
    assert.match(source, /createWltCodRecord/);
    assert.match(source, /getWltCodRecord/);
    assert.match(source, /listWltCodRecords/);
    assert.match(source, /collectWltCod/);
    assert.match(source, /remitWltCod/);
    assert.match(source, /createWltCommission/);
    assert.match(source, /listWltCommissions/);
    assert.match(source, /WltCodRecord[^s]/);
    assert.match(source, /WltCreateCodRecordRequest/);
    assert.match(source, /WltCodRecordResponse/);
    assert.match(source, /WltCodRecordsListResponse/);
    assert.match(source, /WltCommission[^s]/);
    assert.match(source, /WltCreateCommissionRequest/);
    assert.match(source, /WltCommissionResponse/);
    assert.match(source, /WltCommissionsListResponse/);
  });

  test("includes WLT Ledger ledger audit operations", () => {
    assert.match(source, /appendWltLedgerEntry/);
    assert.match(source, /getWltLedgerEntry/);
    assert.match(source, /listWltLedgerEntries/);
    assert.match(source, /WltLedgerEntry[^R]/);
    assert.match(source, /WltCreateLedgerEntryRequest/);
    assert.match(source, /WltLedgerEntryResponse/);
    assert.match(source, /WltLedgerEntriesListResponse/);
  });
});
