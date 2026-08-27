import { describe, test } from "node:test";
import assert from "node:assert/strict";

const { HOME_DISCOVERY_INITIAL_FILTER } = await import(
  "../dist/services/dsh/frontend/shared/home-discovery/home-discovery.controller-core.js"
);
describe("home discovery controller core", () => {
  test("uses all as the initial filter", () => {
    assert.equal(HOME_DISCOVERY_INITIAL_FILTER, "all");
  });
});
