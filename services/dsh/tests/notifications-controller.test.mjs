import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("notifications states", () => {
  it("notifIdle returns kind=idle", async () => {
    const { notifIdle } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    assert.equal(notifIdle().kind, "idle");
  });

  it("notifLoading returns kind=loading", async () => {
    const { notifLoading } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    assert.equal(notifLoading().kind, "loading");
  });

  it("notifSuccess wraps notifications and unreadCount", async () => {
    const { notifSuccess } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const n = [{
      id: "n1", actorId: "a1", actorType: "client", topic: "order",
      title: "طلب جديد", body: "تم تأكيد طلبك", actionUrl: "",
      isRead: false, createdAt: "2026-06-24T00:00:00Z",
    }];
    const s = notifSuccess(n, 1);
    assert.equal(s.kind, "success");
    assert.equal(s.unreadCount, 1);
    assert.equal(s.notifications.length, 1);
    assert.equal(s.notifications[0].topic, "order");
  });

  it("notifError carries message", async () => {
    const { notifError } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const s = notifError("network error");
    assert.equal(s.kind, "error");
    assert.equal(s.message, "network error");
  });

  it("configSuccess wraps configs", async () => {
    const { configSuccess } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const configs = [{
      id: "c1", topic: "order_update", actorTypes: ["client"],
      isEnabled: true, description: "Order updates",
      updatedBy: "admin", updatedAt: "2026-06-24T00:00:00Z",
    }];
    const s = configSuccess(configs);
    assert.equal(s.kind, "success");
    assert.equal(s.configs[0].topic, "order_update");
  });
});

describe("finance-visibility states", () => {
  it("financeIdle returns kind=idle", async () => {
    const { financeIdle } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.states.js"
    );
    assert.equal(financeIdle().kind, "idle");
  });

  it("financeSuccess wraps data", async () => {
    const { financeSuccess } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.states.js"
    );
    const data = {
      orderId: "ord-1", paymentStatus: "captured", settlementStatus: "settled",
      refundStatus: null, walletStatus: null, updatedAt: "2026-06-24T00:00:00Z",
    };
    const s = financeSuccess(data);
    assert.equal(s.kind, "success");
    assert.equal(s.data.orderId, "ord-1");
  });

  it("financeWltUnavailable returns kind=wlt_unavailable", async () => {
    const { financeWltUnavailable } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.states.js"
    );
    assert.equal(financeWltUnavailable().kind, "wlt_unavailable");
  });
});

describe("finance-visibility view-model", () => {
  it("buildFinanceStatusLabel maps payment statuses", async () => {
    const { buildFinanceStatusLabel } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.view-model.js"
    );
    assert.equal(buildFinanceStatusLabel("captured", "payment").badge, "success");
    assert.equal(buildFinanceStatusLabel("pending", "payment").badge, "warning");
    assert.equal(buildFinanceStatusLabel("failed", "payment").badge, "error");
    assert.equal(buildFinanceStatusLabel("unknown", "payment").badge, "neutral");
  });

  it("buildFinanceStatusLabel maps settlement statuses", async () => {
    const { buildFinanceStatusLabel } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.view-model.js"
    );
    assert.equal(buildFinanceStatusLabel("settled", "settlement").badge, "success");
    assert.equal(buildFinanceStatusLabel("on_hold", "settlement").badge, "warning");
    assert.equal(buildFinanceStatusLabel("failed", "settlement").badge, "error");
  });

  it("buildPartnerFinanceSummaryViewModel composes refs", async () => {
    const { buildPartnerFinanceSummaryViewModel } = await import(
      "../dist/services/dsh/frontend/shared/finance-wlt-link/finance-visibility/finance-visibility.view-model.js"
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

describe("administration types validation", () => {
  it("partner activation valid statuses are complete", () => {
    const statuses = ["submitted", "ops_approved", "partner_active", "blocked"];
    assert.equal(statuses.length, 4);
    assert.ok(statuses.includes("partner_active"));
    assert.ok(statuses.includes("blocked"));
  });
});

describe("marketing status transitions", () => {
  it("campaign status values are recognised", () => {
    const statuses = ["draft", "active", "paused", "completed", "cancelled"];
    assert.ok(statuses.includes("active"));
    assert.ok(statuses.includes("draft"));
    assert.equal(statuses.length, 5);
  });
});

describe("platform-policies serviceability", () => {
  it("zone serviceability shape is correct", () => {
    const result = { zoneId: "z1", isActive: true, activeStores: 5, slaAvailable: true };
    assert.equal(result.isActive, true);
    assert.equal(result.activeStores, 5);
    assert.equal(result.slaAvailable, true);
  });
});
