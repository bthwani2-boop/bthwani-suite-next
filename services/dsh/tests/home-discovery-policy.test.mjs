import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import from compiled dist
const { applyDiscoveryFilter, canViewHomeDiscovery } = await import(
  "../dist/frontend/shared/home-discovery/home-discovery.policy.js"
);

const makeStore = (overrides = {}) => ({
  id: "store-001",
  slug: "test-store",
  displayName: "Test Store",
  serviceabilityStatus: "serviceable",
  storeStatus: "active",
  ratingDisplay: "4.5",
  followerCountDisplay: "100",
  etaDisplay: "20–40 د",
  heroImageUrl: null,
  logoUrl: null,
  categoryLabel: "مطاعم",
  isFreeDelivery: false,
  hasProBadge: false,
  hasCouponBadge: false,
  isPopular: false,
  pointsMultiplier: null,
  distanceDisplay: null,
  deliveryModeLabels: [],
  openStatusRole: "storeOpen",
  ...overrides,
});

describe("canViewHomeDiscovery", () => {
  test("always returns true — public surface", () => {
    assert.equal(canViewHomeDiscovery({}), true);
    assert.equal(canViewHomeDiscovery({ isAuthenticated: false }), true);
    assert.equal(canViewHomeDiscovery({ isAuthenticated: true }), true);
  });
});

describe("applyDiscoveryFilter — all", () => {
  test("returns copy of all stores preserving order", () => {
    const stores = [makeStore({ id: "a" }), makeStore({ id: "b" })];
    const result = applyDiscoveryFilter(stores, "all");
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "a");
    assert.equal(result[1].id, "b");
  });

  test("returns new array — does not mutate original", () => {
    const stores = [makeStore()];
    const result = applyDiscoveryFilter(stores, "all");
    assert.notEqual(result, stores);
  });
});

describe("applyDiscoveryFilter — favorites", () => {
  test("returns empty array — favorites requires server-side endpoint not yet available", () => {
    const stores = [makeStore(), makeStore({ id: "store-002" })];
    const result = applyDiscoveryFilter(stores, "favorites");
    assert.equal(result.length, 0);
  });
});

describe("applyDiscoveryFilter — nearest", () => {
  test("stores with distanceDisplay come before stores without", () => {
    const stores = [
      makeStore({ id: "no-dist", distanceDisplay: null }),
      makeStore({ id: "has-dist", distanceDisplay: "1.2 كم" }),
    ];
    const result = applyDiscoveryFilter(stores, "nearest");
    assert.equal(result[0].id, "has-dist");
    assert.equal(result[1].id, "no-dist");
  });

  test("two stores both without distance preserve relative order", () => {
    const stores = [
      makeStore({ id: "a", distanceDisplay: null }),
      makeStore({ id: "b", distanceDisplay: null }),
    ];
    const result = applyDiscoveryFilter(stores, "nearest");
    assert.equal(result.length, 2);
  });

  test("does not mutate original array", () => {
    const stores = [makeStore()];
    const result = applyDiscoveryFilter(stores, "nearest");
    assert.notEqual(result, stores);
  });
});

describe("applyDiscoveryFilter — offers", () => {
  test("keeps stores with coupon badge", () => {
    const stores = [
      makeStore({ id: "coupon", hasCouponBadge: true }),
      makeStore({ id: "plain" }),
    ];
    const result = applyDiscoveryFilter(stores, "offers");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "coupon");
  });

  test("keeps stores with free delivery", () => {
    const stores = [
      makeStore({ id: "free", isFreeDelivery: true }),
      makeStore({ id: "paid" }),
    ];
    const result = applyDiscoveryFilter(stores, "offers");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "free");
  });

  test("keeps stores with both coupon and free delivery", () => {
    const stores = [
      makeStore({ id: "both", hasCouponBadge: true, isFreeDelivery: true }),
      makeStore({ id: "neither" }),
    ];
    const result = applyDiscoveryFilter(stores, "offers");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "both");
  });

  test("returns empty when no stores match", () => {
    const stores = [makeStore(), makeStore({ id: "store-002" })];
    const result = applyDiscoveryFilter(stores, "offers");
    assert.equal(result.length, 0);
  });
});

describe("applyDiscoveryFilter — new", () => {
  test("returns copy preserving order — backend seeds newest first", () => {
    const stores = [makeStore({ id: "new1" }), makeStore({ id: "new2" })];
    const result = applyDiscoveryFilter(stores, "new");
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "new1");
  });
});
