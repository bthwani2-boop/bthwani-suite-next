import assert from "node:assert/strict";
import test from "node:test";

const stateMachineUrl = new URL(
  "../../../../services/dsh/frontend/shared/orders/orders.state-machine.ts",
  import.meta.url,
);

const { getDshLifecycleStateMetadata } = await import(stateMachineUrl.href);

test("client checkout lifecycle preserves actor ownership and app-client visibility", () => {
  const expectedOwners = new Map([
    ["checkout_intent", "client"],
    ["serviceability_quote", "system"],
    ["order_draft", "system"],
  ]);

  for (const [stateId, actorOwner] of expectedOwners) {
    const metadata = getDshLifecycleStateMetadata(stateId);
    assert.ok(metadata, `missing lifecycle metadata for ${stateId}`);
    assert.equal(metadata.actorOwner, actorOwner, `${stateId} actor ownership drifted`);
    assert.equal(
      metadata.visibleToSurfaces.includes("app-client"),
      true,
      `${stateId} must remain visible to app-client`,
    );
    assert.equal(metadata.wltImplication, "none", `${stateId} must not mutate WLT-owned truth`);
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
