import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  CUSTOMER_STATUS_MILESTONE_LABELS,
  toCustomerStatusMilestone,
  toCustomerStatusLabel,
} = await import("../dist/frontend/shared/geo/geo.status-updates.js");

describe("geo.status-updates", () => {
  test("all milestone labels are defined", () => {
    const milestones = [
      "order_accepted",
      "store_preparing",
      "picked_up",
      "on_the_way",
      "captain_arrived",
      "delivered",
    ];
    for (const m of milestones) {
      assert.ok(CUSTOMER_STATUS_MILESTONE_LABELS[m], `missing label for ${m}`);
    }
  });

  test("driver_assigned maps to order_accepted", () => {
    assert.equal(toCustomerStatusMilestone("driver_assigned"), "order_accepted");
  });

  test("driver_arrived_store maps to store_preparing", () => {
    assert.equal(toCustomerStatusMilestone("driver_arrived_store"), "store_preparing");
  });

  test("picked_up maps to picked_up", () => {
    assert.equal(toCustomerStatusMilestone("picked_up"), "picked_up");
  });

  test("arrived_customer maps to on_the_way", () => {
    assert.equal(toCustomerStatusMilestone("arrived_customer"), "on_the_way");
  });

  test("delivered maps to delivered", () => {
    assert.equal(toCustomerStatusMilestone("delivered"), "delivered");
  });

  test("toCustomerStatusLabel returns a non-empty string", () => {
    const label = toCustomerStatusLabel("picked_up");
    assert.ok(typeof label === "string" && label.length > 0);
  });
});
