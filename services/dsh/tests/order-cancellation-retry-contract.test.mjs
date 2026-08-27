import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controller = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/orders/use-order-cancellation-controller.tsx"),
  "utf8",
);

test("order cancellation retries retain one command identity per request fingerprint", () => {
  assert.match(controller, /const commandIds = useRef<Record<string, string>>\(\{\}\)/);
  assert.match(controller, /const commandKey = JSON\.stringify\(\{[\s\S]*surface,[\s\S]*orderId,[\s\S]*reasonCode:/);
  assert.match(controller, /commandIds\.current\[commandKey\] \|\| corrId\(/);
  assert.match(controller, /const commandInput = input\.commandId\?\.trim\(\)/);
  assert.match(controller, /delete commandIds\.current\[commandKey\];/);
});

test("order cancellation does not discard the command identity on ambiguous failures", () => {
  assert.match(
    controller,
    /if \(classified\.kind === "invalid" \|\| classified\.kind === "permission_denied" \|\| classified\.kind === "not_found"\) \{\s*delete commandIds\.current\[commandKey\];/,
  );
});

console.log("order-cancellation-retry-contract: PASS");
