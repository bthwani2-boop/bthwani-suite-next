import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../database/migrations/dsh-001_canonical_baseline.sql", import.meta.url),
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
  assert.ok(
    migration.includes("dsh_cart_mutation_receipt_quarantine"),
    "missing quarantine evidence table",
  );
  assert.match(
    migration,
    /result_version integer NOT NULL/,
    "canonical result_version must be non-null after reconciliation",
  );
  assert.match(
    migration,
    /result_version >= 1/,
    "canonical result_version must remain positive",
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
