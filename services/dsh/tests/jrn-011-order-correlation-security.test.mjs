import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("client persists distinct idempotency and correlation identifiers", () => {
  const attempt = read("frontend/shared/order-truth/order-truth-create-attempt.ts");
  assert.match(attempt, /const idempotencyPart = uniquePart\(\)/);
  assert.match(attempt, /const correlationPart = uniquePart\(\)/);
  assert.match(attempt, /idempotencyKey: `order-create-key:/);
  assert.match(attempt, /correlationId: `order-create-correlation:/);
  assert.match(attempt, /candidate\.context\.correlationId !== candidate\.context\.idempotencyKey/);
  assert.doesNotMatch(attempt, /const part = uniquePart\(\)[\s\S]*idempotencyKey: `order-create:\$\{part\}`[\s\S]*correlationId: `order-create:\$\{part\}`/);
});

test("HTTP boundary replaces missing or reused correlation without exposing raw key", () => {
  const helper = read("backend/internal/http/order_truth_correlation.go");
  const handler = read("backend/internal/http/order_truth.go");

  assert.match(helper, /provided != "" && provided != idempotencyKey/);
  assert.match(helper, /sha256\.Sum256/);
  assert.match(helper, /return "order-create:" \+ hex\.EncodeToString\(sum\[:12\]\)/);
  assert.doesNotMatch(helper, /return "order-create:" \+ idempotencyKey/);
  assert.match(handler, /safeOrderCreateCorrelation\(/);
  assert.doesNotMatch(handler, /correlationID := strings\.TrimSpace\(r\.Header\.Get\("X-Correlation-ID"\)\)/);
});
