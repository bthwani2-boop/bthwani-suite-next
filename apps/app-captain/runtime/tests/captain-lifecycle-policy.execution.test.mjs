import assert from "node:assert/strict";
import test from "node:test";

const stateMachineUrl = new URL(
  "../../../../services/dsh/frontend/shared/orders/orders.state-machine.ts",
  import.meta.url,
);

const { getDshLifecycleStateMetadata } = await import(stateMachineUrl.href);

for (const stateId of ["captain_accept", "captain_decline", "proof_of_delivery"]) {
  test(`${stateId} remains captain-owned and visible to app-captain`, () => {
    const metadata = getDshLifecycleStateMetadata(stateId);
    assert.ok(metadata, `missing lifecycle metadata for ${stateId}`);
    assert.equal(metadata.actorOwner, "captain");
    assert.equal(metadata.visibleToSurfaces.includes("app-captain"), true);
    assert.equal(metadata.wltImplication, "none");
  });
}

test("captain cannot become financial authority for WLT-owned lifecycle states", () => {
  for (const stateId of ["awaiting_wlt_payment", "refund_pending_wlt", "refund_completed_wlt"]) {
    const metadata = getDshLifecycleStateMetadata(stateId);
    assert.ok(metadata, `missing lifecycle metadata for ${stateId}`);
    assert.notEqual(metadata.actorOwner, "captain");
    assert.notEqual(metadata.wltImplication, "none");
  }
});
