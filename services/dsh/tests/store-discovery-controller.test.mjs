import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  applyStoreDiscoveryFilter,
  loadStoreDiscovery,
  withStoreDiscoveryFilter,
} = await import(
  "../dist/services/dsh/frontend/shared/store/store-discovery.controller-core.js"
);
const {
  emptyState,
  errorState,
  serviceUnavailableState,
  successState,
} = await import(
  "../dist/services/dsh/frontend/shared/store/store-discovery.states.js"
);

const store = (id, distanceKm) => ({
  id,
  displayName: id,
  cityCode: "sana",
  serviceAreaCode: "haddah",
  locationLabel: "حدة",
  isOpen: true,
  isServiceable: true,
  ratingLabel: "4.5",
  ratingAverage: 4.5,
  etaLabel: "20 دقيقة",
  heroImageSource: null,
  logoImageSource: null,
  statusBadge: null,
  isFreeDelivery: false,
  placeholderEmoji: "🏪",
  placeholderTone: "brandAction",
  deliveryModeLabels: ["توصيل"],
  distanceLabel: `${distanceKm} كم`,
  distanceKm,
  followerCountLabel: "10",
  hasProBadge: false,
  hasCouponBadge: false,
  pointsMultiplier: null,
  isPopular: false,
});

describe("store discovery controller core", () => {
  test("publishes loading then success", async () => {
    const published = [];
    const result = successState([store("s1", 2)], 1, 20, 0);
    await loadStoreDiscovery(async () => result, (state) => published.push(state));
    assert.deepEqual(published.map((state) => state.kind), ["loading", "success"]);
  });

  test("preserves empty, error, and service unavailable outcomes", async () => {
    for (const expected of [
      emptyState(),
      errorState("failed"),
      serviceUnavailableState(),
    ]) {
      const published = [];
      await loadStoreDiscovery(async () => expected, (state) => published.push(state));
      assert.equal(published.at(-1).kind, expected.kind);
    }
  });

  test("sorts nearest stores without mutating the source order", () => {
    const stores = [store("far", 8), store("near", 1), store("mid", 3)];
    assert.deepEqual(
      applyStoreDiscoveryFilter(stores, "nearest").map((item) => item.id),
      ["near", "mid", "far"],
    );
    assert.deepEqual(stores.map((item) => item.id), ["far", "near", "mid"]);
  });

  test("returns a filtered success state without changing non-success states", () => {
    const success = successState([store("s1", 2), store("s2", 1)], 2, 20, 0);
    const filtered = withStoreDiscoveryFilter(success, "nearest");
    assert.equal(filtered.kind, "success");
    assert.deepEqual(filtered.stores.map((item) => item.id), ["s2", "s1"]);
    const error = errorState("failed");
    assert.equal(withStoreDiscoveryFilter(error, "all"), error);
  });
});
