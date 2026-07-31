import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync(
  new URL("../frontend/control-panel/catalogs/CatalogDashboardScreen.tsx", import.meta.url),
  "utf8",
);

test("catalog dashboard authorizes from the authenticated Identity object", () => {
  assert.match(dashboard, /const currentUserIdentity = state\.kind === "authenticated" \? state\.identity : undefined/);
  assert.match(dashboard, /hasCatalogPermission\(currentUserIdentity, "catalog\.taxonomy\.manage"\)/);
  assert.match(dashboard, /hasCatalogPermission\(currentUserIdentity, "catalog\.product\.manage"\)/);
  assert.match(dashboard, /hasCatalogPermission\(currentUserIdentity, "catalog\.media\.manage"\)/);
  assert.doesNotMatch(dashboard, /hasCatalogPermission\(currentUserRole,/);
});

test("catalog audit navigation uses the existing governed workspace", () => {
  assert.match(dashboard, /\{ id: "audit_logs", label: "سجل التدقيق" \}/);
  assert.doesNotMatch(dashboard, /id: "audit_logs"[^\n]*disabled: true/);
  assert.match(dashboard, /router\.push\("\/dsh\/catalogs\/governance"\)/);
  assert.match(dashboard, /CATALOG_AUDIT_AVAILABLE/);
});
