import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/workforce-me-operational.api.ts"), "utf8");
const availability = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/ProviderAvailabilityNoticesPanel.tsx"), "utf8");
const incidents = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/workforce/ProviderIncidentsPanel.tsx"), "utf8");

test("workforce self mutations require authenticated identity", () => {
  assert.match(availability, /const identity = useIdentitySession\(\)/);
  assert.match(availability, /if \(!actorId\) \{[\s\S]*جلسة مقدم الخدمة غير جاهزة لتسجيل عدم التوفر/);
  assert.match(incidents, /const identity = useIdentitySession\(\)/);
  assert.match(incidents, /if \(!actorId\) \{[\s\S]*جلسة مقدم الخدمة غير جاهزة لإرسال الاعتراض/);
});

test("workforce self mutation APIs forward explicit idempotency keys", () => {
  assert.match(api, /createOwnAvailabilityNotice\([\s\S]*idempotencyKey\?: string/);
  assert.match(api, /body: input, idempotencyKey/);
  assert.match(api, /submitOwnProviderIncidentAppeal\(incidentId: string, note: string, idempotencyKey\?: string\)/);
  assert.match(api, /body: \{ note \}, idempotencyKey/);
  assert.match(availability, /createOwnAvailabilityNotice\([\s\S]*command\.id/);
  assert.match(incidents, /submitOwnProviderIncidentAppeal\(incidentId, appealNote\.trim\(\), command\.id\)/);
});

console.log("workforce-self-mutation-command-contract: PASS");
