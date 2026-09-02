import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../database/migrations/dsh-1081_cart_mutation_receipt_invariant_closure.sql", import.meta.url),
  "utf8",
);
const mutation = readFileSync(
  new URL("../backend/internal/cart/mutation.go", import.meta.url),
  "utf8",
);
const outcome = readFileSync(
  new URL("../backend/internal/cart/mutation_outcome.go", import.meta.url),
  "utf8",
);
const httpCart = readFileSync(
  new URL("../backend/internal/http/cart.go", import.meta.url),
  "utf8",
);

test("cart mutation receipt closure preserves unknown evidence without fabricating result versions", () => {
  const quarantineInsert = migration.indexOf(
    "INSERT INTO dsh_cart_mutation_receipt_quarantine",
  );
  const canonicalDelete = migration.indexOf(
    "DELETE FROM dsh_cart_mutation_receipts",
  );

  assert.ok(quarantineInsert >= 0, "missing quarantine evidence migration");
  assert.ok(
    canonicalDelete > quarantineInsert,
    "canonical invalid rows must only be deleted after evidence is preserved",
  );
  assert.match(
    migration,
    /ALTER COLUMN result_version SET NOT NULL/,
    "canonical result_version must be non-null after reconciliation",
  );
  assert.match(
    migration,
    /CHECK \(result_version >= 1\)/,
    "canonical result_version must remain positive",
  );
  assert.doesNotMatch(
    migration,
    /COALESCE\s*\(\s*result_version/i,
    "unknown result versions must not be coerced",
  );
  assert.doesNotMatch(
    migration,
    /SET\s+result_version\s*=\s*(?:0|1)\b/i,
    "unknown result versions must not be fabricated",
  );
});

test("quarantined keys fail before canonical receipt replay or business mutation", () => {
  const begin = mutation.indexOf("func beginCartMutation(");
  assert.ok(begin >= 0, "missing canonical mutation boundary");

  const beginBody = mutation.slice(begin, mutation.indexOf("\nfunc loadMutationReceiptTx", begin));
  const quarantineCheck = beginBody.indexOf("mutationOutcomeQuarantinedTx");
  const canonicalLoad = beginBody.indexOf("loadMutationReceiptTx");

  assert.ok(quarantineCheck >= 0, "mutation boundary does not check quarantined keys");
  assert.ok(
    canonicalLoad > quarantineCheck,
    "quarantine must be checked before canonical replay/business mutation",
  );
  assert.match(outcome, /ErrMutationOutcomeUnknown/);
  assert.match(outcome, /FindMutationReceiptWithOutcome/);
  assert.match(httpCart, /CART_MUTATION_OUTCOME_UNKNOWN/);
  assert.match(httpCart, /FindMutationReceiptWithOutcome/);
});
