import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const routes = read("services/dsh/backend/internal/http/partner_lifecycle_routes.go");
const wrappers = read("services/dsh/backend/internal/http/partner_onboarding_integrity.go");
const protectedStore = read("services/dsh/backend/internal/http/protected_store.go");
const handlers = read("services/dsh/backend/internal/partner/onboarding_integrity_handlers.go");
const repository = read("services/dsh/backend/internal/partner/onboarding_integrity_repository.go");
const statePolicy = read("services/dsh/backend/internal/partner/state_policy.go");
const wltClient = read("services/dsh/backend/internal/wlt/payout_destination.go");
const wltServer = read("services/wlt/backend/internal/http/server.go");

const governedBindings = new Map([
  ["GET /dsh/operator/partners/{partnerId}", "handleGovernedGetPartner"],
  ["POST /dsh/operator/partners/{partnerId}/transition", "handleGovernedActivationTransition"],
  ["POST /dsh/operator/partners/{partnerId}/stores", "handleGovernedLinkPartnerStore"],
  ["GET /dsh/field/partners/{partnerId}", "handleGovernedFieldGetPartnerDraft"],
  ["PATCH /dsh/field/partners/{partnerId}", "handleGovernedFieldUpdatePartnerDraft"],
  ["POST /dsh/field/partners/{partnerId}/visits", "handleGovernedFieldCreatePartnerVisit"],
  ["POST /dsh/field/partners/{partnerId}/submit", "handleGovernedFieldSubmitPartnerDraft"],
]);
for (const [path, handler] of governedBindings) {
  assert.ok(routes.includes(`mux.HandleFunc("${path}", protected.${handler})`), `${path} is not bound to ${handler}`);
}

for (const legacyHandler of [
  "protected.handleGetPartner)",
  "protected.handleActivationTransition)",
  "protected.handleLinkPartnerStore)",
  "protected.handleFieldGetPartnerDraft)",
  "protected.handleFieldUpdatePartnerDraft)",
  "protected.handleFieldCreatePartnerVisit)",
  "protected.handleFieldSubmitPartnerDraft)",
]) {
  assert.ok(!routes.includes(legacyHandler), `legacy route binding remains: ${legacyHandler}`);
}

assert.match(wrappers, /PartnersPermissionRead/);
assert.match(wrappers, /PartnersPermissionManage/);
assert.match(wrappers, /PartnersPermissionActivate/);
assert.match(protectedStore, /requireFieldOwnsPartner|servePartnerHandler/);
assert.match(handlers, /http\.StatusPreconditionRequired/);
assert.match(handlers, /EXPECTED_VERSION_REQUIRED/);
assert.match(handlers, /VERSION_CONFLICT/);
assert.match(handlers, /IDEMPOTENCY_KEY_REUSED/);
assert.match(handlers, /STORE_OWNERSHIP_CONFLICT/);
assert.match(handlers, /PARTNER_READINESS_GATES_FAILED/);
assert.match(handlers, /WLT_PAYOUT_HANDOFF_FAILED/);
assert.match(repository, /pg_advisory_xact_lock/);
assert.match(repository, /FOR UPDATE/);
assert.match(repository, /request_hash/);
assert.match(repository, /WHERE id = \$1 AND version = \$3/);
assert.match(repository, /ErrStoreOwnershipConflict/);
assert.match(repository, /validateTransitionReadinessTx/);
assert.match(statePolicy, /AllowedActionsForSurface/);
assert.match(statePolicy, /AllowedTransitionsForSurface/);
assert.match(wltClient, /setRequiredMutationHeaders/);
assert.match(wltServer, /HandleUpsertPayoutDestinationGoverned/);

console.log("JRN-001 FS-07 backend routes, validation, authorization, concurrency, and idempotency verified");
