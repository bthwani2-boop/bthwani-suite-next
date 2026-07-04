import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  resolveCreateOrderError,
  resolveOrdersLoadError,
  resolveOrdersLoadSuccess,
  resolvePartnerOrderActionError,
  resolveRejectOrderValidation,
  shouldLoadPartnerOrders,
} = await import("../dist/services/dsh/frontend/shared/orders/orders.controller-core.js");

const order = { id: "order-1" };

describe("orders controller core", () => {
  test("resolves list state and partner load precondition", () => {
    assert.equal(resolveOrdersLoadSuccess([]).kind, "empty");
    assert.equal(resolveOrdersLoadSuccess([order]).kind, "success");
    assert.equal(shouldLoadPartnerOrders("store-1"), true);
    assert.equal(shouldLoadPartnerOrders("   "), false);
  });

  test("maps load errors by surface scope", () => {
    assert.equal(resolveOrdersLoadError({ kind: "offline" }, "client").message, "لا يوجد اتصال بالإنترنت.");
    assert.equal(resolveOrdersLoadError({ kind: "error" }, "partner").message, "تعذر تحميل طلبات المتجر.");
    assert.equal(resolveOrdersLoadError({ kind: "error" }, "operator").message, "تعذر تحميل قائمة الطلبات.");
  });

  test("maps create and partner action errors", () => {
    assert.equal(resolveCreateOrderError({ kind: "permission_denied" }).message, "يلزم تسجيل الدخول لإنشاء الطلب.");
    assert.equal(resolveCreateOrderError({ kind: "offline" }).message, "لا يوجد اتصال بالإنترنت.");
    assert.equal(resolvePartnerOrderActionError({ kind: "conflict" }, "accept").message, "الطلب في حالة لا تسمح بالقبول.");
    assert.equal(resolvePartnerOrderActionError({ kind: "conflict" }, "reject").message, "الطلب في حالة لا تسمح بالرفض.");
  });

  test("requires a rejection reason", () => {
    assert.equal(resolveRejectOrderValidation("سبب"), null);
    assert.equal(resolveRejectOrderValidation("  ").kind, "error");
  });
});
