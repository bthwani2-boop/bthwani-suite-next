import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Regression test for the DSH captain-app fulfillment-mode boundary.
//
// The partner_delivery/pickup slice added dsh_partner_delivery_tasks and
// dsh_pickup_sessions concepts that are explicitly NOT captain-assignment
// concepts. The app-captain inbox (OrderInboxSection.tsx /
// DshCaptainOrdersScreen.tsx) only ever renders `DshCaptainOrderBellItem`s,
// which are produced exclusively by `toBellItem` in
// shared/delivery/captain-inbox.model.ts from `DshDispatchAssignment`
// records fetched via `fetchCaptainDispatchAssignments` (captain-assignment
// dispatch, never a partner_delivery task or pickup session).
//
// This test proves the real boundary: even if a caller manages to attach a
// stray `fulfillmentMode: 'partner_delivery' | 'pickup'` field onto an
// assignment-shaped object (e.g. a bug upstream), `toBellItem` never reads
// it -- the bell item's `fulfillmentMode` is a hardcoded literal
// `'bthwani_delivery'` (also enforced at the type level: the generated
// `DshCaptainOrderBellItem.fulfillmentMode` type is the single literal
// `'bthwani_delivery'`, so `partner_delivery`/`pickup` cannot type-check
// through this mapper at all).
const { toBellItem } = await import(
  "../dist/services/dsh/frontend/shared/delivery/captain-inbox.model.js"
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

describe("app-captain inbox structurally excludes partner_delivery/pickup", () => {
  test("a mock payload tagged fulfillmentMode: 'partner_delivery' never surfaces as such in the bell item", () => {
    const tainted = baseAssignment({ fulfillmentMode: "partner_delivery" });
    const item = toBellItem(tainted);
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
    assert.notEqual(item.fulfillmentMode, "partner_delivery");
  });

  test("a mock payload tagged fulfillmentMode: 'pickup' never surfaces as such in the bell item", () => {
    const tainted = baseAssignment({ fulfillmentMode: "pickup" });
    const item = toBellItem(tainted);
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
    assert.notEqual(item.fulfillmentMode, "pickup");
  });

  test("ordinary dispatch assignments still map through unaffected", () => {
    const item = toBellItem(baseAssignment());
    assert.equal(item.fulfillmentMode, "bthwani_delivery");
    assert.equal(item.orderId, "order-1");
    assert.equal(item.kind, "active");
  });
});
