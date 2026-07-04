import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  STORE_ADMIN_PAGE_LIMIT,
  createStoreAdminInitialFilters,
  deriveStoreAdminView,
  loadStoreAdminDetail,
  loadStoreAdminList,
  nextStoreAdminOffset,
  previousStoreAdminOffset,
} = await import(
  "../dist/services/dsh/frontend/shared/store/store-admin.controller-core.js"
);
const {
  adminEmptyState,
  adminErrorState,
  adminPermissionDeniedState,
  adminServiceUnavailableState,
  adminSuccessState,
} = await import(
  "../dist/services/dsh/frontend/shared/store/store-admin.view-model.js"
);

const row = (id, overrides = {}) => ({
  id,
  displayName: id,
  category: "grocery",
  categoryLabel: "بقالة",
  status: "active",
  isVisible: true,
  cityCode: "sana",
  serviceAreaCode: "haddah",
  serviceabilityStatus: "serviceable",
  deliveryModes: ["delivery"],
  isOpen: true,
  isServiceable: true,
  ratingAverage: 4.5,
  ratingCount: 10,
  heroImageUrl: null,
  hasProBadge: false,
  hasCouponBadge: false,
  ...overrides,
});

describe("store admin controller core", () => {
  test("publishes loading then success with canonical pagination", async () => {
    const published = [];
    let received;
    await loadStoreAdminList(
      20,
      async (params) => {
        received = params;
        return adminSuccessState([row("s1")], 41, 20, 20);
      },
      (state) => published.push(state),
    );
    assert.deepEqual(received, { limit: STORE_ADMIN_PAGE_LIMIT, offset: 20 });
    assert.deepEqual(published.map((state) => state.kind), ["loading", "success"]);
  });

  test("preserves empty, error, unavailable, and permission outcomes", async () => {
    for (const expected of [
      adminEmptyState(),
      adminErrorState("failed"),
      adminServiceUnavailableState(),
      adminPermissionDeniedState(403),
    ]) {
      const published = [];
      await loadStoreAdminList(0, async () => expected, (state) =>
        published.push(state),
      );
      assert.equal(published.at(-1).kind, expected.kind);
    }
  });

  test("derives filters, KPI, and pagination", () => {
    const state = adminSuccessState(
      [row("visible"), row("hidden", { isVisible: false, isOpen: false })],
      45,
      20,
      0,
    );
    const view = deriveStoreAdminView(
      state,
      { ...createStoreAdminInitialFilters(), isVisible: true },
      0,
    );
    assert.deepEqual(view.visibleRows.map((item) => item.id), ["visible"]);
    assert.deepEqual(view.kpi, {
      total: 45,
      visible: 1,
      open: 1,
      categoryCount: 1,
    });
    assert.equal(view.hasNextPage, true);
    assert.equal(view.hasPrevPage, false);
  });

  test("moves pagination offsets safely", () => {
    assert.equal(nextStoreAdminOffset(0), 20);
    assert.equal(previousStoreAdminOffset(20), 0);
    assert.equal(previousStoreAdminOffset(0), 0);
  });

  test("loads and clears store detail selection", async () => {
    const published = [];
    const detail = { kind: "not_found" };
    await loadStoreAdminDetail("missing", async () => detail, (state) =>
      published.push(state),
    );
    assert.deepEqual(published.map((state) => state?.kind), [
      "loading",
      "not_found",
    ]);
    await loadStoreAdminDetail(null, async () => detail, (state) =>
      published.push(state),
    );
    assert.equal(published.at(-1), null);
  });
});
