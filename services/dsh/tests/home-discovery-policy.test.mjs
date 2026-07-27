import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  applyDiscoveryFilter,
  canViewHomeDiscovery,
  isDiscoveryFilterOperational,
} = await import(
  "../dist/services/dsh/frontend/shared/home-discovery/home-discovery.policy.js"
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
  distanceKm: null,
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

describe("discovery filter operational truth", () => {
  test("hides favorites until a persistent authenticated contract exists", () => {
    assert.equal(isDiscoveryFilterOperational("favorites"), false);
    assert.equal(isDiscoveryFilterOperational("all"), true);
    assert.equal(isDiscoveryFilterOperational("nearest"), true);
    assert.equal(isDiscoveryFilterOperational("offers"), true);
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

describe("applyDiscoveryFilter — unsupported favorites", () => {
  test("fails safe by preserving governed stores instead of implying persisted favorites", () => {
    const stores = [makeStore(), makeStore({ id: "store-002" })];
    const result = applyDiscoveryFilter(stores, "favorites");
    assert.deepEqual(result.map((store) => store.id), ["store-001", "store-002"]);
    assert.notEqual(result, stores);
  });
});

describe("applyDiscoveryFilter — nearest", () => {
  test("sorts by numeric distance when available", () => {
    const stores = [
      makeStore({ id: "far", distanceKm: 8, distanceDisplay: "8 كم" }),
      makeStore({ id: "near", distanceKm: 1.2, distanceDisplay: "1.2 كم" }),
    ];
    const result = applyDiscoveryFilter(stores, "nearest");
    assert.deepEqual(result.map((store) => store.id), ["near", "far"]);
  });

  test("stores with distance come before stores without", () => {
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
    assert.deepEqual(result.map((store) => store.id), ["a", "b"]);
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
    assert.deepEqual(result.map((store) => store.id), ["coupon"]);
  });

  test("keeps stores with free delivery", () => {
    const stores = [
      makeStore({ id: "free", isFreeDelivery: true }),
      makeStore({ id: "paid" }),
    ];
    const result = applyDiscoveryFilter(stores, "offers");
    assert.deepEqual(result.map((store) => store.id), ["free"]);
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
    assert.deepEqual(result.map((store) => store.id), ["new1", "new2"]);
    assert.notEqual(result, stores);
  });
});
