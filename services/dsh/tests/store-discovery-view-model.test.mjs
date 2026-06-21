import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { toCardViewModel, toDetailViewModel } = await import(
  "../dist/frontend/shared/store-discovery/store-discovery.view-model.js"
);

const makeDto = (overrides = {}) => ({
  id: "store-001",
  slug: "test-store",
  displayName: "Test Store",
  status: "active",
  cityCode: "city-a",
  serviceAreaCode: "area-a",
  serviceability: { status: "serviceable" },
  ratingAverage: 4.5,
  ratingCount: 200,
  deliveryEtaMin: 20,
  deliveryEtaMax: 40,
  isVisible: true,
  heroImageUrl: null,
  logoUrl: null,
  category: "grocery",
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

describe("toCardViewModel", () => {
  test("active serviceable store is open and serviceable", () => {
    const vm = toCardViewModel(makeDto());
    assert.equal(vm.isOpen, true);
    assert.equal(vm.isServiceable, true);
  });

  test("inactive store is not open", () => {
    const vm = toCardViewModel(makeDto({ status: "inactive" }));
    assert.equal(vm.isOpen, false);
  });

  test("temporarily_closed produces statusBadge", () => {
    const vm = toCardViewModel(makeDto({ status: "temporarily_closed" }));
    assert.equal(vm.statusBadge, "مغلق مؤقتاً");
  });

  test("limited serviceability produces statusBadge", () => {
    const vm = toCardViewModel(makeDto({ serviceability: { status: "limited" } }));
    assert.equal(vm.statusBadge, "توصيل محدود");
    assert.equal(vm.isServiceable, true);
  });

  test("out_of_area produces statusBadge", () => {
    const vm = toCardViewModel(makeDto({ serviceability: { status: "out_of_area" } }));
    assert.equal(vm.statusBadge, "خارج نطاق التوصيل");
    assert.equal(vm.isServiceable, false);
  });

  test("rating label rendered when rating present", () => {
    const vm = toCardViewModel(makeDto({ ratingAverage: 4.5, ratingCount: 200 }));
    assert.equal(vm.ratingLabel, "4.5 (200)");
  });

  test("rating label null when no rating", () => {
    const vm = toCardViewModel(makeDto({ ratingAverage: null }));
    assert.equal(vm.ratingLabel, null);
  });

  test("rating label null when ratingCount is 0", () => {
    const vm = toCardViewModel(makeDto({ ratingAverage: 4.2, ratingCount: 0 }));
    assert.equal(vm.ratingLabel, null);
  });

  test("eta label rendered when eta present", () => {
    const vm = toCardViewModel(makeDto({ deliveryEtaMin: 20, deliveryEtaMax: 40 }));
    assert.equal(vm.etaLabel, "20–40 دقيقة");
  });

  test("eta label null when eta absent", () => {
    const vm = toCardViewModel(makeDto({ deliveryEtaMin: null, deliveryEtaMax: null }));
    assert.equal(vm.etaLabel, null);
  });

  test("heroImageSource null when not provided", () => {
    const vm = toCardViewModel(makeDto({ heroImageUrl: undefined }));
    assert.equal(vm.heroImageSource, null);
  });

  test("logoImageSource null when not provided", () => {
    const vm = toCardViewModel(makeDto({ logoUrl: undefined }));
    assert.equal(vm.logoImageSource, null);
  });

  test("commercial card metadata comes from the API DTO", () => {
    const vm = toCardViewModel(makeDto());
    assert.deepEqual(vm.deliveryModeLabels, ["توصيل", "استلام"]);
    assert.equal(vm.isFreeDelivery, true);
    assert.equal(vm.distanceLabel, "2.1 كم");
    assert.equal(vm.hasProBadge, true);
    assert.equal(vm.pointsMultiplier, 2);
    assert.equal(vm.isPopular, true);
  });

  test("display name is not rewritten or inferred by the view-model", () => {
    const vm = toCardViewModel(makeDto({ displayName: "اسم موثوق من API" }));
    assert.equal(vm.displayName, "اسم موثوق من API");
  });
});

describe("toDetailViewModel", () => {
  test("includes all card fields plus timestamps", () => {
    const dto = { ...makeDto(), createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" };
    const vm = toDetailViewModel(dto);
    assert.equal(vm.id, dto.id);
    assert.equal(vm.createdAt, "2026-01-01T00:00:00Z");
    assert.equal(vm.updatedAt, "2026-01-02T00:00:00Z");
  });
});
