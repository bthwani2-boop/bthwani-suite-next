import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "../clients/generated/wlt-api.ts"), "utf-8");

describe("generated WLT API client coverage", () => {
  test("includes canonical WLT core operations", () => {
    assert.match(source, /getWltHealth/);
    assert.match(source, /getWltReadiness/);
    assert.match(source, /getWltPaymentStatusRef/);
    assert.match(source, /getWltSettlementStatusRef/);
    assert.match(source, /getWltRefundStatusRef/);
    assert.match(source, /getWltWalletStatusRef/);
    assert.match(source, /getWltWallet/);
  });

  test("includes governed payment and refund lifecycles", () => {
    assert.match(source, /createWltPaymentSession/);
    assert.match(source, /authorizeWltPaymentSession/);
    assert.match(source, /captureWltPaymentSession/);
    assert.match(source, /cancelWltPaymentSessionForOrder/);
    assert.match(source, /createWltRefund/);
    assert.match(source, /approveWltRefund/);
    assert.match(source, /completeWltRefund/);
    assert.match(source, /reconcileWltRefund/);
  });

  test("includes governed settlement and commission lifecycles", () => {
    assert.match(source, /createWltSettlement/);
    assert.match(source, /postWltSettlement/);
    assert.match(source, /getWltSettlementSummary/);
    assert.match(source, /upsertWltCommissionPolicy/);
    assert.match(source, /createWltCommission/);
    assert.match(source, /adjustWltCommission/);
    assert.match(source, /confirmWltCommission/);
    assert.match(source, /settleWltCommission/);
    assert.match(source, /rejectWltCommission/);
    assert.match(source, /reverseWltCommission/);
  });

  test("includes typed tenant-scoped payout destinations", () => {
    assert.match(source, /\/wlt\/payout-destinations\/\{actorType\}\/\{actorId\}/);
    assert.match(source, /getWltTypedPayoutDestination/);
    assert.match(source, /upsertWltTypedPayoutDestination/);
    assert.match(source, /deactivateWltTypedPayoutDestination/);
    assert.match(source, /createWltDestinationBoundPayoutRequest/);
    assert.doesNotMatch(source, /\/wlt\/payout-destinations\/\{partnerId\}/);
  });

  test("exposes ledger reads but no direct append operation", () => {
    assert.match(source, /listWltLedgerEntries/);
    assert.match(source, /getWltLedgerEntry/);
    assert.match(source, /getWltLedgerFinancialSummary/);
    assert.match(source, /post\?: never/);
    assert.doesNotMatch(source, /appendWltLedgerEntry/);
  });
});
