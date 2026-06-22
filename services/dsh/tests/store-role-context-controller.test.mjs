import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  loadStoreRoleContext,
  toStoreRoleStatePresentation,
} = await import(
  "../dist/frontend/shared/store/store-role-context.controller-core.js"
);

const detail = {
  id: "store-1",
  displayName: "متجر الاختبار",
  category: "grocery",
  categoryLabel: "بقالة",
  status: "active",
  isVisible: true,
  cityCode: "sana",
  serviceAreaCode: "haddah",
  serviceabilityStatus: "serviceable",
  deliveryModes: ["delivery", "pickup"],
  isOpen: true,
  isServiceable: true,
  ratingAverage: 4.5,
  ratingCount: 10,
  heroImageUrl: "http://localhost:59000/store/hero.png",
  logoUrl: "http://localhost:59000/store/logo.png",
  hasProBadge: false,
  hasCouponBadge: false,
  deliveryEtaMin: 15,
  deliveryEtaMax: 30,
  isFreeDelivery: false,
  isPopular: true,
  pointsMultiplier: null,
  createdAt: "2026-06-22T00:00:00Z",
  updatedAt: "2026-06-22T00:00:00Z",
};

describe("store role context controller core", () => {
  test("publishes loading then all role-specific store contexts", async () => {
    const published = [];
    await loadStoreRoleContext(
      async () => ({
        kind: "success",
        rows: [detail],
        total: 1,
        limit: 1,
        offset: 0,
      }),
      async () => ({ kind: "success", detail }),
      (state) => published.push(state),
    );

    assert.deepEqual(published.map((state) => state.kind), [
      "loading",
      "success",
    ]);
    const success = published.at(-1);
    assert.equal(success.partner.store.id, detail.id);
    assert.equal(success.field.store.id, detail.id);
    assert.equal(success.captain.store.id, detail.id);
    assert.equal(success.captain.pickupEnabled, true);
    assert.equal(success.partner.checks.every((check) => check.ready), true);
  });

  test("uses storeId directly when provided without calling fetchList", async () => {
    const published = [];
    let fetchListCalled = false;
    await loadStoreRoleContext(
      async () => {
        fetchListCalled = true;
        return {
          kind: "success",
          rows: [],
          total: 0,
          limit: 1,
          offset: 0,
        };
      },
      async (id) => {
        assert.equal(id, "store-override-id");
        return { kind: "success", detail: { ...detail, id } };
      },
      (state) => published.push(state),
      {
        storeId: "store-override-id",
        actorRole: "partner",
        contextMode: "readiness",
      }
    );

    assert.equal(fetchListCalled, false);
    assert.deepEqual(published.map((state) => state.kind), [
      "loading",
      "success",
    ]);
    const success = published.at(-1);
    assert.equal(success.partner.store.id, "store-override-id");
  });

  test("maps list empty, permission, unavailable, and error states", async () => {
    for (const expected of [
      { kind: "empty" },
      { kind: "permission_denied", statusCode: 403 },
      { kind: "service_unavailable" },
      { kind: "error", message: "failed" },
    ]) {
      const published = [];
      await loadStoreRoleContext(
        async () => expected,
        async () => ({ kind: "success", detail }),
        (state) => published.push(state),
      );
      assert.deepEqual(published.at(-1), expected);
    }
  });

  test("maps missing detail to empty and preserves detail failures", async () => {
    const list = async () => ({
      kind: "success",
      rows: [detail],
      total: 1,
      limit: 1,
      offset: 0,
    });
    for (const [detailState, expected] of [
      [{ kind: "not_found" }, { kind: "empty" }],
      [
        { kind: "permission_denied", statusCode: 401 },
        { kind: "permission_denied", statusCode: 401 },
      ],
      [{ kind: "error", message: "detail failed" }, { kind: "error", message: "detail failed" }],
    ]) {
      const published = [];
      await loadStoreRoleContext(
        list,
        async () => detailState,
        (state) => published.push(state),
      );
      assert.deepEqual(published.at(-1), expected);
    }
  });

  test("derives surface-neutral state presentation and retry policy", () => {
    const labels = {
      loading: "تحميل",
      empty: "فارغ",
      error: "خطأ",
    };
    assert.deepEqual(toStoreRoleStatePresentation({ kind: "loading" }, labels), {
      title: "تحميل",
      loading: true,
      retryable: false,
    });
    assert.equal(
      toStoreRoleStatePresentation({ kind: "service_unavailable" }, labels)
        .retryable,
      true,
    );
    assert.equal(
      toStoreRoleStatePresentation(
        { kind: "permission_denied", statusCode: 403 },
        labels,
      ).retryable,
      false,
    );
  });
});
