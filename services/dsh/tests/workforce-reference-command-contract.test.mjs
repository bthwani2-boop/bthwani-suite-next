import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce.api.ts"), "utf8");
const screen = readFileSync(resolve(process.cwd(), "services/dsh/frontend/control-panel/hr/WorkforceReferenceView.tsx"), "utf8");

test("workforce reference APIs accept explicit idempotency keys", () => {
  assert.match(api, /createWorkforceCity\(city: WorkforceCity, idempotencyKey\?: string\)/);
  assert.match(api, /updateWorkforceCity\(city: WorkforceCity, idempotencyKey\?: string\)/);
  assert.match(api, /createWorkforceShift\(shift: WorkforceShift, idempotencyKey\?: string\)/);
  assert.match(api, /updateWorkforceShift\(shift: WorkforceShift, idempotencyKey\?: string\)/);
});

test("workforce reference screen binds all writes to an authenticated actor command", () => {
  assert.match(screen, /const identity = useIdentitySession\(\)/);
  assert.match(screen, /if \(!actorId\) \{/);
  assert.match(screen, /const commandIds = React\.useRef<Record<string, string>>/);
  assert.match(screen, /updateWorkforceCity\([\s\S]*commandId/);
  assert.match(screen, /updateWorkforceShift\([\s\S]*commandId/);
  assert.match(screen, /createWorkforceCity\([\s\S]*commandId/);
  assert.match(screen, /createWorkforceShift\([\s\S]*commandId/);
});

console.log("workforce-reference-command-contract: PASS");
