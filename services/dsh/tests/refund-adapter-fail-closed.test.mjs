import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const adapterPath = path.join(
  repositoryRoot,
  "services/dsh/frontend/shared/finance-wlt-link/wlt-refund/wlt-refund.api.ts",
);

function readAdapter() {
  return fs.readFileSync(adapterPath, "utf8");
}

test("refund adapter rejects unknown financial statuses instead of coercing them", () => {
  const source = readAdapter();

  assert.match(source, /default:\s*\n\s*return invalidRefundResponse\(/);
  assert.doesNotMatch(source, /default:\s*\n\s*return ["']requested["']/);
});

test("refund adapter validates critical response fields before rendering", () => {
  const source = readAdapter();

  for (const invariant of [
    /typeof raw\.id !== ["']string["']/,
    /typeof raw\.orderId !== ["']string["']/,
    /Number\.isSafeInteger\(raw\.amountMinorUnits\)/,
    /typeof raw\.currency !== ["']string["']/,
    /raw\.resolvedAt !== null && typeof raw\.resolvedAt !== ["']string["']/,
    /Array\.isArray\(body\.refunds\)/,
    /Array\.isArray\(body\.auditEvents\)/,
  ]) {
    assert.match(source, invariant);
  }
});
