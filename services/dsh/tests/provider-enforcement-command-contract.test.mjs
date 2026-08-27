import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const coreApi = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce-operational-core.api.ts"), "utf8");
const enforcementApi = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce-operational-enforcement.api.ts"), "utf8");
const panel = readFileSync(resolve(process.cwd(), "services/dsh/frontend/control-panel/shared/ProviderOperationalEnforcementPanel.tsx"), "utf8");

test("provider enforcement transports accept explicit idempotency keys", () => {
  assert.match(coreApi, /createProviderIncident\(input: CreateProviderIncidentInput, idempotencyKey\?: string\)/);
  assert.match(coreApi, /method: "POST",[\s\S]*body: input,[\s\S]*idempotencyKey/);
  assert.match(enforcementApi, /promoteCaptainToBasic\(actorId: string, input: PromoteCaptainInput, idempotencyKey\?: string\)/);
  assert.match(enforcementApi, /method: "POST", body: input, idempotencyKey/);
});

test("provider enforcement panel binds promotion and incident creation to authenticated commands", () => {
  assert.match(panel, /const identity = useIdentitySession\(\)/);
  assert.match(panel, /const operatorActorId = identity\.state\.kind === "authenticated"/);
  assert.match(panel, /const commandIds = React\.useRef<Record<string, string>>/);
  assert.match(panel, /promoteCaptainToBasic\(actorId, \{[\s\S]*\}, command\.id\)/);
  assert.match(panel, /createProviderIncident\(\{[\s\S]*\}, command\.id\)/);
  assert.match(panel, /delete commandIds\.current\[command\.key\]/);
});

console.log("provider-enforcement-command-contract: PASS");
