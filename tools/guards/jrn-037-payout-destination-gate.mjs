import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(relativePath, values) {
  const content = read(relativePath);
  for (const value of values) {
    if (!content.includes(value)) failures.push(`${relativePath} must include ${JSON.stringify(value)}`);
  }
  return content;
}

function requireExcludes(relativePath, values) {
  const content = read(relativePath);
  for (const value of values) {
    if (content.includes(value)) failures.push(`${relativePath} must not include ${JSON.stringify(value)}`);
  }
  return content;
}

const truthPath = "governance/product/contracts/jrn-037-payouts-destinations.product-truth.json";
const truthRaw = read(truthPath);
if (truthRaw) {
  try {
    const truth = JSON.parse(truthRaw);
    if (truth.capabilityId !== "JRN_037_PAYOUTS_DESTINATIONS") failures.push("product truth capabilityId mismatch");
    const surfaces = new Set((truth.surfaces ?? []).map((surface) => surface.id));
    for (const surface of ["app-partner", "app-captain", "app-field", "control-panel", "backend", "database", "shared"]) {
      if (!surfaces.has(surface)) failures.push(`product truth missing required surface ${surface}`);
    }
    if (truth.owners?.productManagerApproval !== "PENDING") failures.push("product manager approval must remain PENDING until independent review");
    if (truth.owners?.productOwnerApproval !== "PENDING") failures.push("product owner approval must remain PENDING until independent review");
  } catch (error) {
    failures.push(`invalid product truth JSON: ${error.message}`);
  }
}

requireIncludes("services/wlt/database/migrations/wlt-091_jrn037_payout_destination_governance.sql", [
  "owner_actor_id",
  "owner_actor_type",
  "wlt_payout_destinations_one_active_owner_uidx",
  "payout_destination_id",
  "reconciliation_status",
  "wlt_jrn037_payout_audit_events",
  "wlt_jrn037_payout_outbox",
  "wlt_jrn037_payout_reconciliations",
  "wlt_jrn037_payout_transition_trigger",
]);
requireIncludes("services/wlt/database/migrations/wlt-092_jrn037_request_hash_scope.sql", [
  "DROP INDEX IF EXISTS wlt_payout_requests_request_hash_uidx",
  "wlt_payout_requests_request_hash_idx",
]);
requireIncludes("services/wlt/database/migrations/wlt-093_jrn037_payout_destination_reference.sql", [
  "wlt_payout_requests_destination_fk",
  "FOREIGN KEY (payout_destination_id)",
  "ON DELETE RESTRICT",
  "VALIDATE CONSTRAINT",
]);

const backend = requireIncludes("services/wlt/backend/internal/payout/jrn037_governed_payout.go", [
  "normalizeGovernedOwner",
  "governedPayoutHash",
  "PAYOUT_DESTINATION_FORBIDDEN",
  "PAYOUT_DESTINATION_INACTIVE",
  "IDEMPOTENCY_CONFLICT",
  "HandleReconcilePayoutRequestJRN037",
  "MAKER_CHECKER_VIOLATION",
  "HELD_BALANCE_MISMATCH",
  "RECONCILIATION_IN_PROGRESS",
  "RowsAffected",
  "/financial/payout/status/",
  "wlt_jrn037_payout_reconciliations",
  "HandleListPayoutAuditJRN037",
  "created_at::text",
]);
if (!/input\.PayoutDestinationID[\s\S]*input\.AmountMinorUnits[\s\S]*input\.Currency/.test(backend)) {
  failures.push("payout request hash must bind destination, amount and currency");
}
requireExcludes("services/wlt/backend/internal/payout/jrn037_governed_payout.go", [
  'json:"accountNumber"`\n\tMasked',
]);

requireIncludes("services/wlt/backend/internal/http/server.go", [
  "/wlt/payout-destinations/{actorType}/{actorId}",
  "HandleCreatePayoutRequestJRN037",
  "/wlt/payout-requests/{payoutId}/reconcile",
  "/wlt/payout-requests/{payoutId}/audit",
]);

const dshRoutes = requireIncludes("services/dsh/backend/internal/http/jrn037_payout_routes.go", [
  "delete(object, \"ownerActorId\")",
  "delete(object, \"ownerActorType\")",
  '"beneficiaryActorId": actor.ID',
  '"beneficiaryActorType": actorType',
  '"payoutDestinationId": input.PayoutDestinationID',
  "operatorWriteBody(actor.ID)",
]);
if (/operatorID.+json/.test(dshRoutes)) failures.push("DSH payout operator identity must not be accepted from the browser body");

requireIncludes("services/dsh/backend/internal/http/representative_finance_routes.go", [
  "/dsh/partner/me/finance/payout-destination",
  "/dsh/partner/me/finance/payout-requests",
  "/dsh/captain/me/finance/payout-destination",
  "/dsh/captain/me/finance/payout-requests",
  "/dsh/field/me/finance/payout-destination",
  "/dsh/field/me/finance/payout-requests",
  "/dsh/control-panel/finance/payout-requests/{payoutId}/audit",
  "/dsh/control-panel/finance/payout-requests/{payoutId}/reconcile",
]);
requireIncludes("services/dsh/backend/internal/http/server.go", [
  '"GET /dsh/captain/finance/payouts", protected.handleCaptainPayoutRequestsJRN037',
  '"POST /dsh/captain/finance/payouts", protected.handleCaptainCreatePayoutRequestJRN037',
  '"GET /dsh/field/finance/payouts", protected.handleFieldPayoutRequestsJRN037',
  '"POST /dsh/field/finance/payouts", protected.handleFieldCreatePayoutRequestJRN037',
  '"GET /dsh/field/finance/payout-destinations", protected.handleFieldPayoutDestinationReadJRN037',
  '"POST /dsh/field/finance/payout-destinations", protected.handleFieldPayoutDestinationUpsertJRN037',
]);

requireIncludes("services/wlt/contracts/jrn-037-payouts-destinations.openapi.yaml", [
  "operationId: upsertWltTypedPayoutDestination",
  "operationId: createWltDestinationBoundPayoutRequest",
  "operationId: processWltPayoutRequest",
  "operationId: completeWltPayoutRequest",
  "operationId: reconcileWltPayoutRequest",
  "operationId: listWltPayoutAudit",
  "payoutDestinationId",
  "provider_result_unknown",
]);

requireIncludes("services/dsh/frontend/shared/finance-wlt-link/jrn037/payout.api.ts", [
  "fetchOwnPayoutDestination",
  "saveOwnPayoutDestination",
  "deactivateOwnPayoutDestination",
  "createOwnPayoutRequest",
  "payoutDestinationId",
]);
requireIncludes("services/dsh/frontend/shared/finance-wlt-link/jrn037/PayoutDestinationPanel.tsx", [
  "DestinationTextField",
  "البيانات الحساسة مشفرة في WLT",
  "أضف وجهة صرف أولاً",
  "الأموال ما زالت محجوزة",
  "createOwnPayoutRequest",
]);
requireIncludes("services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx", [
  "PayoutDestinationPanel",
  'actorType="partner"',
]);
requireIncludes("services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx", [
  "PayoutDestinationPanel",
  'actorType="captain"',
]);
const fieldSurface = requireIncludes("services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx", [
  "PayoutDestinationPanel",
  'actorType="field"',
]);
if (fieldSurface.includes("submitPayoutRequest(")) failures.push("field surface must not retain the destination-unbound payout form");
requireIncludes("services/dsh/frontend/control-panel/finance/PayoutRequestsPanel.tsx", [
  "reconcilePayoutRequest",
  "استعلام ومطابقة نتيجة المزود",
  "provider_result_unknown",
]);
requireIncludes("services/wlt/database/tests/jrn-037-payout-destination-invariants.sql", [
  "one active destination per typed owner index",
  "wlt_payout_requests_destination_fk",
  "wlt_jrn037_payout_transition_trigger",
  "unsupported owner actor type was accepted",
]);
requireIncludes("tools/verification/jrn-037-runtime-smoke.sh", [
  "PAYOUT_DESTINATION_FORBIDDEN",
  "payoutDestination.id",
  "provider_result_unknown",
  "reconcile",
  "wlt_jrn037_payout_reconciliations",
  "JRN-037 runtime smoke passed",
]);
requireIncludes("infra/docker/financial-simulators/wiremock/mappings/payout-status-success.json", [
  "/financial/payout/status/",
  '"status": "processed"',
]);

if (failures.length > 0) {
  console.error("JRN-037 payout destination gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("JRN-037 payout destination gate passed.");
