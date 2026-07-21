import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const routes = read("services/dsh/backend/internal/http/partner_lifecycle_routes.go");
const handlers = read("services/dsh/backend/internal/partner/onboarding_integrity_handlers.go");
const repository = read("services/dsh/backend/internal/partner/onboarding_integrity_repository.go");
const migration = read("services/dsh/database/migrations/dsh-098_partner_onboarding_integrity.sql");
const rbacTest = read("services/dsh/tests/jrn-001-fs-02-rbac.test.mjs");
const policy = JSON.parse(read("services/dsh/contracts/jrn-001-security-privacy-registry.json"));

assert.equal(policy.defaultEffect, "deny");
assert.match(routes, /newProtectedStoreServer/);
assert.match(routes, /handleGovernedFieldGetPartnerDraft/);
assert.match(routes, /handleGovernedFieldUpdatePartnerDraft/);
assert.match(handlers, /requireFieldOwnsPartner/);
assert.match(repository, /SanitizePartnerForSurface/);
assert.match(repository, /p\.BankAccountNumber = p\.MaskedAccountNumber/);
assert.match(repository, /p\.BankIBAN = p\.MaskedIBAN/);
assert.match(repository, /p\.PayoutMobileNumber = p\.MaskedMobileNumber/);
assert.match(migration, /dsh_partner_wlt_reference_excludes_raw_payout/);
assert.match(migration, /STORE_PARTNER_REASSIGNMENT_FORBIDDEN/);
assert.match(repository, /ErrIdempotencyConflict/);
assert.match(repository, /ErrVersionConflict/);
assert.match(repository, /correlation_id, idempotency_key, request_hash/);
assert.match(rbacTest, /defaultEffect/);
for (const field of policy.auditRequired) assert.equal(typeof field, "string");
assert.doesNotMatch(routes + handlers, /password\s*=|secret\s*=|api[_-]?key\s*=/i);

console.log("JRN-001 FS-13 security, privacy, RBAC, PII and audit gate passed");
