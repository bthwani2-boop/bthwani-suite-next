import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("catalog UI roots delegate runtime logic to shared", () => {
  for (const file of [
    "frontend/app-client/catalog/PublishedCatalogScreen.tsx",
    "frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx",
    "frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
  ]) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /process\.env/);
  }
});

test("DSH-004/005 contract-draft paths are in dsh.openapi.yaml and not registered at runtime", () => {
  const contract = fs.readFileSync(new URL("../contracts/dsh.openapi.yaml", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /x-contract-state: CONTRACT_DRAFT/);
  assert.match(contract, /evaluateDshCartServiceability/);
  assert.match(contract, /createDshCheckoutIntentDraft/);
  assert.doesNotMatch(router, /checkout-intents|payment-callbacks/);
  assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i);
});
