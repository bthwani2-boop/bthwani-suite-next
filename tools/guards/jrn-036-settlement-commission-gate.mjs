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
    if (!content.includes(value)) {
      failures.push(`${relativePath} must include ${JSON.stringify(value)}`);
    }
  }
  return content;
}

function requireExcludes(relativePath, values) {
  const content = read(relativePath);
  for (const value of values) {
    if (content.includes(value)) {
      failures.push(`${relativePath} must not include ${JSON.stringify(value)}`);
    }
  }
  return content;
}

const truthPath = "governance/product/contracts/jrn-036-settlements-commissions.product-truth.json";
const truthRaw = read(truthPath);
if (truthRaw) {
  try {
    const truth = JSON.parse(truthRaw);
    if (truth.capabilityId !== "JRN_036_SETTLEMENTS_COMMISSIONS") {
      failures.push("product truth capabilityId mismatch");
    }
    const surfaces = new Set((truth.surfaces ?? []).map((surface) => surface.id));
    for (const requiredSurface of [
      "app-partner",
      "app-captain",
      "app-field",
      "control-panel",
      "backend",
      "database",
      "shared",
    ]) {
      if (!surfaces.has(requiredSurface)) {
        failures.push(`product truth missing required surface ${requiredSurface}`);
      }
    }
    if (truth.owners?.productManagerApproval !== "PENDING") {
      failures.push("product manager approval must remain PENDING until independent review");
    }
    if (truth.owners?.productOwnerApproval !== "PENDING") {
      failures.push("product owner approval must remain PENDING until independent review");
    }
  } catch (error) {
    failures.push(`invalid product truth JSON: ${error.message}`);
  }
}

requireIncludes("services/wlt/database/migrations/wlt-090_jrn036_settlement_commission_governance.sql", [
  "wlt_jrn036_settlement_requests",
  "wlt_jrn036_settlement_source_evidence",
  "completed_refund_minor_units",
  "wlt_jrn036_settlement_policy_versions",
  "wlt_jrn036_commission_policy_versions",
  "wlt_jrn036_commission_evidence",
  "wlt_jrn036_commission_adjustments",
  "wlt_jrn036_audit_events",
  "idempotency_key text NOT NULL UNIQUE",
]);
requireIncludes("services/wlt/database/migrations/wlt-091_jrn036_adjustment_ledger_identity.sql", [
  "DROP CONSTRAINT IF EXISTS wlt_jrn036_commission_adjustments_request_hash_key",
  "wlt_jrn036_commission_adjustments_request_hash_idx",
  "wlt_jrn036_commission_adjustments_commission_created_idx",
]);
requireIncludes("infra/docker/scripts/wlt-migration-probes.ps1", [
  "wlt-090_jrn036_settlement_commission_governance.sql",
  "wlt-091_jrn036_adjustment_ledger_identity.sql",
]);

const settlementBackend = requireIncludes(
  "services/wlt/backend/internal/settlement/jrn036_evidence_settlement.go",
  [
    "CreateEvidenceBackedSettlement",
    "CancellationStatus",
    "completed refunds",
    "wlt_refunds",
    "ErrSettlementIdempotencyConflict",
    "policy.Version",
    "HandleListSettlementEvidence",
  ],
);
if (/GrossAmountMinorUnits\s*int64/.test(settlementBackend) === false) {
  failures.push("settlement evidence must carry authoritative DSH gross identity");
}

const commissionBackend = requireIncludes(
  "services/wlt/backend/internal/cod/jrn036_governed_commission.go",
  [
    "CreateGovernedCommissionInput",
    "DisallowUnknownFields",
    "calculateGovernedCommissionAmount",
    "ErrGovernedCommissionPolicyMissing",
    "sourceEvidenceHash",
    "wlt_jrn036_commission_evidence",
    "ApplyGovernedCommissionAdjustment",
    '"commission_adjustment"',
    "adjustmentID",
    "ON CONFLICT (idempotency_key) DO NOTHING",
  ],
);
const createInputMatch = commissionBackend.match(/type CreateGovernedCommissionInput struct \{([\s\S]*?)\n\}/);
if (!createInputMatch) {
  failures.push("unable to inspect CreateGovernedCommissionInput");
} else if (/AmountMinorUnits\s+int64\s+`json:"amountMinorUnits"`/.test(createInputMatch[1])) {
  failures.push("governed commission input must not accept amountMinorUnits");
}

requireIncludes("services/wlt/backend/internal/cod/jrn036_governed_lifecycle.go", [
  "ConfirmGovernedCommission",
  "SettleGovernedCommission",
  "RejectGovernedCommission",
  "ReverseGovernedCommission",
  "pending_balance_minor_units>=$1",
  "available_balance_minor_units>=$1",
  "commission_rejected",
  "commission_reversed",
]);

requireIncludes("services/wlt/backend/internal/http/server.go", [
  "HandleCreateEvidenceBackedSettlement",
  "HandleUpsertGovernedSettlementPolicy",
  "HandleCreateGovernedCommission",
  "HandleListGovernedCommissions",
  "HandleAdjustGovernedCommission",
  "HandleConfirmGovernedCommission",
  "HandleSettleGovernedCommission",
  "HandleRejectGovernedCommission",
  "HandleReverseGovernedCommission",
]);
requireExcludes("services/wlt/backend/internal/http/server.go", [
  'POST /wlt/settlements", gate(serviceAuth(settlement.HandleCreateSettlementFromDeliveredOrders',
  'POST /wlt/commissions", gate(serviceAuth(cod.HandleCreateCommission',
]);

const dshSettlement = requireIncludes("services/dsh/backend/internal/http/finance_settlement_sources.go", [
  "PricingSnapshotHash",
  "CompletionEventID",
  "CompletionEvidenceHash",
  "CancellationStatus",
  "pricing_snapshot_hash",
  "o.status = 'delivered'",
  "orderSources",
]);
for (const forbiddenCallerAmount of ['netAmount"', 'refundAmount"']) {
  if (dshSettlement.includes(forbiddenCallerAmount)) {
    failures.push(`DSH settlement source must not send ${forbiddenCallerAmount}`);
  }
}

requireIncludes("services/dsh/backend/internal/wlt/commission_client.go", [
  "commissionWritePathAllowed",
  "adjust",
  "confirm",
  "settle",
  "reject",
  "reverse",
  "setRequiredMutationHeaders",
]);
requireIncludes("services/dsh/backend/internal/http/representative_finance_routes.go", [
  "/dsh/partner/me/finance/commissions",
  "/dsh/captain/me/finance/commissions",
  "/dsh/field/me/finance/commissions",
  "/dsh/control-panel/finance/commission-policies",
  "/dsh/control-panel/finance/settlements/{settlementId}/evidence",
  "/dsh/control-panel/finance/commissions/{commissionId}/adjust",
]);

const openapi = requireIncludes("services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml", [
  "operationId: createWltEvidenceBackedSettlement",
  "operationId: listWltSettlementEvidence",
  "operationId: upsertWltSettlementPolicy",
  "operationId: upsertWltCommissionPolicy",
  "operationId: createWltGovernedCommission",
  "operationId: adjustWltCommission",
  "operationId: confirmWltCommission",
  "operationId: settleWltCommission",
  "operationId: rejectWltCommission",
  "operationId: reverseWltCommission",
  "additionalProperties: false",
]);
const createCommissionSchema = openapi.match(/CreateCommissionRequest:\n([\s\S]*?)\n    Settlement:/);
if (!createCommissionSchema || createCommissionSchema[1].includes("amountMinorUnits:")) {
  failures.push("OpenAPI CreateCommissionRequest must not contain amountMinorUnits");
}

const jrn036Api = requireIncludes("services/dsh/frontend/shared/finance-wlt-link/jrn036/jrn036.api.ts", [
  "/dsh/${actorType}/me/finance/commissions",
  "/dsh/control-panel/finance/commission-policies",
  "adjustJrn036Commission",
  "confirmJrn036Commission",
  "settleJrn036Commission",
  "rejectJrn036Commission",
  "reverseJrn036Commission",
]);
if (jrn036Api.includes("JSON.stringify(input)") || jrn036Api.includes("JSON.stringify(body)")) {
  failures.push("JRN-036 shared client must pass objects to createDshHttpClient, not pre-serialized JSON");
}

requireIncludes("services/dsh/frontend/shared/finance-wlt-link/jrn036/RepresentativeCommissionPanel.tsx", [
  "القيمة والسياسة والحالة من WLT فقط",
  "resolutionNote",
  "confirmed",
  "settled",
  "rejected",
  "reversed",
]);
requireIncludes("services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx", [
  "RepresentativeCommissionPanel",
  'actorType="partner"',
]);
requireIncludes("services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx", [
  "RepresentativeCommissionPanel",
  'actorType="captain"',
]);
requireIncludes("services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx", [
  "useFieldFinanceController",
  "commissions",
  "مصدرها WLT",
  "confirmed",
  "reversed",
  "resolutionNote",
  "commissionPolicyId",
]);
requireIncludes("services/dsh/frontend/shared/finance-wlt-link/field-finance/field-finance.api.ts", [
  "commissionType",
  "resolutionNote",
  "confirmedAt",
  "reversedAt",
]);
requireIncludes("services/dsh/frontend/control-panel/finance/Jrn036CommissionGovernancePanel.tsx", [
  "upsertJrn036CommissionPolicy",
  "confirmJrn036Commission",
  "settleJrn036Commission",
  "rejectJrn036Commission",
  "reverseJrn036Commission",
  "adjustJrn036Commission",
  "validatePolicy",
  "maximumAmountMinorUnits",
  "سبب تغيير سياسة العمولة",
]);
requireIncludes("services/dsh/frontend/control-panel/finance/GovernedSettlementPanel.tsx", [
  "cycleDays",
  "minimumNetMinorUnits",
  "changeReason",
  "سبب تغيير سياسة التسوية",
]);
const settlementApi = requireIncludes(
  "services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts",
  ["cycleDays", "minimumNetMinorUnits", "changeReason", "createSettlementFromDeliveredOrders"],
);
const settlementCreate = settlementApi.slice(
  settlementApi.indexOf("export async function createSettlementFromDeliveredOrders"),
);
if (settlementCreate.includes("currency: input.currency")) {
  failures.push("strict governed settlement creation must not send a caller currency field");
}
requireIncludes("services/dsh/frontend/control-panel/finance/PayoutRequestsPanel.tsx", [
  "Jrn036CommissionGovernancePanel",
]);

if (failures.length > 0) {
  console.error("JRN-036 settlement and commission gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("JRN-036 settlement and commission gate passed.");
