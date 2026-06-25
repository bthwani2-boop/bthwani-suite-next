import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  loadingState,
  emptyState,
  errorState,
  serviceUnavailableState,
  successState,
} = await import("../dist/frontend/shared/store/store-discovery.states.js");

describe("state constructors", () => {
  test("loadingState returns kind=loading", () => {
    assert.deepEqual(loadingState(), { kind: "loading" });
  });

  test("emptyState returns kind=empty", () => {
    assert.deepEqual(emptyState(), { kind: "empty" });
  });

  test("errorState returns kind=error with message", () => {
    const s = errorState("something went wrong");
    assert.equal(s.kind, "error");
    assert.equal(s.message, "something went wrong");
  });

  test("serviceUnavailableState returns kind=service_unavailable", () => {
    assert.deepEqual(serviceUnavailableState(), { kind: "service_unavailable" });
  });
});

describe("successState", () => {
  const stores = [
    { id: "s1", slug: "a", displayName: "A", cityCode: "c", serviceAreaCode: "sa",
      isOpen: true, isServiceable: true, ratingLabel: null, etaLabel: null,
      heroImageUrl: null, logoUrl: null, statusBadge: null },
  ];

  test("returns success when stores not empty", () => {
    const s = successState(stores, 1, 20, 0);
    assert.equal(s.kind, "success");
    assert.equal(s.total, 1);
    assert.equal(s.limit, 20);
    assert.equal(s.offset, 0);
  });

  test("returns empty when stores empty and offset=0", () => {
    const s = successState([], 0, 20, 0);
    assert.equal(s.kind, "empty");
  });

  test("returns success when stores empty but offset>0 (paginated)", () => {
    const s = successState([], 5, 20, 20);
    assert.equal(s.kind, "success");
    assert.equal(s.total, 5);
    assert.equal(s.offset, 20);
  });
});

describe("store discovery API state classification", async () => {
  const {
    classifyStoreDiscoveryError,
    normalizeStoreListResponse,
  } = await import("../dist/frontend/shared/store/store-discovery.api.js");

  test("maps an empty first page to empty", () => {
    const state = normalizeStoreListResponse({
      stores: [],
      pagination: { total: 0, limit: 20, offset: 0 },
    });
    assert.equal(state.kind, "empty");
  });

  test("maps network and 503 failures to service_unavailable", () => {
    assert.equal(
      classifyStoreDiscoveryError({ kind: "network", message: "ECONNREFUSED" }).kind,
      "service_unavailable",
    );
    assert.equal(
      classifyStoreDiscoveryError({ kind: "http", status: 503 }).kind,
      "service_unavailable",
    );
  });

  test("keeps contract and non-503 HTTP failures as error", () => {
    assert.equal(
      classifyStoreDiscoveryError({ kind: "http", status: 500 }).kind,
      "error",
    );
    assert.equal(
      normalizeStoreListResponse({
        stores: [{}],
        pagination: { total: 1, limit: 20, offset: 0 },
      }).kind,
      "error",
    );
  });
});
