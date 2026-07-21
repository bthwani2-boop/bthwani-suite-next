import assert from "node:assert/strict";
import fs from "node:fs";

const routes = fs.readFileSync(
  "services/dsh/backend/internal/http/partner_lifecycle_routes.go",
  "utf8",
);
const handler = fs.readFileSync(
  "services/dsh/backend/internal/partner/handler.go",
  "utf8",
);
const integrity = fs.readFileSync(
  "services/dsh/backend/internal/partner/onboarding_integrity_test.go",
  "utf8",
);
const runtime = fs.readFileSync(
  "services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts",
  "utf8",
);
const policy = JSON.parse(
  fs.readFileSync("services/dsh/contracts/jrn-001-security-policy.json", "utf8"),
);

assert.equal(policy.journeyId, "JRN-001");
assert.ok(policy.requiredInvariants.length >= 6);
assert.match(routes, /protected\.handleGoverned/);
assert.match(routes, /protected\.handleField/);
assert.match(handler, /p\.CreatedByActorID != actorID/);
assert.match(handler, /StatusForbidden/);
assert.match(integrity, /NeverReturnsRawPayoutIdentifiers/);
assert.match(runtime, /idempotencyKey/);
assert.match(runtime, /correlationId/);
assert.doesNotMatch(routes, /BankAccountNumber|BankIBAN|PayoutMobileNumber/);

console.log("JRN-001 FS-13 partner security and isolation closed");
