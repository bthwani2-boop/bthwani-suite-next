import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  HOME_DISCOVERY_INITIAL_FILTER,
  loadHomeDiscovery,
} = await import(
  "../dist/frontend/shared/home-discovery/home-discovery.controller-core.js"
);
const {
  emptyState,
  errorState,
  serviceUnavailableState,
  successState,
} = await import(
  "../dist/frontend/shared/home-discovery/home-discovery.states.js"
);

const success = () =>
  successState({
    banners: [],
    promos: [],
    filters: [],
    categories: [],
    stores: [],
    pagination: { limit: 20, offset: 0, total: 0 },
    generatedAt: "2026-06-22T00:00:00.000Z",
  });

describe("home discovery controller core", () => {
  test("uses all as the initial filter", () => {
    assert.equal(HOME_DISCOVERY_INITIAL_FILTER, "all");
  });

  test("publishes loading then success", async () => {
    const published = [];
    await loadHomeDiscovery(async () => success(), (state) =>
      published.push(state),
    );
    assert.deepEqual(published.map((state) => state.kind), ["loading", "success"]);
  });

  test("preserves empty, error, and service unavailable outcomes", async () => {
    for (const expected of [
      emptyState(),
      errorState("failed"),
      serviceUnavailableState(),
    ]) {
      const published = [];
      await loadHomeDiscovery(async () => expected, (state) =>
        published.push(state),
      );
      assert.equal(published.at(-1).kind, expected.kind);
    }
  });
});
