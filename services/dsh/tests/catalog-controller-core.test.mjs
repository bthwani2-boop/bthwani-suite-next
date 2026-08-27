import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  resolveCatalogError,
} = await import("../dist/services/dsh/frontend/shared/catalog/catalog.controller-core.js");
const {
  isPartnerCatalogEmpty,
  resolvePublishedCatalogState,
} = await import("../dist/services/dsh/frontend/shared/catalog/catalog.view-model.js");

const catalog = (products = [], categories = []) => ({
  storeId: "store-1",
  categories,
  products,
});

describe("catalog controller core", () => {
  test("resolves empty and success catalog states", () => {
    assert.equal(isPartnerCatalogEmpty(catalog()), true);
    assert.equal(isPartnerCatalogEmpty(catalog([], [{ id: "c1" }])), false);
    assert.equal(isPartnerCatalogEmpty(catalog([{ id: "p1" }])), false);
    assert.equal(resolvePublishedCatalogState(catalog()).kind, "empty");
    assert.equal(
      resolvePublishedCatalogState(catalog([{ id: "p1" }])).kind,
      "success",
    );
  });

  test("classifies permission, conflict, and network errors", () => {
    assert.equal(resolveCatalogError({ kind: "http", status: 403 }).kind, "permission_denied");
    assert.equal(resolveCatalogError({ kind: "http", status: 409 }).kind, "error");
    assert.equal(resolveCatalogError({ kind: "network" }).kind, "error");
  });
});
