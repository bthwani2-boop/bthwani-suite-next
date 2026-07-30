import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { composeContext } from "../../../tools/scripts/openapi-context-composer.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const basePath = resolve(repositoryRoot, "services/dsh/contracts/dsh.openapi.yaml");

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

test("DSH composed contract contains one governed partner workboard", async () => {
  const base = readFileSync(basePath, "utf8");
  const composed = (await composeContext("dsh", { write: false })).bundle;

  assert.match(base, /x-bthwani-bundle: \.\/generated\/dsh\.bundle\.openapi\.yaml/);
  assert.equal(countOccurrences(base, "/dsh/partner/order-workboard:"), 1);
  assert.equal(countOccurrences(composed, "/dsh/partner/order-workboard:"), 1);
  assert.equal(countOccurrences(composed, "DshPartnerOrderAction:"), 1);
  assert.equal(countOccurrences(composed, "DshPartnerOrderWorkboardOrder:"), 1);
  assert.equal(countOccurrences(composed, "DshPartnerOrderWorkboardResponse:"), 1);
  assert.match(composed, /operationId: getDshPartnerOrderWorkboard/);
  assert.match(composed, /required:\s*(?:\[allowedActions\]|\r?\n\s+-\s+allowedActions)/);

  const actionSchemaStart = composed.indexOf("DshPartnerOrderAction:");
  const actionSchemaEnd = composed.indexOf("DshPartnerOrderWorkboardOrder:", actionSchemaStart);
  assert.ok(actionSchemaStart >= 0, "DshPartnerOrderAction schema is missing");
  assert.ok(actionSchemaEnd > actionSchemaStart, "DshPartnerOrderAction schema boundary is missing");
  const actionSchema = composed.slice(actionSchemaStart, actionSchemaEnd);
  assert.match(actionSchema, /enum:/);
  for (const action of ["accept", "reject", "prepare", "ready", "handoff"]) {
    assert.match(
      actionSchema,
      new RegExp(`(?:^|[\\s\\[,])${action}(?:[\\s\\],]|$)`, "m"),
      `DshPartnerOrderAction is missing ${action}`,
    );
  }
});
