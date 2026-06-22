import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  toAdminTableRow,
  toAdminDetail,
  toAdminKpiSummary,
  applyAdminFilters,
} = await import("../dist/frontend/shared/store/store-admin.view-model.js");

const makeDto = (overrides = {}) => ({
  id: "store-001",
  slug: "test-store",
  displayName: "Test Store",
  status: "active",
  cityCode: "sana",
  serviceAreaCode: "haddah",
  serviceability: { status: "serviceable" },
  ratingAverage: 4.5,
  ratingCount: 200,
  deliveryEtaMin: 20,
  deliveryEtaMax: 40,
  isVisible: true,
  heroImageUrl: null,
  logoUrl: null,
  category: "restaurant",
  categoryLabel: "مطعم",
  deliveryModes: ["delivery", "pickup"],
  isFreeDelivery: true,
  distanceKm: 2.1,
  followerCount: 3100,
  hasProBadge: true,
  hasCouponBadge: false,
  pointsMultiplier: 2,
  isPopular: true,
  ...overrides,
});

const makeDetailDto = (overrides = {}) => ({
  ...makeDto(),
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  ...overrides,
});

describe("toAdminTableRow", () => {
  test("active store maps isOpen=true", () => {
    const row = toAdminTableRow(makeDto());
    assert.equal(row.isOpen, true);
  });

  test("inactive store maps isOpen=false", () => {
    const row = toAdminTableRow(makeDto({ status: "inactive" }));
    assert.equal(row.isOpen, false);
  });

  test("serviceable store maps isServiceable=true", () => {
    const row = toAdminTableRow(makeDto());
    assert.equal(row.isServiceable, true);
  });

  test("limited serviceability maps isServiceable=true", () => {
    const row = toAdminTableRow(makeDto({ serviceability: { status: "limited" } }));
    assert.equal(row.isServiceable, true);
  });

  test("out_of_area serviceability maps isServiceable=false", () => {
    const row = toAdminTableRow(makeDto({ serviceability: { status: "out_of_area" } }));
    assert.equal(row.isServiceable, false);
  });

  test("isVisible is preserved from DTO", () => {
    const visible = toAdminTableRow(makeDto({ isVisible: true }));
    const hidden = toAdminTableRow(makeDto({ isVisible: false }));
    assert.equal(visible.isVisible, true);
    assert.equal(hidden.isVisible, false);
  });

  test("heroImageUrl is string or null — not { uri } wrapper", () => {
    const row = toAdminTableRow(makeDto({ heroImageUrl: "http://localhost:59000/img/a.jpg" }));
    assert.equal(typeof row.heroImageUrl, "string");
    assert.ok(!("uri" in Object(row.heroImageUrl)));
  });

  test("deliveryModes array is copied from DTO", () => {
    const row = toAdminTableRow(makeDto());
    assert.deepEqual([...row.deliveryModes], ["delivery", "pickup"]);
  });

  test("no financial fields in row", () => {
    const row = toAdminTableRow(makeDto());
    assert.equal("paymentStatus" in row, false);
    assert.equal("settlementStatus" in row, false);
    assert.equal("refundAmount" in row, false);
    assert.equal("payoutAmount" in row, false);
    assert.equal("ledger" in row, false);
    assert.equal("commission" in row, false);
  });
});

describe("toAdminDetail", () => {
  test("includes all table row fields plus detail fields", () => {
    const detail = toAdminDetail(makeDetailDto());
    assert.equal(detail.id, "store-001");
    assert.equal(detail.createdAt, "2026-01-01T00:00:00Z");
    assert.equal(detail.updatedAt, "2026-06-01T00:00:00Z");
    assert.equal(detail.isFreeDelivery, true);
    assert.equal(detail.hasProBadge, true);
    assert.equal(detail.isPopular, true);
  });

  test("detail view-model contains no mutation callbacks; actions belong to the controller contract", () => {
    const detail = toAdminDetail(makeDetailDto());
    assert.equal("createStore" in detail, false);
    assert.equal("editStore" in detail, false);
    assert.equal("deleteStore" in detail, false);
    assert.equal("payout" in detail, false);
    assert.equal("refund" in detail, false);
  });
});

describe("toAdminKpiSummary", () => {
  test("counts totals correctly", () => {
    const rows = [
      makeDto({ status: "active", isVisible: true, category: "restaurant" }),
      makeDto({ id: "s2", status: "inactive", isVisible: false, category: "grocery" }),
      makeDto({ id: "s3", status: "active", isVisible: true, category: "restaurant" }),
    ].map(toAdminTableRow);

    const kpi = toAdminKpiSummary(rows, 10);
    assert.equal(kpi.total, 10);
    assert.equal(kpi.visible, 2);
    assert.equal(kpi.open, 2);
    assert.equal(kpi.categoryCount, 2);
  });

  test("empty rows produce zero counts except total", () => {
    const kpi = toAdminKpiSummary([], 5);
    assert.equal(kpi.total, 5);
    assert.equal(kpi.visible, 0);
    assert.equal(kpi.open, 0);
    assert.equal(kpi.categoryCount, 0);
  });
});

describe("applyAdminFilters", () => {
  const rows = [
    makeDto({ id: "s1", status: "active", isVisible: true, category: "restaurant", displayName: "البيت" }),
    makeDto({ id: "s2", status: "inactive", isVisible: false, category: "grocery", displayName: "السوق" }),
    makeDto({ id: "s3", status: "active", isVisible: true, category: "pharmacy", displayName: "الصيدلية" }),
  ].map(toAdminTableRow);

  const noFilters = { status: null, isVisible: null, category: null, search: null };

  test("no filters returns all rows", () => {
    const result = applyAdminFilters(rows, noFilters);
    assert.equal(result.length, 3);
  });

  test("status filter narrows results", () => {
    const result = applyAdminFilters(rows, { ...noFilters, status: "active" });
    assert.equal(result.length, 2);
    assert.ok(result.every((r) => r.status === "active"));
  });

  test("isVisible filter narrows results", () => {
    const visible = applyAdminFilters(rows, { ...noFilters, isVisible: true });
    assert.equal(visible.length, 2);
    const hidden = applyAdminFilters(rows, { ...noFilters, isVisible: false });
    assert.equal(hidden.length, 1);
  });

  test("category filter narrows results", () => {
    const result = applyAdminFilters(rows, { ...noFilters, category: "grocery" });
    assert.equal(result.length, 1);
    assert.equal(result[0].category, "grocery");
  });

  test("search filter matches displayName", () => {
    const result = applyAdminFilters(rows, { ...noFilters, search: "البيت" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "s1");
  });

  test("combined filters apply all predicates", () => {
    const result = applyAdminFilters(rows, {
      status: "active",
      isVisible: true,
      category: null,
      search: null,
    });
    assert.equal(result.length, 2);
  });

  test("pagination summary can be computed from filtered result length", () => {
    const filtered = applyAdminFilters(rows, { ...noFilters, status: "active" });
    assert.equal(filtered.length, 2);
  });
});
