import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../frontend/shared/catalog/central-catalog.permissions.ts", import.meta.url),
  "utf8",
);

test("catalog UI authorization consumes Identity permission claims", () => {
  assert.match(source, /hasServiceControlPanelPermission/);
  assert.match(source, /identityOrFallbackRole\.roles\?\.includes\("operator"\)/);
  assert.match(source, /hasServiceControlPanelPermission\(identityOrFallbackRole, "dsh", permission\)/);
});

test("catalog UI does not expand admin or staff roles locally", () => {
  assert.doesNotMatch(source, /actorRole === "admin"/);
  assert.doesNotMatch(source, /actorRole === "staff"/);
  assert.doesNotMatch(source, /partnerAllowed/);
  assert.doesNotMatch(source, /fieldAllowed/);
  assert.match(source, /return identityOrFallbackRole === "operator"/);
});
