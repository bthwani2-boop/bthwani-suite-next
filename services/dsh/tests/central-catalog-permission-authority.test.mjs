import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../frontend/catalog/central-catalog.permissions.ts", import.meta.url),
  "utf8",
);

test("catalog UI authorization consumes Identity permission claims exclusively", () => {
  assert.match(source, /hasServiceControlPanelPermission/);
  assert.match(source, /hasServiceControlPanelPermission\(identity, "dsh", permission\)/);
  // Operator role must not be expanded locally anymore — all claims must arrive from Identity.
  assert.doesNotMatch(source, /identityOrFallbackRole/);
});

test("catalog UI permission vocabulary includes backend assortment and seed actions", () => {
  assert.match(source, /"catalog\.assortment\.read"/);
  assert.match(source, /"catalog\.assortment\.manage"/);
  assert.match(source, /"catalog\.seed\.read"/);
});

test("catalog UI does not expand any local role to access — deny by default", () => {
  assert.doesNotMatch(source, /actorRole === "admin"/);
  assert.doesNotMatch(source, /actorRole === "staff"/);
  assert.doesNotMatch(source, /partnerAllowed/);
  assert.doesNotMatch(source, /fieldAllowed/);
  assert.doesNotMatch(source, /return identityOrFallbackRole === "operator"/);
});
