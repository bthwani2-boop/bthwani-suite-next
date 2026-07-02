import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { OPERATIONAL_CHECKPOINT_POLICY } = await import(
  "../dist/frontend/shared/geo/geo.operational-checkpoint.types.js"
);

describe("geo.operational-checkpoint.policy", () => {
  test("default interval is at least 300 seconds", () => {
    assert.ok(OPERATIONAL_CHECKPOINT_POLICY.defaultIntervalSeconds >= 300);
  });

  test("minimum interval is at least 300 seconds", () => {
    assert.ok(OPERATIONAL_CHECKPOINT_POLICY.minIntervalSeconds >= 300);
  });

  test("streaming is not allowed", () => {
    assert.equal(OPERATIONAL_CHECKPOINT_POLICY.streamingAllowed, false);
  });

  test("watchPosition is not allowed", () => {
    assert.equal(OPERATIONAL_CHECKPOINT_POLICY.watchPositionAllowed, false);
  });

  test("background continuous tracking is not allowed", () => {
    assert.equal(OPERATIONAL_CHECKPOINT_POLICY.backgroundContinuousTrackingAllowed, false);
  });

  test("app-client is in forbidden consumers", () => {
    assert.ok(OPERATIONAL_CHECKPOINT_POLICY.forbiddenConsumers.includes("app-client"));
  });

  test("control-panel is in allowed consumers", () => {
    assert.ok(OPERATIONAL_CHECKPOINT_POLICY.allowedConsumers.includes("control-panel"));
  });
});
