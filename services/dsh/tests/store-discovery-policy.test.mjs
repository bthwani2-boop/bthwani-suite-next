import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import from compiled dist (CJS, importable from ESM)
const {
  validateListQuery,
  rowToSummary,
  rowToDetail,
  isStoreVisibleToClient,
  applyClientVisibilityFilter,
} = await import("../dist/services/dsh/domain/store/store-discovery.policy.js");

const makeRow = (overrides = {}) => ({
  id: "store-001",
  slug: "test-store",
  display_name: "Test Store",
  status: "active",
  city_code: "city-a",
  service_area_code: "area-a",
  serviceability_status: "serviceable",
  rating_average: 4.5,
  rating_count: 100,
  delivery_eta_min: 20,
  delivery_eta_max: 40,
  is_visible: true,
  hero_image_url: null,
  logo_url: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

describe("validateListQuery", () => {
  test("accepts valid query", () => {
    assert.equal(validateListQuery({ limit: 20, offset: 0 }), null);
  });

  test("rejects limit < 1", () => {
    const err = validateListQuery({ limit: 0, offset: 0 });
    assert.match(err, /limit must be between/);
  });

  test("rejects limit > 100", () => {
    const err = validateListQuery({ limit: 101, offset: 0 });
    assert.match(err, /limit must be between/);
  });

  test("rejects negative offset", () => {
    const err = validateListQuery({ limit: 10, offset: -1 });
    assert.match(err, /offset must be/);
  });

  test("rejects invalid status", () => {
    const err = validateListQuery({ limit: 10, offset: 0, status: "bogus" });
    assert.match(err, /invalid status/);
  });

  test("accepts valid status", () => {
    assert.equal(validateListQuery({ limit: 10, offset: 0, status: "active" }), null);
    assert.equal(validateListQuery({ limit: 10, offset: 0, status: "temporarily_closed" }), null);
  });
});

describe("isStoreVisibleToClient", () => {
  test("visible active store", () => {
    assert.equal(isStoreVisibleToClient(makeRow()), true);
  });

  test("invisible store", () => {
    assert.equal(isStoreVisibleToClient(makeRow({ is_visible: false })), false);
  });

  test("inactive store", () => {
    assert.equal(isStoreVisibleToClient(makeRow({ status: "inactive" })), false);
  });
});

describe("applyClientVisibilityFilter", () => {
  test("filters out non-visible stores", () => {
    const rows = [
      makeRow({ id: "s1" }),
      makeRow({ id: "s2", is_visible: false }),
      makeRow({ id: "s3", status: "inactive" }),
      makeRow({ id: "s4" }),
    ];
    const result = applyClientVisibilityFilter(rows);
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((r) => r.id), ["s1", "s4"]);
  });
});

describe("rowToSummary", () => {
  test("maps all fields correctly", () => {
    const row = makeRow();
    const summary = rowToSummary(row);
    assert.equal(summary.id, "store-001");
    assert.equal(summary.displayName, "Test Store");
    assert.equal(summary.cityCode, "city-a");
    assert.equal(summary.serviceAreaCode, "area-a");
    assert.equal(summary.ratingAverage, 4.5);
    assert.equal(summary.ratingCount, 100);
    assert.deepEqual(summary.serviceability, { status: "serviceable" });
    assert.equal(summary.deliveryEtaMin, 20);
    assert.equal(summary.deliveryEtaMax, 40);
    assert.equal(summary.isVisible, true);
  });

  test("null nullable fields pass through", () => {
    const row = makeRow({ rating_average: null, hero_image_url: null, logo_url: null });
    const summary = rowToSummary(row);
    assert.equal(summary.ratingAverage, null);
    assert.equal(summary.heroImageUrl, null);
    assert.equal(summary.logoUrl, null);
  });
});

describe("rowToDetail", () => {
  test("includes ISO timestamp strings", () => {
    const row = makeRow();
    const detail = rowToDetail(row);
    assert.equal(detail.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(detail.updatedAt, "2026-01-02T00:00:00.000Z");
  });
});
