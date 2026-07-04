import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  adminLoadingState,
  adminEmptyState,
  adminErrorState,
  adminServiceUnavailableState,
  adminPermissionDeniedState,
  adminSuccessState,
  ADMIN_FILTERS_EMPTY,
} = await import("../dist/services/dsh/frontend/shared/store/store-admin.view-model.js");

const makeRow = (overrides = {}) => ({
  id: "store-001",
  displayName: "Test Store",
  category: "restaurant",
  categoryLabel: "مطعم",
  status: "active",
  isVisible: true,
  cityCode: "sana",
  serviceAreaCode: "haddah",
  serviceabilityStatus: "serviceable",
  deliveryModes: ["delivery"],
  isOpen: true,
  isServiceable: true,
  ratingAverage: 4.5,
  ratingCount: 100,
  heroImageUrl: null,
  ...overrides,
});

describe("admin state constructors", () => {
  test("adminLoadingState returns kind=loading", () => {
    assert.deepEqual(adminLoadingState(), { kind: "loading" });
  });

  test("adminEmptyState returns kind=empty", () => {
    assert.deepEqual(adminEmptyState(), { kind: "empty" });
  });

  test("adminErrorState returns kind=error with message", () => {
    const s = adminErrorState("something failed");
    assert.equal(s.kind, "error");
    assert.equal(s.message, "something failed");
  });

  test("adminServiceUnavailableState returns kind=service_unavailable", () => {
    assert.deepEqual(adminServiceUnavailableState(), { kind: "service_unavailable" });
  });

  test("adminPermissionDeniedState 401 returns kind=permission_denied statusCode=401", () => {
    const s = adminPermissionDeniedState(401);
    assert.equal(s.kind, "permission_denied");
    assert.equal(s.statusCode, 401);
  });

  test("adminPermissionDeniedState 403 returns kind=permission_denied statusCode=403", () => {
    const s = adminPermissionDeniedState(403);
    assert.equal(s.kind, "permission_denied");
    assert.equal(s.statusCode, 403);
  });
});

describe("adminSuccessState", () => {
  test("returns success when rows not empty at offset 0", () => {
    const s = adminSuccessState([makeRow()], 1, 20, 0);
    assert.equal(s.kind, "success");
    assert.equal(s.total, 1);
    assert.equal(s.limit, 20);
    assert.equal(s.offset, 0);
  });

  test("returns empty when rows empty and offset=0", () => {
    const s = adminSuccessState([], 0, 20, 0);
    assert.equal(s.kind, "empty");
  });

  test("returns success when rows empty but offset>0 (paginated beyond)", () => {
    const s = adminSuccessState([], 5, 20, 20);
    assert.equal(s.kind, "success");
    assert.equal(s.total, 5);
    assert.equal(s.offset, 20);
  });
});

describe("ADMIN_FILTERS_EMPTY", () => {
  test("all fields are null", () => {
    assert.equal(ADMIN_FILTERS_EMPTY.status, null);
    assert.equal(ADMIN_FILTERS_EMPTY.isVisible, null);
    assert.equal(ADMIN_FILTERS_EMPTY.category, null);
    assert.equal(ADMIN_FILTERS_EMPTY.search, null);
  });
});
