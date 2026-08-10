import assert from "node:assert/strict";
import test from "node:test";

const stateMachineUrl = new URL(
  "../../../../services/dsh/frontend/shared/orders/orders.state-machine.ts",
  import.meta.url,
);

const { getDshLifecycleStateMetadata } = await import(stateMachineUrl.href);

test("client-owned lifecycle states remain visible to app-client", () => {
  for (const stateId of ["checkout_intent", "serviceability_quote", "order_draft"]) {
    const metadata = getDshLifecycleStateMetadata(stateId);
    assert.ok(metadata, `missing lifecycle metadata for ${stateId}`);
    assert.equal(metadata.actorOwner, "client");
    assert.equal(metadata.visibleToSurfaces.includes("app-client"), true);
  }
});

test("WLT payment and refund states remain read-only to DSH client surfaces", () => {
  for (const stateId of ["awaiting_wlt_payment", "payment_failed", "refund_pending_wlt", "refund_completed_wlt"]) {
    const metadata = getDshLifecycleStateMetadata(stateId);
    assert.ok(metadata, `missing lifecycle metadata for ${stateId}`);
    assert.equal(metadata.visibleToSurfaces.includes("app-client"), true);
    assert.notEqual(metadata.wltImplication, "none");
    assert.notEqual(metadata.actorOwner, "client");
  }
});
