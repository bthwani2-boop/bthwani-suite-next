import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

const courierCodes = read("services/dsh/backend/internal/partnerfleet/courier_codes.go");
const redeemModel = read("services/dsh/backend/internal/partnerfleet/redeem.go");
const listModel = read("services/dsh/backend/internal/partnerfleet/list.go");
const disconnectModel = read("services/dsh/backend/internal/partnerfleet/membership_disconnect.go");
const operatorModel = read("services/dsh/backend/internal/partnerfleet/operator.go");
const partnerRoutes = read("services/dsh/backend/internal/http/partner_fleet.go");
const operatorRoutes = read("services/dsh/backend/internal/http/partner_fleet_operator.go");
const main = read("services/dsh/backend/cmd/dsh-api/main.go");
const migration = read("services/dsh/database/migrations/dsh-059_partner_courier_connection_codes.sql");
const scopeMigration = read("services/dsh/database/migrations/dsh-089_store_team_actor_scope_uniqueness.sql");
const api = read("services/dsh/frontend/shared/partner/partner-fleet.api.ts");
const partnerController = read("services/dsh/frontend/shared/partner/use-partner-fleet-controller.ts");
const partnerSurface = read("services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx");
const captainSurface = read("services/dsh/frontend/app-captain/account/PartnerFleetConnectionCard.tsx");
const operatorSurface = read("services/dsh/frontend/control-panel/partners/stores/OperatorPartnerFleetPanel.tsx");
const operatorHost = read("services/dsh/frontend/control-panel/partners/stores/OperatorDeliveryPricingPanel.tsx");
const contract = read("services/dsh/contracts/dsh.partner-fleet.openapi.yaml");
const productTruth = JSON.parse(read("governance/product/contracts/JRN-030_PARTNER_FLEET_CONNECTION.product-truth.json"));

test("JRN-030 persists only a digest and exposes the plaintext once", () => {
  assert.match(migration, /code_hash\s+TEXT NOT NULL/);
  assert.match(migration, /code_last4\s+TEXT NOT NULL/);
  assert.doesNotMatch(migration, /plaintext_code|plain_code/);
  assert.match(courierCodes, /sha256\.Sum256/);
  assert.match(courierCodes, /IssuedConnectionCode[\s\S]*Code\s+string/);
});

test("JRN-030 enforces active-store and courier eligibility before issue and redeem", () => {
  assert.match(courierCodes, /ensureStoreEligible/);
  assert.match(courierCodes, /status != "active"/);
  assert.match(courierCodes, /ErrStoreIneligible/);
  assert.match(courierCodes, /role != "courier"/);
  assert.match(redeemModel, /memberStatus == "blocked"/);
  assert.match(partnerRoutes, /STORE_INELIGIBLE/);
});

test("JRN-030 expires codes durably and prevents stale transitions", () => {
  assert.match(listModel, /status = 'expired'/);
  assert.match(redeemModel, /status = 'expired'/);
  assert.match(redeemModel, /expire_captain_connection_code/);
  assert.match(listModel, /expire_captain_connection_code/);
  assert.match(redeemModel, /WHERE id = \$2 AND store_id = \$3 AND version = \$4/);
  assert.match(courierCodes, /WHERE id::text=\$1 AND store_id=\$2 AND status='pending' AND version=\$3/);
  assert.match(redeemModel, /RowsAffected/);
});

test("JRN-030 makes lifecycle mutations atomic, audited, and notified", () => {
  assert.match(courierCodes, /func RevokeCode[\s\S]*BeginTx/);
  assert.match(courierCodes, /revoke_captain_connection_code/);
  assert.match(redeemModel, /redeem_captain_connection_code/);
  assert.match(disconnectModel, /captain_disconnect/);
  assert.match(disconnectModel, /captain_disconnected/);
  assert.match(courierCodes, /partner_fleet_connection/);
  assert.match(redeemModel, /partner_fleet_membership/);
  assert.match(redeemModel, /partner_fleet_connection/);
  assert.match(disconnectModel, /partner_fleet_membership/);
  assert.match(disconnectModel, /partner_fleet_connection/);
  assert.match(redeemModel, /tx\.Commit\(\)/);
});

test("JRN-030 allows multi-store membership but prevents duplicates inside one store", () => {
  assert.match(redeemModel, /identity_actor_id = \$1[\s\S]*store_id = \$2[\s\S]*id <> \$3/);
  assert.match(scopeMigration, /uq_dsh_store_team_members_store_identity_actor/);
  assert.doesNotMatch(scopeMigration, /ON dsh_store_team_members \(identity_actor_id\)/);
  assert.match(redeemModel, /ErrAlreadyBound/);
});

test("JRN-030 uses canonical store display names and hides cross-tenant records", () => {
  assert.match(listModel, /s\.display_name/);
  assert.match(disconnectModel, /s\.display_name/);
  assert.match(redeemModel, /SELECT display_name FROM dsh_stores/);
  assert.doesNotMatch(listModel, /s\.name/);
  assert.match(partnerRoutes, /requestedStoreID != "" && requestedStoreID != storeID/);
  assert.match(partnerRoutes, /StatusNotFound/);
});

test("JRN-030 operator projection is read-only and redacted", () => {
  assert.match(operatorRoutes, /requirePermission\(w, r, "control-panel", PartnersPermissionRead, "operator"\)/);
  assert.match(operatorRoutes, /GET \/dsh\/operator\/stores\/\{storeId\}\/partner-fleet/);
  assert.match(operatorModel, /CaptainActorID/);
  assert.doesNotMatch(operatorModel, /CodeHash|code_hash|plaintext/);
  assert.doesNotMatch(operatorRoutes, /POST \/dsh\/operator/);
  assert.match(main, /RegisterPartnerFleetOperatorRoutes/);
});

test("JRN-030 shared brain and all three required surfaces bind to DSH", () => {
  assert.match(api, /fetchOperatorPartnerFleetSnapshot/);
  assert.match(api, /disconnectCaptainPartnerFleetMembership/);
  assert.match(partnerController, /readonly connections/);
  assert.match(partnerController, /listPartnerCourierConnections/);
  assert.match(partnerSurface, /اتصالات أسطول الشريك/);
  assert.match(partnerSurface, /connectionStatusLabel/);
  assert.match(partnerSurface, /إلغاء رمز الربط/);
  assert.match(captainSurface, /connectCaptainToPartnerFleet/);
  assert.match(captainSurface, /disconnectCaptainPartnerFleetMembership/);
  assert.match(operatorSurface, /fetchOperatorPartnerFleetSnapshot/);
  assert.match(operatorSurface, /لا تظهر الرموز الكاملة أو بصماتها/);
  assert.match(operatorHost, /OperatorPartnerFleetPanel/);
});

test("JRN-030 contract covers every governed operation", () => {
  for (const path of [
    "/dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code",
    "/dsh/partner/stores/{storeId}/courier-connections",
    "/dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke",
    "/dsh/captain/partner-fleet/connect",
    "/dsh/captain/partner-fleet/memberships",
    "/dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect",
    "/dsh/operator/stores/{storeId}/partner-fleet",
  ]) {
    assert.ok(contract.includes(path), `missing contract path ${path}`);
  }
});

test("JRN-030 Product Truth declares all required surfaces and negative invariants", () => {
  assert.equal(productTruth.capabilityId, "JRN_030_PARTNER_FLEET_CONNECTION");
  const requiredSurfaces = productTruth.surfaces.filter((surface) => surface.required).map((surface) => surface.id);
  for (const surface of ["app-partner", "app-captain", "control-panel", "shared", "backend", "database"]) {
    assert.ok(requiredSurfaces.includes(surface), `missing required surface ${surface}`);
  }
  const negative = productTruth.invariants.negative.join("\n");
  assert.match(negative, /no plaintext code persistence/);
  assert.match(negative, /no cross-tenant partner access/);
  assert.match(negative, /no expired or revoked code reuse/);
  assert.match(negative, /no stale overwrite/);
});
