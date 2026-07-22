import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../../../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("JRN-011 rejects malformed identifiers before PostgreSQL UUID casts", async () => {
  const queries = await source("services/dsh/backend/internal/orders/order_truth_queries.go");
  const handlers = await source("services/dsh/backend/internal/http/order_truth.go");

  assert.match(queries, /uuid\.Parse\(strings\.TrimSpace\(value\)\)/);
  assert.match(queries, /GetOperatorScopedOrderTruth/);
  assert.match(handlers, /INVALID_CHECKOUT_INTENT_ID/);
  assert.match(handlers, /errors\.Is\(err, orders\.ErrInvalid\) \|\| errors\.Is\(err, orders\.ErrNotFound\)/);
  assert.match(handlers, /http\.StatusNotFound, "NOT_FOUND"/);
  assert.doesNotMatch(handlers, /INVALID_ORDER_ID/);
  assert.match(handlers, /orders\.GetOperatorScopedOrderTruth/);
});

test("JRN-011 redacts protected event metadata on non-client surfaces", async () => {
  const queries = await source("services/dsh/backend/internal/orders/order_truth_queries.go");

  assert.match(queries, /viewerRole == "partner" \|\| viewerRole == "operator"/);
  assert.match(queries, /StatusTimeline\[index\]\.Metadata = \[\]byte\(`\{\}`\)/);
});

test("JRN-011 order truth UI uses governed layout props instead of inline styles", async () => {
  const sharedSummary = await source("services/dsh/frontend/shared/order-truth/OrderTruthReadbackSummary.tsx");
  const partnerSurface = await source("services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx");

  for (const [label, text] of [["shared summary", sharedSummary], ["partner surface", partnerSurface]]) {
    assert.doesNotMatch(text, /style=\{\{/u, `${label} must not contain inline styles`);
    assert.match(text, /justify="space-between"/u);
    assert.match(text, /align="center"/u);
  }
});
