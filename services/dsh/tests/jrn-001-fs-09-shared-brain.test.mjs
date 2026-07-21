import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const runtime = read("services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts");
const adapter = read("services/dsh/frontend/shared/partner/partner.api.ts");
const barrel = read("services/dsh/frontend/shared/partner/index.ts");
const controller = read("services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx");

assert.match(runtime, /export type DshPartnerAllowedAction/);
assert.match(runtime, /allowedActions/);
assert.match(runtime, /allowedTransitions/);
assert.match(runtime, /createPartnerMutationContext/);
assert.match(runtime, /mapPartnerOnboardingFailure/);
assert.match(runtime, /assertPartnerReadback/);
assert.match(runtime, /partner\.maskedAccountNumber/);
assert.match(runtime, /partner\.maskedIban/);
assert.match(runtime, /partner\.maskedMobileNumber/);
assert.doesNotMatch(runtime, /partner\.accountNumber\s*\|\|/);
assert.doesNotMatch(runtime, /partner\.iban\s*\|\|/);
assert.doesNotMatch(runtime, /partner\.payoutMobileNumber\s*\|\|/);

assert.match(adapter, /createPartnerMutationContext\(options\.method\.toLowerCase\(\), path/);
assert.match(adapter, /mutation\?\.idempotencyKey !== undefined/);
assert.match(adapter, /mutation\?\.correlationId !== undefined/);
assert.match(adapter, /mutation\?\.expectedVersion !== undefined/);
assert.match(adapter, /EXPECTED_VERSION_REQUIRED/);
assert.match(adapter, /expectedVersion < 1/);
assert.doesNotMatch(adapter, /\bfetch\s*\(/);
assert.doesNotMatch(adapter, /from\s+["']axios["']|\baxios\s*\./);

assert.match(barrel, /createPartnerMutationContext/);
assert.match(barrel, /derivePartnerOnboardingViewModel/);
assert.match(barrel, /mapPartnerOnboardingFailure/);
assert.match(barrel, /assertPartnerReadback/);

assert.match(controller, /createPartnerMutationContext/);
assert.match(controller, /assertPartnerReadback/);
assert.match(controller, /mapPartnerOnboardingFailure/);
assert.match(controller, /field-create-draft/);
assert.match(controller, /field-save-partner/);
assert.match(controller, /field-submit-partner/);
assert.match(controller, /field-upload-document/);
assert.match(controller, /field-submit-visit/);
assert.ok((controller.match(/assertPartnerReadback\(/g) ?? []).length >= 3, "create, save, and submit must read back");
assert.match(controller, /accountNumber: ""/);
assert.match(controller, /iban: ""/);
assert.match(controller, /payoutMobileNumber: ""/);
assert.doesNotMatch(controller, /accountNumber: partner\.accountNumber/);
assert.doesNotMatch(controller, /iban: partner\.iban/);
assert.doesNotMatch(controller, /payoutMobileNumber: partner\.payoutMobileNumber/);
assert.doesNotMatch(controller, /\bfetch\s*\(/);
assert.doesNotMatch(controller, /from\s+["']axios["']|\baxios\s*\./);

console.log("JRN-001 FS-09 shared brain, mutation identity, privacy, and readback verified");
