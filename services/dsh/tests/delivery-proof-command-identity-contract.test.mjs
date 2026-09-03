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
const handler = readFileSync(
  resolve(process.cwd(), "services/dsh/backend/internal/http/delivery_proof_completion.go"),
  "utf8",
);
const dispatch = readFileSync(
  resolve(process.cwd(), "services/dsh/backend/internal/dispatch/delivery_proof.go"),
  "utf8",
);
const migration = readFileSync(
  resolve(process.cwd(), "services/dsh/database/migrations/dsh-001_canonical_baseline.sql"),
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
  assert.match(api, /acceptOperatorDeliveryProof\(\n  proofId: string,\n  input: DshReviewDeliveryProofInput,\n  idempotencyKey: string,/);
  assert.match(api, /idempotencyKey,/);
  assert.match(api, /rejectOperatorDeliveryProof\(\n  proofId: string,\n  input: DshReviewDeliveryProofInput,\n  idempotencyKey: string,/);
  assert.match(api, /idempotencyKey,/);
});

test("backend delivery-proof reviews require and persist an actor-scoped command receipt", () => {
  assert.match(handler, /idempotencyKey := deliveryProofIdempotencyKey\(r, ""\)/);
  assert.match(handler, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(handler, /IdempotencyKey:\s+idempotencyKey/);
  assert.match(dispatch, /IdempotencyKey\s+string/);
  assert.match(dispatch, /FROM dsh_delivery_proof_review_receipts/);
  assert.match(dispatch, /storedProofID != proofID \|\| storedFingerprint != fingerprint/);
  assert.match(dispatch, /INSERT INTO dsh_delivery_proof_review_receipts/);
  assert.match(migration, /UNIQUE \(operator_id, idempotency_key\)/);
});

console.log("delivery-proof-command-identity-contract: PASS");
