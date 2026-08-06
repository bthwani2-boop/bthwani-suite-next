import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function listCodeFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listCodeFiles(absolute));
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

test("DSH frontend does not own fixed financial or delivery policy truth", () => {
  const retiredStub = path.join(
    repoRoot,
    "services/dsh/frontend/shared/checkout/dsh-client-binding.contracts.ts",
  );
  assert.equal(
    fs.existsSync(retiredStub),
    false,
    "retired DSH delivery/commission authority stub must not return",
  );

  const dshFrontend = path.join(repoRoot, "services/dsh/frontend");
  for (const file of listCodeFiles(dshFrontend)) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /\bcommissionRate\s*:\s*\d+(?:\.\d+)?\b/,
      `${path.relative(repoRoot, file)} contains a fixed frontend commission rate`,
    );
  }
});

test("WLT DSH-facing transport has one canonical implementation", () => {
  const root = path.join(repoRoot, "services/wlt/frontend/shared/dsh");
  for (const file of listCodeFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:from\s+["'][^"']*\/dsh-http\/|require\(["'][^"']*\/dsh-http\/)/,
      `${path.relative(repoRoot, file)} imports the retired dsh-http transport`,
    );
  }
});

test("named WLT financial records and lifecycle states come from OpenAPI", () => {
  const boundary = read(
    "services/wlt/frontend/shared/dsh/finance-boundary/wlt-dsh-boundary.types.ts",
  );
  for (const marker of [
    'components["schemas"]["PaymentStatus"]',
    'components["schemas"]["RefundStatus"]',
    'components["schemas"]["GovernedRefund"]',
    'components["schemas"]["SettlementListItem"]',
    'components["schemas"]["CodRecord"]',
    'components["schemas"]["CommissionStatus"]',
    'components["schemas"]["Commission"]',
    'components["schemas"]["LedgerEntry"]',
    'components["schemas"]["PaymentSession"]',
  ]) {
    assert.ok(boundary.includes(marker), `missing generated WLT alias: ${marker}`);
  }

  for (const forbidden of [
    /export type WltRefundStatus\s*=\s*(?:\r?\n\s*)?\|/,
    /export type WltCommissionStatus\s*=\s*(?:\r?\n\s*)?\|/,
    /export type WltDshRefundReference\s*=\s*\{/,
    /export type WltDshCommissionReference\s*=\s*\{/,
    /export type WltDshLedgerEntry\s*=\s*\{/,
    /export type WltDshPaymentSessionReference\s*=\s*\{/,
  ]) {
    assert.doesNotMatch(boundary, forbidden);
  }

  const commissionApi = read(
    "services/wlt/frontend/shared/dsh/commissions/commission.api.ts",
  );
  assert.match(commissionApi, /@bthwani\/wlt-openapi/);
  assert.doesNotMatch(commissionApi, /export type Commission\s*=\s*\{/);
  assert.doesNotMatch(commissionApi, /export type CommissionDetail\s*=\s*\{/);

  const reconciliationApi = read(
    "services/wlt/frontend/shared/dsh/finance/cod-reconciliation.api.ts",
  );
  assert.match(reconciliationApi, /@bthwani\/wlt-openapi/);
  assert.doesNotMatch(
    reconciliationApi,
    /export type CodReconciliationCase\s*=\s*\{/,
  );

  const walletApi = read(
    "services/wlt/frontend/shared/dsh/actor-wallet/actor-wallet.api.ts",
  );
  assert.match(walletApi, /components\["schemas"\]\["LedgerEntry"\]/);
  assert.doesNotMatch(
    walletApi,
    /export type RepresentativeLedgerEntry\s*=\s*\{/,
  );
});
