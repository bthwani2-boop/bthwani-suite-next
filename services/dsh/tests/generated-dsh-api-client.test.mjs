import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../clients/generated/dsh-api.ts", import.meta.url),
  "utf8",
);

describe("generated DSH API client coverage", () => {
  test("includes DSH-004 cart operations and schemas", () => {
    assert.match(source, /"\/dsh\/client\/cart"/);
    assert.match(source, /upsertDshCartItem/);
    assert.match(source, /checkDshCartServiceability/);
    assert.match(source, /DshCartResponse/);
  });

  test("includes DSH-005 checkout intent operations and schemas", () => {
    assert.match(source, /"\/dsh\/client\/checkout-intents"/);
    assert.match(source, /createDshCheckoutIntent/);
    assert.match(source, /cancelDshCheckoutIntent/);
    assert.match(source, /DshCheckoutIntentResponse/);
  });

  test("includes DSH-006 order operations and schemas", () => {
    assert.match(source, /"\/dsh\/partner\/orders"/);
    assert.match(source, /createDshOrder/);
    assert.match(source, /acceptDshOrder/);
    assert.match(source, /markDshOrderReadyForPickup/);
    assert.match(source, /DshOrdersResponse/);
  });

  test("includes DSH-007 dispatch operations and schemas", () => {
    assert.match(source, /"\/dsh\/operator\/dispatch\/assignments"/);
    assert.match(source, /createDshAssignment/);
    assert.match(source, /updateDshDeliveryStatus/);
    assert.match(source, /submitDshPoD/);
    assert.match(source, /DshDispatchAssignmentResponse/);
  });
});
