import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/partner/partner-store-ownership.api.ts"),
  "utf8",
);

test("partner store ownership uses one secure audit correlation without a shadow idempotency header", () => {
  assert.match(source, /secureCorrelationId\("partner-store-ownership"\)/);
  assert.match(source, /correlationId,/);
  assert.doesNotMatch(source, /Date\.now|idempotencyKey: correlationId|randomUUID/);
});
