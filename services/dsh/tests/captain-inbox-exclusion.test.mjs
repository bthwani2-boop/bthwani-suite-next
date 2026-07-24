import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Regression test for the DSH captain-app fulfillment-mode boundary.
//
// Partner-delivery and client-pickup are not captain-assignment concepts. The
// production mapper delegates this classification to the pure resolver below,
// which pins every rendered assignment to bthwani_delivery regardless of stray
// upstream fields attached to an assignment-shaped object.
const { resolveCaptainInboxFulfillmentMode } = await import(
  "../frontend/shared/delivery/captain-inbox.fulfillment.ts"
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
    assert.equal(resolveCaptainInboxFulfillmentMode(baseAssignment()), "bthwani_delivery");
  });

  test("ignores a stray partner_delivery field", () => {
    assert.equal(
      resolveCaptainInboxFulfillmentMode(baseAssignment({ fulfillmentMode: "partner_delivery" })),
      "bthwani_delivery",
    );
  });

  test("ignores a stray pickup field", () => {
    assert.equal(
      resolveCaptainInboxFulfillmentMode(baseAssignment({ fulfillmentMode: "pickup" })),
      "bthwani_delivery",
    );
  });
});
