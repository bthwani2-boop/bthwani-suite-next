import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("checkout identity scope regression", () => {
  test("checkout-create-attempt source does not contain v1 legacy fallback", () => {
    const source = read("services/dsh/frontend/shared/checkout/checkout-create-attempt.ts");
    assert.ok(!source.includes("checkout-create-attempt:v1"), "v1 storage key must be removed");
    assert.ok(!source.includes("quarantineLegacy"), "quarantineLegacy function must be removed");
    assert.ok(!source.includes('resolveMutationIdentityScope("")'), "empty actor resolver call must be removed");
    assert.match(source, /resolveMutationIdentityScope\(actorId,/);
  });

  test("checkout controllers thread actorId from identity session", () => {
    const controller = read("services/dsh/frontend/shared/checkout/use-checkout-controller.tsx");
    const flow = read("services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx");

    assert.match(controller, /const identity = useIdentitySession\(\)/);
    assert.match(controller, /const actorId = identity\.state\.kind === "authenticated" \? identity\.state\.identity\.subject : ""/);
    assert.match(controller, /getOrCreateCheckoutAttempt\(actorId, input\)/);
    assert.match(controller, /clearCheckoutAttempt\(actorId, attempt\.fingerprint\)/);
    assert.match(controller, /\[actorId\]\);/);

    assert.match(flow, /const identity = useIdentitySession\(\)/);
    assert.match(flow, /const actorId = identity\.state\.kind === "authenticated" \? identity\.state\.identity\.subject : ""/);
    assert.match(flow, /getOrCreateCheckoutAttempt\(actorId, input\)/);
    assert.match(flow, /clearCheckoutAttempt\(actorId, fingerprintCheckoutInput\(input\)\)/);
    assert.match(flow, /\[actorId, submitOrder\]\);/);
  });
});
