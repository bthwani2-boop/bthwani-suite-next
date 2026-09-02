import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("checkout identity scope regression", () => {
  test("checkout-create-attempt source does not contain v1 legacy fallback", () => {
    const source = read("services/dsh/frontend/shared/checkout/checkout-create-attempt.ts");
    assert.ok(!source.includes("checkout-create-attempt:v1"), "v1 storage key must be removed");
    assert.ok(!source.includes('resolveMutationIdentityScope("")'), "empty actor resolver call must be removed");
    assert.match(source, /resolveMutationIdentityScope\(actorId,/);
  });

  test("checkout order flow threads actorId from identity session", () => {
    const flow = read("services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx");

    assert.match(flow, /const identity = useIdentitySession\(\)/);
    assert.match(flow, /const actorId = identity\.state\.kind === "authenticated" \? identity\.state\.identity\.subject : ""/);
    assert.match(flow, /getOrCreateCheckoutAttempt\(actorId, input\)/);
    assert.match(flow, /clearCheckoutAttempt\(actorId, fingerprintCheckoutInput\(input\)\)/);
    assert.match(flow, /const clearCurrentCheckoutAttempt = useCallback\([\s\S]*clearCheckoutAttempt\(actorId, fingerprintCheckoutInput\(input\)\)[\s\S]*\}, \[actorId\]\);/);
    assert.match(flow, /await clearCurrentCheckoutAttempt\(\);/);
    assert.match(flow, /\}, \[clearCurrentCheckoutAttempt, submitOrder\]\);/);
  });
});
