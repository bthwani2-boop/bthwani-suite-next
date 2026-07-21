import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Regression test for the DSH captain-app fulfillment-mode boundary.
//
// Partner-delivery and client-pickup are not captain-assignment concepts. The
// captain inbox maps only DshDispatchAssignment records, and the pure mapper
// pins every rendered item to bthwani_delivery regardless of stray upstream
// fields attached to an assignment-shaped object.
const { toBellItem } = await import(
  "../dist/services/dsh/frontend/shared/delivery/captain-inbox.mapper.js"
);

function baseAssignment(extra = {}) {
  return {
    id: "assignment-1",
    orderId: "order-1",
    status: "accepted",
    delivery: { status: "driver_assigned" },
    ...extra,
  };
}

describe("captain inbox excludes non-captain fulfillment modes", () => {
  test("pins a standard assignment to bthwani_delivery", () => {
    const item = toBellItem(baseAssignment());
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
  });

  test("ignores a stray partner_delivery field", () => {
    const item = toBellItem(baseAssignment({ fulfillmentMode: "partner_delivery" }));
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
  });

  test("ignores a stray pickup field", () => {
    const item = toBellItem(baseAssignment({ fulfillmentMode: "pickup" }));
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
  });
});
