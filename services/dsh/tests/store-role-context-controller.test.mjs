import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  enforceExpectedStoreRole,
  loadStoreRoleContext,
  toStoreRoleExperience,
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
  partnerReadiness: "ready",
  catalogApprovalStatus: "approved",
  marketingVisibility: "visible",
  createdAt: "2026-06-22T00:00:00Z",
  updatedAt: "2026-06-22T00:00:00Z",
  version: 1,
};

describe("store role context controller core", () => {
  test("publishes loading then the identity-scoped store context", async () => {
    const published = [];
    await loadStoreRoleContext(
      async () => ({
        kind: "success",
        actorRole: "partner",
        scope: "own",
        store: detail,
        latestAction: null,
      }),
      (state) => published.push(state),
    );

    assert.deepEqual(published.map((state) => state.kind), ["loading", "success"]);
    const success = published.at(-1);
    assert.equal(success.store.id, detail.id);
    assert.equal(success.actorRole, "partner");
    assert.equal(success.scope, "own");
    const experience = toStoreRoleExperience(success);
    assert.equal(experience.captain.pickupEnabled, true);
    assert.equal(experience.partner.checks.every((check) => check.ready), true);
    assert.equal(
      experience.partner.serviceModesLabel,
      "توصيل المتجر (الشريك)، استلم بنفسك",
    );
  });

  test("preserves empty, permission, unavailable, and error states", async () => {
    for (const expected of [
      { kind: "empty" },
      { kind: "permission_denied", statusCode: 403 },
      { kind: "service_unavailable" },
      { kind: "error", message: "failed" },
    ]) {
      const published = [];
      await loadStoreRoleContext(async () => expected, (state) => published.push(state));
      assert.deepEqual(published.at(-1), expected);
    }
  });

  test("rejects a successful context issued for another role", async () => {
    const success = {
      kind: "success",
      actorRole: "partner",
      scope: "own",
      store: detail,
      latestAction: null,
    };
    assert.deepEqual(enforceExpectedStoreRole(success, "field"), {
      kind: "permission_denied",
      statusCode: 403,
    });
    assert.equal(enforceExpectedStoreRole(success, "partner"), success);

    const published = [];
    await loadStoreRoleContext(async () => success, (state) => published.push(state), "captain");
    assert.deepEqual(published, [
      { kind: "loading" },
      { kind: "permission_denied", statusCode: 403 },
    ]);
  });

  test("derives surface-neutral state presentation and retry policy", () => {
    const labels = { loading: "تحميل", empty: "فارغ", error: "خطأ" };
    assert.deepEqual(toStoreRoleStatePresentation({ kind: "loading" }, labels), {
      title: "تحميل",
      loading: true,
      retryable: false,
    });
    assert.equal(
      toStoreRoleStatePresentation({ kind: "service_unavailable" }, labels).retryable,
      true,
    );
    assert.equal(
      toStoreRoleStatePresentation({ kind: "permission_denied", statusCode: 403 }, labels).retryable,
      false,
    );
  });
});
