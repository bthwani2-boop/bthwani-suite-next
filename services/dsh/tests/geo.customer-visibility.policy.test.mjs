import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { CUSTOMER_GEO_VISIBILITY_POLICY, FORBIDDEN_CLIENT_GEO_SYMBOLS } = await import(
  "../dist/frontend/shared/geo/geo.customer-visibility.policy.js"
);

describe("geo.customer-visibility.policy", () => {
  test("customer cannot see captain coordinates", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeCaptainCoordinates, false);
  });

  test("customer cannot see captain marker", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeCaptainMarker, false);
  });

  test("customer cannot see route polyline", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeRoutePolyline, false);
  });

  test("customer cannot see last known captain location", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeLastKnownCaptainLocation, false);
  });

  test("customer cannot see captain heartbeat", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeCaptainHeartbeat, false);
  });

  test("customer can see order status milestones", () => {
    assert.equal(CUSTOMER_GEO_VISIBILITY_POLICY.canSeeOrderStatusMilestones, true);
  });

  test("captainLatitude is in forbidden symbols list", () => {
    assert.ok(FORBIDDEN_CLIENT_GEO_SYMBOLS.includes("captainLatitude"));
  });

  test("getCaptainLocation is in forbidden symbols list", () => {
    assert.ok(FORBIDDEN_CLIENT_GEO_SYMBOLS.includes("getCaptainLocation"));
  });

  test("watchPosition is in forbidden symbols list", () => {
    assert.ok(FORBIDDEN_CLIENT_GEO_SYMBOLS.includes("watchPosition"));
  });

  test("heartbeat is in forbidden symbols list", () => {
    assert.ok(FORBIDDEN_CLIENT_GEO_SYMBOLS.includes("heartbeat"));
  });
});
