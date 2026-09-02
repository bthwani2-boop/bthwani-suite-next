import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, listFiles, read, repoRoot } from "./_guard-utils.mjs";
import { composeContext } from "../scripts/openapi-context-composer.mjs";
import { parse } from "yaml";

const guardId = "wlt-financial-boundary-gate";
const violations = [];

// Canonical authorities are required inputs to this guard. A missing source is
// a closure failure, never a reason to skip the assertion that source owns.
function readCanonicalSource(file) {
  try {
    return read(file);
  } catch (error) {
    violations.push({
      file,
      line: 0,
      message: `CANONICAL_AUTHORITY_MISSING ${error instanceof Error ? error.message : String(error)}`,
    });
    return "";
  }
}

function requireCanonicalMarkers(file, source, markers) {
  for (const [pattern, message] of markers) {
    const matched = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
    if (!matched) violations.push({ file, line: 0, message });
  }
}

// 0. Applications and the control panel may consume finance only through DSH.
// WLT remains an internal service-to-service dependency of DSH. The DSH-owned
// wallet surface (services/dsh/frontend/wlt) consumes WLT contract types only
// through the declared public export '@bthwani/wlt/openapi'.
const directAppWltPatterns = [
  [/from\s+['"]@bthwani\/wlt(?!\/openapi\b)[^'"]*['"]/, "APPLICATION_IMPORTS_WLT_DEEP_PATHS"],
  [/\b(?:EXPO_PUBLIC_)?WLT_API_BASE_URL\b/, "APPLICATION_CONFIGURES_WLT_DIRECTLY"],
  [/\/api\/wlt(?:\/|["'`])/, "APPLICATION_EXPOSES_WLT_ROUTE"],
  [/\bwltFetchJson\b/, "WLT_FETCH_JSON_IS_FORBIDDEN"],
  [/\bwlt-http\b/, "WLT_HTTP_IS_FORBIDDEN"],
  [/\b58083\b/, "APPLICATION_EXPOSES_WLT_PORT"],
  [/services\/wlt\b/, "APPLICATION_REFERENCES_WLT_SOURCE"],
];
const appBoundaryFiles = [
  ...listFiles().filter(
    (file) =>
      (file.startsWith("apps/") || file.startsWith("services/dsh/frontend/")) &&
      !file.includes("/tests/") &&
      !file.includes("/test/") &&
      !file.includes(".test.") &&
      !file.includes(".spec."),
  ),
  "apps/control-panel/runtime/start.ps1",
  "tools/mobile/ensure-mobile-dev-runtime.ps1",
  "tools/mobile/reverse-all.ps1",
  "tools/mobile/start-mobile-runtime.ps1",
];
for (const file of new Set(appBoundaryFiles)) {
  const content = read(file);
  for (const [pattern, message] of directAppWltPatterns) {
    const match = pattern.exec(content);
    if (match) violations.push({ file, line: lineNumber(content, match.index), message });
  }
}

// 1. no-financial-mutation-outside-wlt. Frontend command names are callers of
// the WLT-owned API and are not financial truth owners; this rule protects
// backend/domain persistence and mutation code.
const mutationRegex = /\b(createLedger|appendLedger|mutateWallet|setWalletBalance|updateWalletBalance|confirmPaymentProviderResult|createPayout|settlePayout|createRefund|settleRefund|markSettlement|walletBalance\s*=|ledgerEntries\.push|settlementStatus\s*=|payoutStatus\s*=|refundStatus\s*=)\b/g;
for (const file of listCodeFiles()) {
  if (file.startsWith("services/wlt/")) continue;
  if (file.startsWith("governance/") || file.startsWith("contracts/") || file.startsWith("tools/") || file.includes("/frontend/")) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;
  const content = read(file);
  let match;
  while ((match = mutationRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "financial mutation belongs to WLT only. Authority sources: governance/product/PRD.md and governance/policies/engineering.md",
    });
  }
}

// 2. no-direct-financial-provider-access-outside-wlt
const allowedPrefixes = [
  "services/wlt/", "infra/docker/", "docs/runtime/", "plans/", ".devcontainer/", "package.json", "tools/guards/",
  "tools/scripts/test-", "tools/scripts/smoke-wiremock-financial-provider.ps1",
  "tools/scripts/smoke-wlt-provider-through-wlt.ps1", "tools/scripts/smoke-wlt-payout-provider.ps1",
  "tools/scripts/financial-simulator-local.ps1", ".github/workflows/",
];
const forbiddenPatterns = [
  /\bWLT_FINANCIAL_PROVIDER_MODE\s*=\s*production\b/i,
  /\bWLT_FINANCIAL_PROVIDER_BASE_URL\b/i,
  /\bwiremock-financial-provider\b/i,
  /\bfinancial\/(?:electricity|telecom|card|common)\b/i,
  /\b(?:card|payment|financial|electricity|telecom)[-_]?(?:gateway|provider)[-_]?(?:base[-_]?url|url|endpoint)\b/i,
];
const isAllowed = (file) => allowedPrefixes.some((prefix) => file.startsWith(prefix));
for (const file of listFiles()) {
  if (isAllowed(file)) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;
  const content = read(file);
  for (const pattern of forbiddenPatterns) {
    const match = pattern.exec(content);
    if (match) violations.push({ file, line: lineNumber(content, match.index), message: "direct financial provider access belongs to services/wlt only" });
  }
}

// 3. governed settlement creation must stay fully source-derived and WLT-owned.
const operationStateFile = "services/wlt/contracts/operation-state.json";
let operationState;
try { operationState = JSON.parse(read(operationStateFile)); }
catch (error) { violations.push({ file: operationStateFile, line: 0, message: `INVALID_WLT_OPERATION_STATE ${error instanceof Error ? error.message : String(error)}` }); }

const settlementOperation = operationState?.operations?.find((operation) => operation.operationId === "createWltEvidenceBackedSettlement");
if (!settlementOperation) violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_OPERATION_STATE_MISSING" });
else {
  if (settlementOperation.method !== "POST" || settlementOperation.path !== "/wlt/settlements") violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_OPERATION_ROUTE_DRIFT" });
  if (settlementOperation.state !== "CONTRACT_ACTIVE") violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_MUST_BE_CONTRACT_ACTIVE" });
  if (settlementOperation.runtimeStatus !== 201 || settlementOperation.runtimeCode !== "SETTLEMENT_CREATED") violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_ACTIVE_RESPONSE_DRIFT" });
  if (!Array.isArray(settlementOperation.activationEvidence) || settlementOperation.activationEvidence.length < 8) violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_ACTIVATION_EVIDENCE_INCOMPLETE" });
}

const settlementSourceFile = "services/wlt/backend/internal/settlement/evidence_settlement.go";
const settlementSource = readCanonicalSource(settlementSourceFile);
const settlementArithmeticSource = settlementSource + "\n" + readCanonicalSource("services/wlt/backend/internal/settlement/governed_source.go");
for (const [pattern, message] of [
  [/func CreateEvidenceBackedSettlement/, "GOVERNED_SETTLEMENT_CREATOR_MISSING"],
  [/wlt_settlement_policies/, "SETTLEMENT_POLICY_SOURCE_MISSING"],
  [/fee_basis_points/, "SETTLEMENT_FEE_POLICY_MISSING"],
  [/wlt_settlement_source_orders/, "SETTLEMENT_SOURCE_ORDER_LOCK_MISSING"],
  [/ErrSettlementOrderAlreadyUsed/, "SETTLEMENT_DUPLICATE_ORDER_PROTECTION_MISSING"],
]) if (!pattern.test(settlementSource)) violations.push({ file: settlementSourceFile, line: 0, message });
for (const [pattern, message] of [
  [/func addPositiveMinorUnits[\s\S]*ErrSettlementAmountOverflow/, "SETTLEMENT_GROSS_OVERFLOW_PROTECTION_MISSING"],
  [/func settlementFeeFromBasisPoints[\s\S]*grossAmount\s*\/\s*10000/, "SETTLEMENT_FEE_OVERFLOW_PROTECTION_MISSING"],
  [/var gross int64[\s\S]*addPositiveMinorUnits\(gross, basis\)[\s\S]*settlementFeeFromBasisPoints\(gross[\s\S]*net := gross - fee/, "SETTLEMENT_SERVER_ARITHMETIC_MISSING"],
  [/BeginTx[\s\S]*INSERT INTO wlt_settlements[\s\S]*INSERT INTO wlt_settlement_source_orders[\s\S]*tx\.Commit/, "SETTLEMENT_SOURCE_AND_RECORD_NOT_ATOMIC"],
]) if (!pattern.test(settlementArithmeticSource)) violations.push({ file: settlementSourceFile, line: 0, message });

const settlementPostingFile = "services/wlt/backend/internal/settlement/settlement.go";
const settlementPosting = readCanonicalSource(settlementPostingFile);
for (const [pattern, message] of [
  [/WHERE\s+operator_context_id\s*=\s*\$1\s+AND\s+id\s*=\s*\$2\s+AND\s+status\s*=\s*'pending'/, "SETTLEMENT_POST_MUST_REQUIRE_TRUSTED_OperatorContext_AND_PENDING_STATE"],
  [/platform_payable[\s\S]*wallet[\s\S]*platform_revenue/, "SETTLEMENT_BALANCED_ACCOUNTING_LINES_MISSING"],
  [/BeginTx[\s\S]*PostLedgerTransaction[\s\S]*tx\.Commit/, "SETTLEMENT_STATE_AND_JOURNAL_NOT_ATOMIC"],
]) if (!pattern.test(settlementPosting)) violations.push({ file: settlementPostingFile, line: 0, message });

const dshSourceFile = "services/dsh/backend/internal/http/finance_settlement_sources.go";
const dshSource = readCanonicalSource(dshSourceFile);
for (const [pattern, message] of [
  [/o\.status = 'delivered'/, "DSH_SETTLEMENT_MUST_USE_DELIVERED_ORDERS"],
  [/dsh_order_status_events/, "DSH_SETTLEMENT_DELIVERED_EVENT_SOURCE_MISSING"],
  [/o\.subtotal_minor_units/, "DSH_SETTLEMENT_IMMUTABLE_SUBTOTAL_SOURCE_MISSING"],
  [/o\.currency/, "DSH_SETTLEMENT_ORDER_CURRENCY_SOURCE_MISSING"],
  [/o\.pricing_snapshot_hash/, "DSH_SETTLEMENT_PRICING_SNAPSHOT_GATE_MISSING"],
  [/orderSources/, "DSH_SETTLEMENT_SOURCE_PAYLOAD_MISSING"],
  [/ExecuteFinanceWrite\([\s\S]*"finance\.settlements\.create"/, "DSH_SETTLEMENT_WLT_BOUNDARY_MISSING"],
]) if (!pattern.test(dshSource)) violations.push({ file: dshSourceFile, line: 0, message });
if (/dsh_order_items|SUM\s*\(\s*oi\.unit_price/i.test(dshSource)) violations.push({ file: dshSourceFile, line: 0, message: "DSH_SETTLEMENT_MUST_NOT_RECOMPUTE_ORDER_PRICING" });
const settlementRequestMatch = dshSource.match(/type createGovernedSettlementRequest struct \{([\s\S]*?)\n\}/);
const settlementRequest = settlementRequestMatch?.[1] ?? "";
for (const forbidden of ["Currency", "GrossAmount", "PlatformFee", "NetAmount", "OrderCount", "OrderSources"]) if (settlementRequest.includes(forbidden)) violations.push({ file: dshSourceFile, line: 0, message: `CONTROL_PANEL_SETTLEMENT_INPUT_FORBIDDEN_FIELD ${forbidden}` });

const wltServerFile = "services/wlt/backend/internal/http/server.go";
const wltServer = readCanonicalSource(wltServerFile);
// mutation() applies the configuration gate, the DSH service-caller gate and
// the finance kill switch. Registering this route any other way (including the
// former gate(serviceAuth(...)) spelling, which had no kill switch) is drift.
if (!/mutation\(\s*["`]POST \/wlt\/settlements["`],\s*settlement\.HandleCreateEvidenceBackedSettlement\(db\)\)/.test(wltServer)) violations.push({ file: wltServerFile, line: 0, message: "WLT_EVIDENCE_BACKED_SETTLEMENT_ROUTE_BINDING_DRIFT" });
if (!/PUT \/wlt\/settlement-policies\/\{partnerId\}/.test(wltServer)) violations.push({ file: wltServerFile, line: 0, message: "WLT_SETTLEMENT_POLICY_ROUTE_MISSING" });
for (const marker of [
  'mutation("PUT /wlt/payout-destinations/{actorType}/{actorId}", payout.HandleUpsertCanonicalPayoutDestination(db))',
  'read("GET /wlt/payout-destinations/{actorType}/{actorId}", payout.HandleGetCanonicalPayoutDestination(db))',
  'mutation("POST /wlt/payout-destinations/{actorType}/{actorId}/verify", payout.HandleVerifyCanonicalPayoutDestination(db))',
  'mutation("POST /wlt/payout-destinations/{actorType}/{actorId}/deactivate", payout.HandleDeactivateCanonicalPayoutDestination(db))',
]) if (!wltServer.includes(marker)) violations.push({ file: wltServerFile, line: 0, message: `WLT_PAYOUT_ROUTE_BINDING_DRIFT ${marker}` });

const dshServerFile = "services/dsh/backend/internal/http/server.go";
const dshCompositionFile = "services/dsh/backend/internal/http/catalog_unified_routes.go";
const dshFinanceRoutesFile = "services/dsh/backend/internal/http/representative_finance_routes.go";
const dshServer = readCanonicalSource(dshServerFile);
const dshComposition = readCanonicalSource(dshCompositionFile);
const dshFinanceRoutes = readCanonicalSource(dshFinanceRoutesFile);
if (!dshServer.includes("registerUnifiedCatalogRoutes(mux, protected)")) violations.push({ file: dshServerFile, line: 0, message: "DSH_PROTECTED_ROUTE_COMPOSITION_MISSING" });
if (!dshComposition.includes("registerRepresentativeFinanceRoutes(mux, s)")) violations.push({ file: dshCompositionFile, line: 0, message: "DSH_FINANCE_REGISTRAR_NOT_COMPOSED" });
for (const marker of ["POST /dsh/control-panel/finance/settlements/from-delivered-orders", "PUT /dsh/control-panel/finance/settlement-policies/{partnerId}"]) if (!dshFinanceRoutes.includes(marker)) violations.push({ file: dshFinanceRoutesFile, line: 0, message: `DSH_SETTLEMENT_ROUTE_MISSING ${marker}` });

const openApiFile = "services/wlt/contracts/wlt.settlements-commissions.openapi.yaml";
const openApi = readCanonicalSource(openApiFile);
const settlementPathStart = openApi.indexOf("  /wlt/settlements:");
const settlementPathEnd = openApi.indexOf("\ncomponents:", settlementPathStart);
const settlementContract = settlementPathStart >= 0 ? openApi.slice(settlementPathStart, settlementPathEnd > settlementPathStart ? settlementPathEnd : undefined) : "";
for (const marker of ["operationId: createWltEvidenceBackedSettlement", "x-bthwani-mutation-approved: true", "x-bthwani-default-enabled: false"]) if (!settlementContract.includes(marker)) violations.push({ file: openApiFile, line: 0, message: `SETTLEMENT_OPENAPI_ACTIVE_MARKER_MISSING ${marker}` });
const settlementSchemaStart = openApi.indexOf("    VerifiedDeliveredOrderSource:");
const settlementSchemaEnd = openApi.indexOf("\n    CreateSettlementRequest:", settlementSchemaStart);
const settlementSchemaTail = openApi.indexOf("\n    SettlementPolicyInput:", settlementSchemaEnd);
const settlementSchema = settlementSchemaStart >= 0 ? openApi.slice(settlementSchemaStart, settlementSchemaTail > settlementSchemaEnd ? settlementSchemaTail : undefined) : "";
for (const marker of ["orderSources", "orderId", "grossAmountMinorUnits", "deliveredAt", "operatorId"]) if (!settlementSchema.includes(marker)) violations.push({ file: openApiFile, line: 0, message: `SETTLEMENT_SOURCE_SCHEMA_MISSING ${marker}` });
for (const forbidden of ["grossAmount:", "platformFee:", "netAmount:", "orderCount:"]) if (settlementSchema.includes(forbidden)) violations.push({ file: openApiFile, line: 0, message: `CALLER_SUPPLIED_SETTLEMENT_FIELD_FORBIDDEN ${forbidden}` });

// 3b. Post-cutover authority graph. These assertions intentionally follow the
// live contract, registry, transport, response validator and consumers rather
// than checking for implementation files that were deleted during cutover.
const dshFacadeFile = "services/dsh/backend/internal/wlt/facade_client.go";
const dshFacade = readCanonicalSource(dshFacadeFile);
requireCanonicalMarkers(dshFacadeFile, dshFacade, [
  [/func \(c \*Client\) ExecuteFinanceRead/, "DSH_CANONICAL_FINANCE_READ_MISSING"],
  [/func \(c \*Client\) ExecuteFinanceWrite/, "DSH_CANONICAL_FINANCE_WRITE_MISSING"],
  [/Registry\.GetOperation\(opID\)/, "DSH_FINANCE_OPERATION_REGISTRY_NOT_ENFORCED"],
  [/setDelegatedOperatorContextHeader/, "DSH_OPERATOR_CONTEXT_NOT_BOUND_AT_FINANCE_TRANSPORT"],
  [/setRequiredMutationHeaders/, "DSH_FINANCE_MUTATION_HEADERS_NOT_ENFORCED"],
  [/normalizeFinanceResponse/, "DSH_FINANCE_RESPONSE_VALIDATION_NOT_ENFORCED"],
]);

const dshRegistryFile = "services/dsh/backend/internal/wlt/operation_registry.go";
const dshRegistry = readCanonicalSource(dshRegistryFile);
requireCanonicalMarkers(dshRegistryFile, dshRegistry, [
  [/type FinanceOperation struct/, "DSH_FINANCE_OPERATION_DESCRIPTOR_MISSING"],
  [/type OperationRegistry struct/, "DSH_FINANCE_OPERATION_REGISTRY_MISSING"],
  [/var Registry = NewOperationRegistry\(\)/, "DSH_FINANCE_OPERATION_REGISTRY_NOT_CANONICAL"],
  [/write\("finance\.settlements\.create", http\.MethodPost, "\/wlt\/settlements", "finance\.manage", "settlement", FinanceResponseObject, true, false\)/, "DSH_SETTLEMENT_OPERATION_DESCRIPTOR_DRIFT"],
  [/write\("finance\.payout_destinations\.upsert", http\.MethodPut, "\/wlt\/payout-destinations\/\{actorType\}\/\{actorId\}", "finance\.manage", "payoutDestination", FinanceResponseObject, true, true\)/, "DSH_PAYOUT_UPSERT_OPERATION_DESCRIPTOR_DRIFT"],
  [/write\("finance\.payout_destinations\.verify", http\.MethodPost, "\/wlt\/payout-destinations\/\{actorType\}\/\{actorId\}\/verify", "finance\.payout_destinations\.verify", "payoutDestination", FinanceResponseObject, true, true\)/, "DSH_PAYOUT_VERIFY_OPERATION_DESCRIPTOR_DRIFT"],
  [/write\("finance\.payout_destinations\.deactivate", http\.MethodPost, "\/wlt\/payout-destinations\/\{actorType\}\/\{actorId\}\/deactivate", "finance\.payout_destinations\.deactivate", "", FinanceResponseNoContent, true, true\)/, "DSH_PAYOUT_DEACTIVATE_OPERATION_DESCRIPTOR_DRIFT"],
  [/RequiresIdempotencyKey bool/, "DSH_FINANCE_IDEMPOTENCY_DESCRIPTOR_MISSING"],
  [/RequiresDelegatedActor bool/, "DSH_FINANCE_DELEGATED_ACTOR_DESCRIPTOR_MISSING"],
  [/ResponseContract\s+FinanceResponseContract/, "DSH_FINANCE_RESPONSE_CONTRACT_DESCRIPTOR_MISSING"],
]);

const dshContextFile = "services/dsh/backend/internal/wlt/operator_context_context.go";
const dshContext = readCanonicalSource(dshContextFile);
requireCanonicalMarkers(dshContextFile, dshContext, [
  [/func WithOperatorContext/, "DSH_OPERATOR_CONTEXT_BINDING_MISSING"],
  [/func OperatorContextIDFromContext/, "DSH_OPERATOR_CONTEXT_READBACK_MISSING"],
  [/type OperatorContextRoundTripper/, "DSH_OPERATOR_CONTEXT_ROUND_TRIPPER_MISSING"],
  [/X-Delegated-Operator-Context/, "DSH_OPERATOR_CONTEXT_HEADER_CONTRACT_MISSING"],
]);

const dshResponseContractFile = "services/dsh/backend/internal/wlt/finance_response_contract.go";
const dshResponseContract = readCanonicalSource(dshResponseContractFile);
requireCanonicalMarkers(dshResponseContractFile, dshResponseContract, [
  [/func validateFinanceResponseContentType/, "DSH_FINANCE_CONTENT_TYPE_VALIDATION_MISSING"],
  [/func validateFinanceSuccessBody/, "DSH_FINANCE_SUCCESS_BODY_VALIDATION_MISSING"],
  [/func validateFinanceErrorBody/, "DSH_FINANCE_ERROR_BODY_VALIDATION_MISSING"],
  [/func normalizeFinanceResponse/, "DSH_FINANCE_RESPONSE_NORMALIZER_MISSING"],
]);

const dshFacadeSurfaceFile = "services/dsh/backend/internal/http/financeproxy.go";
const dshFacadeSurface = readCanonicalSource(dshFacadeSurfaceFile);
requireCanonicalMarkers(dshFacadeSurfaceFile, dshFacadeSurface, [
  [/func \(s \*protectedStoreServer\) handleFacadeRead/, "DSH_APPLICATION_FINANCE_READ_FACADE_MISSING"],
  [/func \(s \*protectedStoreServer\) handleFacadeWrite/, "DSH_APPLICATION_FINANCE_WRITE_FACADE_MISSING"],
  [/ExecuteFinanceRead/, "DSH_APPLICATION_FINANCE_READ_NOT_BOUND_TO_WLT_FACADE"],
  [/ExecuteFinanceWrite/, "DSH_APPLICATION_FINANCE_WRITE_NOT_BOUND_TO_WLT_FACADE"],
]);

for (const [file, markers] of [
  ["services/dsh/backend/internal/http/payout_destination_finance_control.go", [
    [/ExecuteFinanceRead/, "DSH_PAYOUT_READ_SURFACE_NOT_BOUND_TO_CANONICAL_FACADE"],
    [/ExecuteFinanceWrite/, "DSH_PAYOUT_WRITE_SURFACE_NOT_BOUND_TO_CANONICAL_FACADE"],
    [/finance\.payout_destinations\.upsert/, "DSH_PAYOUT_UPSERT_SURFACE_OPERATION_MISSING"],
    [/finance\.payout_destinations\.verify/, "DSH_PAYOUT_VERIFY_SURFACE_OPERATION_MISSING"],
    [/finance\.payout_destinations\.deactivate/, "DSH_PAYOUT_DEACTIVATE_SURFACE_OPERATION_MISSING"],
  ]],
  ["services/dsh/backend/internal/http/representative_finance_routes.go", [
    [/ExecuteFinanceRead/, "DSH_REPRESENTATIVE_FINANCE_SURFACE_NOT_BOUND_TO_CANONICAL_FACADE"],
    [/finance\.wallet\.read/, "DSH_REPRESENTATIVE_WALLET_OPERATION_MISSING"],
  ]],
]) {
  const source = readCanonicalSource(file);
  requireCanonicalMarkers(file, source, markers);
}

const payoutAdapterFile = "services/dsh/backend/internal/wlt/payout_destination.go";
const payoutAdapter = readCanonicalSource(payoutAdapterFile);
requireCanonicalMarkers(payoutAdapterFile, payoutAdapter, [
  [/func \(c \*Client\) GetPayoutDestination/, "DSH_PAYOUT_READBACK_ADAPTER_MISSING"],
  [/ExecuteFinanceRead/, "DSH_PAYOUT_READBACK_BYPASSES_CANONICAL_FACADE"],
  [/func \(c \*Client\) DeactivatePayoutDestination/, "DSH_PAYOUT_DEACTIVATION_ADAPTER_MISSING"],
  [/ExecuteFinanceWrite/, "DSH_PAYOUT_DEACTIVATION_BYPASSES_CANONICAL_FACADE"],
  [/decodePayoutDestinationRef/, "DSH_PAYOUT_READBACK_IDENTITY_VALIDATION_MISSING"],
]);
const payoutOutboxFile = "services/dsh/backend/internal/partnerwltoutbox/outbox.go";
const payoutOutbox = readCanonicalSource(payoutOutboxFile);
requireCanonicalMarkers(payoutOutboxFile, payoutOutbox, [
  [/client\.GetPayoutDestination/, "DSH_PAYOUT_RECONCILIATION_READBACK_NOT_BOUND"],
  [/client\.DeactivatePayoutDestination/, "DSH_PAYOUT_OUTBOX_MUTATION_NOT_BOUND"],
  [/wlt\.WithOperatorContext/, "DSH_PAYOUT_OUTBOX_OPERATOR_CONTEXT_NOT_PROPAGATED"],
]);

const payoutContractFile = "services/wlt/contracts/wlt.payouts-destinations.openapi.yaml";
const payoutContract = readCanonicalSource(payoutContractFile);
requireCanonicalMarkers(payoutContractFile, payoutContract, [
  [/x-bthwani-owner:\s*services\/wlt/, "WLT_PAYOUT_CONTRACT_OWNER_MISSING"],
  [/x-bthwani-contract-state:\s*CONTRACT_ACTIVE/, "WLT_PAYOUT_CONTRACT_STATE_MISSING"],
  [/\/wlt\/payout-destinations\/\{actorType\}\/\{actorId\}:/, "WLT_TYPED_PAYOUT_CONTRACT_ROUTE_MISSING"],
  [/operationId: getWltTypedPayoutDestination/, "WLT_PAYOUT_READ_OPERATION_MISSING"],
  [/operationId: upsertWltTypedPayoutDestination/, "WLT_PAYOUT_UPSERT_OPERATION_MISSING"],
  [/operationId: verifyWltOfficialWalletDestination/, "WLT_PAYOUT_VERIFY_OPERATION_MISSING"],
  [/operationId: deactivateWltTypedPayoutDestination/, "WLT_PAYOUT_DEACTIVATE_OPERATION_MISSING"],
]);
if (payoutContract.includes("/wlt/payout-destinations/{partnerId}")) {
  violations.push({ file: payoutContractFile, line: 0, message: "WLT_RETIRED_PARTNER_ONLY_PAYOUT_ROUTE_REINTRODUCED" });
}

const generatedAuthorityChecks = [
  ["services/dsh/contracts/generated/dsh.bundle.openapi.yaml", [
    [/\/dsh\/control-panel\/finance\/settlements\/from-delivered-orders/, "DSH_GENERATED_SETTLEMENT_CONTRACT_MISSING"],
    [/\/dsh\/control-panel\/finance\/payout-destinations\/\{actorType\}\/\{actorId\}/, "DSH_GENERATED_PAYOUT_CONTRACT_MISSING"],
  ]],
  ["services/wlt/contracts/generated/wlt.bundle.openapi.yaml", [
    [/createWltEvidenceBackedSettlement/, "WLT_GENERATED_SETTLEMENT_CONTRACT_MISSING"],
    [/getWltTypedPayoutDestination/, "WLT_GENERATED_PAYOUT_READ_CONTRACT_MISSING"],
    [/deactivateWltTypedPayoutDestination/, "WLT_GENERATED_PAYOUT_DEACTIVATE_CONTRACT_MISSING"],
  ]],
  ["services/wlt/clients/generated/wlt-api.ts", [
    [/createWltEvidenceBackedSettlement/, "WLT_GENERATED_FINANCIAL_CLIENT_MISSING_SETTLEMENT"],
    [/getWltTypedPayoutDestination/, "WLT_GENERATED_FINANCIAL_CLIENT_MISSING_PAYOUT_READ"],
    [/deactivateWltTypedPayoutDestination/, "WLT_GENERATED_FINANCIAL_CLIENT_MISSING_PAYOUT_DEACTIVATE"],
  ]],
  ["services/dsh/contracts/contract.manifest.yaml", [
    [/^client:\s+\.\.\/clients\/generated\/dsh-api\.ts$/m, "DSH_GENERATED_CLIENT_MANIFEST_BINDING_MISSING"],
    [/^regenerateScript:\s+pnpm run openapi:generate:dsh$/m, "DSH_GENERATED_CLIENT_REGENERATION_BINDING_MISSING"],
  ]],
  ["services/wlt/contracts/contract.manifest.yaml", [
    [/^client:\s+\.\.\/clients\/generated\/wlt-api\.ts$/m, "WLT_GENERATED_CLIENT_MANIFEST_BINDING_MISSING"],
    [/^regenerateScript:\s+pnpm run openapi:generate:wlt$/m, "WLT_GENERATED_CLIENT_REGENERATION_BINDING_MISSING"],
  ]],
];
for (const [file, markers] of generatedAuthorityChecks) {
  const source = readCanonicalSource(file);
  requireCanonicalMarkers(file, source, markers);
}

// Negative space is fail-closed: retired source files, old actor-scoped
// writers, and duplicate literal settlement/payout transports are violations.
const dshBackendRoot = path.join(repoRoot, "services/dsh/backend/internal");
const wltBackendRoot = path.join(repoRoot, "services/wlt/backend/internal");
const retiredTransportPaths = [
  "services/dsh/backend/internal/wlt/actor_finance_client.go",
  "services/dsh/backend/internal/wlt/settlement_client.go",
  "services/dsh/backend/internal/wlt/legacy_test_compat_test.go",
  "services/dsh/backend/internal/wlt/payment_scope_transport_test.go",
];
for (const file of retiredTransportPaths) {
  if (fs.existsSync(path.join(repoRoot, file))) violations.push({ file, line: 0, message: "RETIRED_FINANCIAL_TRANSPORT_REINTRODUCED" });
}

const retiredDeclarationPatterns = [
  [/func \(c \*Client\) Finance(?:Read|Upsert|Deactivate)PayoutDestinationWithOperatorContext\s*\(/, "RETIRED_ACTOR_SCOPED_PAYOUT_WRITER_REINTRODUCED"],
  [/func \(c \*Client\) FinanceWriteWithOperatorContext\s*\(/, "RETIRED_FREEFORM_FINANCE_WRITER_REINTRODUCED"],
  [/func \(c \*Client\) FinanceRead\s*\(/, "RETIRED_FREEFORM_FINANCE_READER_REINTRODUCED"],
  [/\bFinanceWriteSettlement\b/, "RETIRED_SETTLEMENT_WRITER_REINTRODUCED"],
  [/\btype CreateSettlementInput\b|\bfunc CreateSettlement\s*\(/, "RETIRED_CALLER_SUPPLIED_SETTLEMENT_AUTHORITY_REINTRODUCED"],
  [/\bfunc HandleCreateSettlement\s*\(/, "RETIRED_SETTLEMENT_HANDLER_REINTRODUCED"],
  [/\bfunc GetPaymentSessionByCheckoutIntent\s*\(/, "RETIRED_UNSCOPED_PAYMENT_READ_REINTRODUCED"],
  [/\bfunc (?:Get|Post)Settlement\s*\(/, "RETIRED_UNSCOPED_SETTLEMENT_ACCESSOR_REINTRODUCED"],
  [/\bfunc UpsertGovernedCommissionPolicy\s*\(/, "RETIRED_NON_IDEMPOTENT_COMMISSION_ADAPTER_REINTRODUCED"],
];
for (const filePath of [...listGoFiles(dshBackendRoot), ...listGoFiles(wltBackendRoot)]) {
  const file = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
  if (file.endsWith("_test.go")) continue;
  const source = fs.readFileSync(filePath, "utf8");
  for (const [pattern, message] of retiredDeclarationPatterns) {
    const match = pattern.exec(source);
    if (match) violations.push({ file, line: lineNumber(source, match.index), message });
  }
}

const duplicateFinanceRouteLiterals = [
  ["/wlt/settlements", new Set(["services/dsh/backend/internal/wlt/operation_registry.go"])],
  ["/wlt/payout-destinations", new Set(["services/dsh/backend/internal/wlt/operation_registry.go"])],
];
for (const filePath of listGoFiles(dshBackendRoot)) {
  const file = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
  if (file.endsWith("_test.go")) continue;
  const source = fs.readFileSync(filePath, "utf8");
  for (const [literal, allowedFiles] of duplicateFinanceRouteLiterals) {
    if (source.includes(literal) && !allowedFiles.has(file)) {
      violations.push({ file, line: lineNumber(source, source.indexOf(literal)), message: `DUPLICATE_FINANCE_TRANSPORT_LITERAL ${literal}` });
    }
  }
}

const dshPaymentClientFile = "services/dsh/backend/internal/wlt/client.go";
const dshPaymentClient = readCanonicalSource(dshPaymentClientFile);
const paymentInputMatch = dshPaymentClient.match(/type CreatePaymentSessionInput struct \{([\s\S]*?)\n\}/);
if (paymentInputMatch?.[1].includes("OperatorContextID")) {
  violations.push({ file: dshPaymentClientFile, line: 0, message: "DSH_PAYMENT_SESSION_COMPILE_ONLY_OPERATOR_CONTEXT_FIELD_REINTRODUCED" });
}

// 4. Subscription purchases must use the dedicated commercial payment-session route.
function requireCommercialText(file, text, message) {
  const source = readCanonicalSource(file);
  if (!source.includes(text)) violations.push({ file, line: 0, message });
  return source;
}
const genericHandler = requireCommercialText("services/wlt/backend/internal/reference/payment_session_create_handler.go", "subscription purchases must use /wlt/commercial/payment-sessions", "GENERIC_PAYMENT_ROUTE_ACCEPTS_SUBSCRIPTION");
if (!genericHandler.includes("input.SubscriptionPurchaseID") || !genericHandler.includes("input.CommercialProductReference")) violations.push({ file: "services/wlt/backend/internal/reference/payment_session_create_handler.go", line: 0, message: "GENERIC_PAYMENT_ROUTE_SOURCE_GUARD_MISSING" });
const commercialRouter = requireCommercialText("services/wlt/backend/internal/http/server.go", "POST /wlt/commercial/payment-sessions", "SUBSCRIPTION_PAYMENT_ROUTE_NOT_REGISTERED");
if (!commercialRouter.includes("commercial.HandleCreateSubscriptionPaymentSession")) violations.push({ file: "services/wlt/backend/internal/http/server.go", line: 0, message: "SUBSCRIPTION_PAYMENT_HANDLER_NOT_BOUND" });
requireCommercialText("services/wlt/contracts/wlt.commercial.openapi.yaml", "/wlt/commercial/payment-sessions:", "SUBSCRIPTION_PAYMENT_ROUTE_NOT_CONTRACTED");
const subscriptionClientSource = requireCommercialText("services/dsh/backend/internal/wlt/subscription_purchase.go", "/wlt/commercial/payment-sessions", "DSH_SUBSCRIPTION_CLIENT_NOT_USING_COMMERCIAL_ROUTE");
if (subscriptionClientSource.includes('"/wlt/payment-sessions"')) violations.push({ file: "services/dsh/backend/internal/wlt/subscription_purchase.go", line: 0, message: "DSH_SUBSCRIPTION_CLIENT_USES_GENERIC_PAYMENT_ROUTE" });
const boundSubscriptionClientFile = "services/dsh/backend/internal/wlt/subscription_payment_bound.go";
const boundSubscriptionClientSource = readCanonicalSource(boundSubscriptionClientFile);
if (!/CreateSubscriptionPaymentSession\(/.test(boundSubscriptionClientSource)) violations.push({ file: boundSubscriptionClientFile, line: 0, message: "DSH_BOUND_SUBSCRIPTION_CLIENT_NOT_DELEGATING_COMMERCIAL_ROUTE" });
if (boundSubscriptionClientSource.includes('"/wlt/payment-sessions"')) violations.push({ file: boundSubscriptionClientFile, line: 0, message: "DSH_BOUND_SUBSCRIPTION_CLIENT_USES_GENERIC_PAYMENT_ROUTE" });
const unsafeCommercialHelper = "services/dsh/backend/internal/wlt/subscription_payment_generic.go";
if (listFiles().includes(unsafeCommercialHelper)) violations.push({ file: unsafeCommercialHelper, line: 0, message: "UNSAFE_GENERIC_SUBSCRIPTION_PAYMENT_HELPER_REINTRODUCED" });

// Every DSH route that touches WLT-owned money must be declared in the DSH OpenAPI contract.
const financialRoutePattern = /\/(?:finance|wallet|refunds|commissions|settlements|payouts|cod)\b/i;
const financialRouteRegistrationPattern = /(?:mux|router)\.HandleFunc\("([A-Z]+) ([^"]+)"/g;
function listGoFiles(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...listGoFiles(fullPath));
    else if (entry.name.endsWith(".go") && !entry.name.endsWith("_test.go")) results.push(fullPath);
  }
  return results;
}
const registeredFinancialRoutes = new Set();
for (const filePath of listGoFiles(dshBackendRoot)) {
  const content = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = financialRouteRegistrationPattern.exec(content)) !== null) {
    const [, method, route] = match;
    if (financialRoutePattern.test(route)) registeredFinancialRoutes.add(`${method} ${route}`);
  }
}
const { bundle: dshBundleText } = await composeContext("dsh", { write: false });
const dshBundle = parse(dshBundleText);
const declaredDshOperations = new Set();
for (const [routePath, methods] of Object.entries(dshBundle.paths ?? {})) {
  for (const method of Object.keys(methods)) if (["get", "post", "put", "patch", "delete"].includes(method)) declaredDshOperations.add(`${method.toUpperCase()} ${routePath}`);
}
for (const route of [...registeredFinancialRoutes].sort()) if (!declaredDshOperations.has(route)) violations.push({ file: "services/dsh/contracts/dsh.openapi.yaml", line: 0, message: `UNDECLARED_FINANCIAL_ROUTE ${route} -- financial routes require a contract operation, not an allowlist exception` });

fail(guardId, violations);
