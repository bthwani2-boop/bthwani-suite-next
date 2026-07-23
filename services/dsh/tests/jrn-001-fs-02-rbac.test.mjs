import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const truth = JSON.parse(read("governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json"));
const protectedStore = read("services/dsh/backend/internal/http/protected_store.go");
const lifecycleRoutes = read("services/dsh/backend/internal/http/partner_lifecycle_routes.go");
const tenantBoundary = read("services/dsh/backend/internal/http/partner_tenant_boundary.go");
const governedHandlers = read("services/dsh/backend/internal/partner/onboarding_integrity_handlers.go");
const governedRepository = read("services/dsh/backend/internal/partner/onboarding_integrity_repository.go");
const ownershipMigration = read("services/dsh/database/migrations/dsh-098_partner_onboarding_integrity.sql");
const fieldActivationCard = read("services/dsh/frontend/app-field/components/DshFieldActivationCard.tsx");
const identitySessionHook = read("core/identity/clients/use-identity-session.ts");

function actor(id) {
  const value = truth.actors.find((candidate) => candidate.id === id);
  assert.ok(value, `missing Product Truth actor ${id}`);
  return value;
}

function surface(id) {
  const value = truth.surfaces.find((candidate) => candidate.id === id);
  assert.ok(value, `missing Product Truth surface ${id}`);
  return value;
}

const requiredSurfaces = truth.surfaces.filter((entry) => entry.required).map((entry) => entry.id).sort();
assert.deepEqual(requiredSurfaces, [
  "app-client",
  "app-field",
  "app-partner",
  "backend",
  "control-panel",
  "database",
  "shared",
]);
assert.equal(surface("app-captain").required, false);
assert.match(surface("app-captain").exclusionReason, /later order and dispatch journeys/i);

const field = actor("field-agent");
assert.ok(field.permittedActions.includes("create-owned-partner-draft"));
assert.ok(field.permittedActions.includes("submit-owned-draft-for-review"));
assert.ok(field.forbiddenActions.includes("approve-own-evidence"));
assert.ok(field.forbiddenActions.includes("publish-store-to-client"));
assert.ok(field.forbiddenActions.includes("select-or-override-tenant"));

const operator = actor("control-operator");
assert.ok(operator.permittedActions.includes("review-partner-documents"));
assert.ok(operator.permittedActions.includes("apply-allowed-partner-transitions"));
assert.ok(operator.forbiddenActions.includes("bypass-readiness-gates"));
assert.ok(operator.forbiddenActions.includes("reassign-a-store-owned-by-another-partner"));
assert.ok(operator.forbiddenActions.includes("read-or-mutate-another-tenant-onboarding-record"));

const partner = actor("partner-owner");
assert.ok(partner.permittedActions.includes("read-own-activation-state"));
assert.ok(partner.forbiddenActions.includes("self-approve-onboarding"));
assert.ok(partner.forbiddenActions.includes("read-raw-payout-identifiers-from-dsh"));
assert.ok(partner.forbiddenActions.includes("read-another-tenant-partner-or-store"));

const client = actor("client");
assert.deepEqual(client.permittedActions.sort(), ["discover-client-visible-store", "read-public-store-profile"]);
assert.ok(client.forbiddenActions.includes("read-partner-private-onboarding-data"));

for (const permission of ["partners.read", "partners.manage", "partners.activate"]) {
  assert.ok(protectedStore.includes(permission), `missing runtime permission ${permission}`);
}
assert.match(protectedStore, /requirePermission\(w, r, "control-panel", action/);
assert.match(protectedStore, /requireActor\(w, r, "partner"\)/);
assert.match(governedHandlers, /requireFieldOwnsPartner\(w, db, partnerID, actorID\)/);

const tenantWrappedBindings = [
  ["GET /dsh/operator/partners/{partnerId}", "handleGovernedGetPartner"],
  ["POST /dsh/operator/partners/{partnerId}/transition", "handleGovernedActivationTransition"],
  ["POST /dsh/operator/partners/{partnerId}/stores", "handleTenantLinkPartnerStore"],
  ["GET /dsh/field/partners/{partnerId}", "handleGovernedFieldGetPartnerDraft"],
  ["PATCH /dsh/field/partners/{partnerId}", "handleGovernedFieldUpdatePartnerDraft"],
  ["POST /dsh/field/partners/{partnerId}/visits", "handleGovernedFieldCreatePartnerVisit"],
  ["POST /dsh/field/partners/{partnerId}/submit", "handleGovernedFieldSubmitPartnerDraft"],
];
for (const [path, handler] of tenantWrappedBindings) {
  assert.ok(
    lifecycleRoutes.includes(`mux.HandleFunc("${path}", protected.withTenantPartnerResource(protected.${handler}))`),
    `${path} is not tenant-wrapped and bound to ${handler}`,
  );
}
for (const path of ["GET /dsh/operator/partners", "POST /dsh/operator/partners", "GET /dsh/field/partners", "POST /dsh/field/partners/drafts"]) {
  assert.ok(lifecycleRoutes.includes(`mux.HandleFunc("${path}", protected.withTrustedPartnerTenant(`), `${path} lacks trusted tenant context`);
}
assert.match(tenantBoundary, /identity\.TenantID/);
assert.match(tenantBoundary, /TENANT_CONTEXT_REQUIRED/);
assert.match(tenantBoundary, /EnsureTenantPartner/);
assert.doesNotMatch(tenantBoundary, /X-Tenant-ID|URL\.Query\(\)\.Get\(["']tenant/i);

assert.match(governedRepository, /ErrStoreOwnershipConflict/);
assert.match(governedRepository, /currentPartnerID\.String != partnerID/);
assert.match(ownershipMigration, /STORE_PARTNER_REASSIGNMENT_FORBIDDEN/);
assert.match(ownershipMigration, /BEFORE UPDATE OF partner_id ON dsh_stores/);

assert.match(fieldActivationCard, /configureIdentityActivationActorType\("field"\)/);
assert.doesNotMatch(fieldActivationCard, /تجاوز المطور|دخول فوري|774182730/);
assert.doesNotMatch(fieldActivationCard, /onSubmit\([^\n]*"000000"/);
assert.match(identitySessionHook, /IDENTITY_ACTOR_TYPE_NOT_CONFIGURED/);
assert.match(identitySessionHook, /activateIdentity\(configuredActivationActorType/);

console.log("JRN-001 FS-02 RBAC, tenant isolation, activation and surface matrix verified");
