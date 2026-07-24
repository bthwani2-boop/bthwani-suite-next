import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const proxy = fs.readFileSync(
  path.join(repoRoot, "apps/control-panel/runtime/src/server/bff-proxy.ts"),
  "utf8",
);

test("control-panel exposes only read-only WLT reference projections", () => {
  assert.match(proxy, /const WLT_BROWSER_REFERENCE_PATHS = new Set/);
  for (const referencePath of [
    "/wlt/references/payment-status",
    "/wlt/references/settlement-status",
    "/wlt/references/refund-status",
    "/wlt/references/wallet-status",
  ]) {
    assert.match(proxy, new RegExp(referencePath.replaceAll("/", "\\/")));
  }
  assert.match(proxy, /service !== "wlt"/);
  assert.match(proxy, /method === "GET"/);
  assert.match(proxy, /BFF_SERVICE_PATH_FORBIDDEN/);
  assert.doesNotMatch(proxy, /WLT_BROWSER_REFERENCE_PATHS[\s\S]*?cod-records/);
  assert.doesNotMatch(proxy, /WLT_BROWSER_REFERENCE_PATHS[\s\S]*?settlements/);
  assert.doesNotMatch(proxy, /WLT_BROWSER_REFERENCE_PATHS[\s\S]*?payout/);
});
