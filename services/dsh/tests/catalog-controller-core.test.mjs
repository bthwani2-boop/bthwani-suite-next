import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  resolveCatalogActionError,
  resolveCatalogError,
  shouldLoadAuthenticatedCatalog,
} = await import("../dist/frontend/shared/catalog/catalog.controller-core.js");
const {
  resolveCatalogSubmissionState,
  resolvePartnerCatalogState,
  resolvePublishedCatalogState,
} = await import("../dist/frontend/shared/catalog/catalog.view-model.js");

const catalog = (products = [], categories = []) => ({
  storeId: "store-1",
  categories,
  products,
});

describe("catalog controller core", () => {
  test("loads only authenticated catalog controllers", () => {
    assert.equal(shouldLoadAuthenticatedCatalog("authenticated"), true);
    assert.equal(shouldLoadAuthenticatedCatalog("unauthenticated"), false);
  });

  test("resolves empty and success catalog states", () => {
    assert.equal(resolvePartnerCatalogState(catalog()).kind, "empty");
    assert.equal(resolvePublishedCatalogState(catalog()).kind, "empty");
    assert.equal(
      resolvePublishedCatalogState(catalog([{ id: "p1" }])).kind,
      "success",
    );
    assert.equal(
      resolvePartnerCatalogState(catalog([], [{ id: "c1" }])).kind,
      "success",
    );
  });

  test("resolves submission state", () => {
    assert.equal(resolveCatalogSubmissionState([]).kind, "empty");
    assert.equal(resolveCatalogSubmissionState([{ id: "s1" }]).kind, "success");
  });

  test("classifies permission, conflict, network, and action errors", () => {
    assert.equal(resolveCatalogError({ kind: "http", status: 403 }).kind, "permission_denied");
    assert.equal(resolveCatalogError({ kind: "http", status: 409 }).kind, "error");
    assert.equal(resolveCatalogError({ kind: "network" }).kind, "error");
    assert.equal(resolveCatalogActionError({ status: 409 }), "conflict");
    assert.equal(resolveCatalogActionError({ status: 500 }), "error");
  });
});
