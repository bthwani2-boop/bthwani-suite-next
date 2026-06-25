import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("finance-visibility states", () => {
  it("financeIdle returns kind=idle", async () => {
    const { financeIdle } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.states.js"
    );
    assert.equal(financeIdle().kind, "idle");
  });

  it("financeLoading returns kind=loading", async () => {
    const { financeLoading } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.states.js"
    );
    assert.equal(financeLoading().kind, "loading");
  });

  it("financeSuccess wraps data", async () => {
    const { financeSuccess } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.states.js"
    );
    const data = {
      orderId: "ord-1", paymentStatus: "captured", settlementStatus: "settled",
      refundStatus: null, walletStatus: null, updatedAt: "2026-06-24T00:00:00Z",
    };
    const s = financeSuccess(data);
    assert.equal(s.kind, "success");
    assert.deepEqual(s.data, data);
  });

  it("financeError carries message", async () => {
    const { financeError } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.states.js"
    );
    const s = financeError("WLT unavailable");
    assert.equal(s.kind, "error");
    assert.equal(s.message, "WLT unavailable");
  });

  it("financeWltUnavailable returns kind=wlt_unavailable", async () => {
    const { financeWltUnavailable } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.states.js"
    );
    assert.equal(financeWltUnavailable().kind, "wlt_unavailable");
  });
});

describe("finance-visibility view-model", () => {
  it("buildFinanceStatusLabel maps known payment statuses", async () => {
    const { buildFinanceStatusLabel } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.view-model.js"
    );
    assert.equal(buildFinanceStatusLabel("captured", "payment").badge, "success");
    assert.equal(buildFinanceStatusLabel("pending", "payment").badge, "warning");
    assert.equal(buildFinanceStatusLabel("unknown_status", "payment").badge, "neutral");
  });

  it("buildFinanceStatusLabel maps known settlement statuses", async () => {
    const { buildFinanceStatusLabel } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.view-model.js"
    );
    assert.equal(buildFinanceStatusLabel("settled", "settlement").badge, "success");
    assert.equal(buildFinanceStatusLabel("pending", "settlement").badge, "warning");
    assert.equal(buildFinanceStatusLabel("failed", "settlement").badge, "error");
  });

  it("buildPartnerFinanceSummaryViewModel composes refs correctly", async () => {
    const { buildPartnerFinanceSummaryViewModel } = await import(
      "../dist/frontend/shared/finance-visibility/finance-visibility.view-model.js"
    );
    const payment = { id: "p1", orderId: "ord-1", status: "captured", updatedAt: "2026-06-24T00:00:00Z" };
    const settlement = { id: "s1", orderId: "ord-1", status: "settled", updatedAt: "2026-06-24T00:00:00Z" };
    const vm = buildPartnerFinanceSummaryViewModel(payment, settlement, null);
    assert.equal(vm.orderId, "ord-1");
    assert.equal(vm.paymentStatus, "captured");
    assert.equal(vm.settlementStatus, "settled");
    assert.equal(vm.refundStatus, null);
  });
});
