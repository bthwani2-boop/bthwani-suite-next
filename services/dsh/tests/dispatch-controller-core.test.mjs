import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  nextDeliveryStatus,
  resolveDispatchLoadError,
  resolveDispatchLoadSuccess,
  resolvePoDValidation,
  resolveTrackingSuccess,
} = await import("../dist/frontend/shared/dispatch/dispatch.controller-core.js");

const assignment = {
  id: "assignment-1",
  orderId: "order-1",
  captainId: "captain-1",
  assignedBy: "operator-1",
  status: "accepted",
  responseDeadlineAt: "2026-06-24T00:00:00.000Z",
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
  delivery: {
    id: "delivery-1",
    assignmentId: "assignment-1",
    orderId: "order-1",
    captainId: "captain-1",
    status: "driver_assigned",
    podMethod: "",
    podReference: "",
    note: "",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
  },
};

describe("dispatch controller core", () => {
  test("resolves list states", () => {
    assert.equal(resolveDispatchLoadSuccess([]).kind, "empty");
    assert.equal(resolveDispatchLoadSuccess([assignment]).kind, "success");
  });

  test("maps load errors by scope", () => {
    assert.equal(resolveDispatchLoadError({ kind: "offline" }, "captain").message, "لا يوجد اتصال بالإنترنت.");
    assert.equal(resolveDispatchLoadError({ kind: "error" }, "operator").message, "تعذر تحميل غرفة الإرسال.");
  });

  test("moves through delivery lifecycle", () => {
    assert.equal(nextDeliveryStatus("driver_assigned"), "driver_arrived_store");
    assert.equal(nextDeliveryStatus("driver_arrived_store"), "picked_up");
    assert.equal(nextDeliveryStatus("picked_up"), "arrived_customer");
    assert.equal(nextDeliveryStatus("arrived_customer"), null);
  });

  test("resolves tracking active and delivered states", () => {
    assert.equal(resolveTrackingSuccess(assignment).kind, "tracking_active");
    assert.equal(
      resolveTrackingSuccess({
        ...assignment,
        delivery: { ...assignment.delivery, status: "delivered" },
      }).kind,
      "delivered",
    );
  });

  test("validates proof of delivery reference", () => {
    assert.equal(resolvePoDValidation({ method: "code", reference: "1234" }), null);
    assert.equal(resolvePoDValidation({ method: "code", reference: " " }).kind, "error");
  });
});
