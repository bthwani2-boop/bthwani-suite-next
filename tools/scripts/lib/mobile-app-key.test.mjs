import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeMobileAppKey,
  escapeRegexLiteral,
} from "./mobile-app-key.mjs";

test("mobile manifest keys accept the governed slug vocabulary", () => {
  for (const key of ["app-client", "app-partner", "captain2"]) {
    assert.equal(assertSafeMobileAppKey(key), key);
  }
});

test("mobile manifest keys reject traversal and regex input", () => {
  for (const key of ["../app-client", "app.*", "app(client)", "APP", "app_client", "a/../../b", "a".repeat(65)]) {
    assert.throws(() => assertSafeMobileAppKey(key));
  }
});

test("regex literals are escaped even after vocabulary validation", () => {
  assert.equal(escapeRegexLiteral("app.*[client]"), "app\\.\\*\\[client\\]");
});
