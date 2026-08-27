import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/delivery-proof/use-delivery-proof-controller.ts"),
  "utf8",
);
const api = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/delivery-proof/delivery-proof.api.ts"),
  "utf8",
);

test("operator delivery-proof review requires an authenticated actor and reuses commands on retry", () => {
  assert.match(controller, /const identity = useIdentitySession\(\)/);
  assert.match(controller, /const actorId = identity\.state\.kind === "authenticated"/);
  assert.match(controller, /const commandIds = React\.useRef<Record<string, string>>\(\{\}\)/);
  assert.match(controller, /if \(!actorId\) throw new Error\("جلسة العمليات غير جاهزة لمراجعة إثبات التسليم\."\)/);
  assert.match(controller, /const key = `\$\{actorId\}:\$\{proofId\}:\$\{action\}:\$\{input\.expectedVersion\}:\$\{input\.reason\.trim\(\)\}`/);
  assert.match(controller, /await acceptOperatorDeliveryProof\(proofId, input, command\.id\)/);
  assert.match(controller, /await rejectOperatorDeliveryProof\(proofId, input, command\.id\)/);
});

test("operator delivery-proof review transport forwards explicit idempotency keys", () => {
  assert.match(api, /acceptOperatorDeliveryProof\(\n  proofId: string,\n  input: DshReviewDeliveryProofInput,\n  idempotencyKey\?: string,/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-delivery-proof-accept"\)/);
  assert.match(api, /rejectOperatorDeliveryProof\(\n  proofId: string,\n  input: DshReviewDeliveryProofInput,\n  idempotencyKey\?: string,/);
  assert.match(api, /idempotencyKey: idempotencyKey \?\? corrId\("operator-delivery-proof-reject"\)/);
});

console.log("delivery-proof-command-identity-contract: PASS");
