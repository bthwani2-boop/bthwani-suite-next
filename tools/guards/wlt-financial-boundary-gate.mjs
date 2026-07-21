import { fail, lineNumber, listCodeFiles, listFiles, read } from "./_guard-utils.mjs";

const guardId = "wlt-financial-boundary-gate";
const violations = [];

// 1. no-financial-mutation-outside-wlt
const mutationRegex = /\b(createLedger|appendLedger|mutateWallet|setWalletBalance|updateWalletBalance|confirmPaymentProviderResult|createPayout|settlePayout|createRefund|settleRefund|markSettlement|walletBalance\s*=|ledgerEntries\.push|settlementStatus\s*=|payoutStatus\s*=|refundStatus\s*=)\b/g;

for (const file of listCodeFiles()) {
  if (file.startsWith("services/wlt/")) continue;
  if (
    file.startsWith("governance/") ||
    file.startsWith("contracts/") ||
    file.startsWith("tools/")
  ) {
    continue;
  }
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  let match;
  while ((match = mutationRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "financial mutation belongs to WLT only. Policy source: governance/02_SERVICES_AND_SURFACES.md",
    });
  }
}

// 2. no-direct-financial-provider-access-outside-wlt
const allowedPrefixes = [
  "services/wlt/",
  "infra/docker/",
  "docs/runtime/",
  ".devcontainer/",
  "package.json",
  "tools/guards/wlt-financial-boundary-gate.mjs",
  "tools/guards/live-cross-journey-integrity-gate.mjs",
  "tools/scripts/smoke-wiremock-financial-provider.ps1",
  "tools/scripts/smoke-wlt-provider-through-wlt.ps1",
  "tools/scripts/smoke-wlt-payout-provider.ps1",
  "tools/scripts/financial-simulator-local.ps1",
  ".github/workflows/",
];

const forbiddenPatterns = [
  /\bWLT_FINANCIAL_PROVIDER_MODE\s*=\s*production\b/i,
  /\bWLT_FINANCIAL_PROVIDER_BASE_URL\b/i,
  /\bwiremock-financial-provider\b/i,
  /\bfinancial\/(?:electricity|telecom|card|common)\b/i,
  /\b(?:card|payment|financial|electricity|telecom)[-_]?(?:gateway|provider)[-_]?(?:base[-_]?url|url|endpoint)\b/i,
];

function isAllowed(file) {
  return allowedPrefixes.some((prefix) => file.startsWith(prefix));
}

for (const file of listFiles()) {
  if (isAllowed(file)) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  for (const pattern of forbiddenPatterns) {
    const match = pattern.exec(content);
    if (match) {
      violations.push({
        file,
        line: lineNumber(content, match.index),
        message: "direct financial provider access belongs to services/wlt only",
      });
    }
  }
}

// 3. governed settlement creation must stay fully source-derived and WLT-owned.
const operationStateFile = "services/wlt/contracts/operation-state.json";
let operationState;
try {
  operationState = JSON.parse(read(operationStateFile));
} catch (error) {
  violations.push({
    file: operationStateFile,
    line: 0,
    message: `INVALID_WLT_OPERATION_STATE ${error instanceof Error ? error.message : String(error)}`,
  });
}

const settlementOperation = operationState?.operations?.find(
  (operation) => operation.operationId === "createWltSettlement",
);
if (!settlementOperation) {
  violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_OPERATION_STATE_MISSING" });
} else {
  if (settlementOperation.method !== "POST" || settlementOperation.path !== "/wlt/settlements") {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_OPERATION_ROUTE_DRIFT" });
  }
  if (settlementOperation.state !== "CONTRACT_ACTIVE") {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_MUST_BE_CONTRACT_ACTIVE" });
  }
  if (settlementOperation.runtimeStatus !== 201 || settlementOperation.runtimeCode !== "SETTLEMENT_CREATED") {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_ACTIVE_RESPONSE_DRIFT" });
  }
  if (!Array.isArray(settlementOperation.activationEvidence) || settlementOperation.activationEvidence.length < 8) {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_ACTIVATION_EVIDENCE_INCOMPLETE" });
  }
}

const settlementSourceFile = "services/wlt/backend/internal/settlement/governed_source.go";
const settlementSource = read(settlementSourceFile);
for (const [pattern, message] of [
  [/func CreateSettlementFromDeliveredOrders/, "GOVERNED_SETTLEMENT_CREATOR_MISSING"],
  [/wlt_settlement_policies/, "SETTLEMENT_POLICY_SOURCE_MISSING"],
  [/fee_basis_points/, "SETTLEMENT_FEE_POLICY_MISSING"],
  [/wlt_settlement_source_orders/, "SETTLEMENT_SOURCE_ORDER_LOCK_MISSING"],
  [/duplicate orderId|ErrSettlementOrderAlreadyUsed/, "SETTLEMENT_DUPLICATE_ORDER_PROTECTION_MISSING"],
  [/addPositiveMinorUnits[\s\S]*ErrSettlementAmountOverflow/, "SETTLEMENT_GROSS_OVERFLOW_PROTECTION_MISSING"],
  [/settlementFeeFromBasisPoints[\s\S]*grossAmount\s*\/\s*10000/, "SETTLEMENT_FEE_OVERFLOW_PROTECTION_MISSING"],
  [/grossAmount[\s\S]*platformFee[\s\S]*netAmount/, "SETTLEMENT_SERVER_ARITHMETIC_MISSING"],
  [/BeginTx[\s\S]*INSERT INTO wlt_settlements[\s\S]*INSERT INTO wlt_settlement_source_orders[\s\S]*tx\.Commit/, "SETTLEMENT_SOURCE_AND_RECORD_NOT_ATOMIC"],
]) {
  if (!pattern.test(settlementSource)) {
    violations.push({ file: settlementSourceFile, line: 0, message });
  }
}

const settlementPostingFile = "services/wlt/backend/internal/settlement/settlement.go";
const settlementPosting = read(settlementPostingFile);
for (const [pattern, message] of [
  [/WHERE id = \$1 AND status = 'pending'/, "SETTLEMENT_POST_MUST_REQUIRE_PENDING_STATE"],
  [/platform_payable[\s\S]*wallet[\s\S]*platform_revenue/, "SETTLEMENT_BALANCED_ACCOUNTING_LINES_MISSING"],
  [/BeginTx[\s\S]*PostLedgerTransaction[\s\S]*tx\.Commit/, "SETTLEMENT_STATE_AND_JOURNAL_NOT_ATOMIC"],
]) {
  if (!pattern.test(settlementPosting)) {
    violations.push({ file: settlementPostingFile, line: 0, message });
  }
}

const dshSourceFile = "services/dsh/backend/internal/http/finance_settlement_sources.go";
const dshSource = read(dshSourceFile);
for (const [pattern, message] of [
  [/o\.status = 'delivered'/, "DSH_SETTLEMENT_MUST_USE_DELIVERED_ORDERS"],
  [/dsh_order_status_events/, "DSH_SETTLEMENT_DELIVERED_EVENT_SOURCE_MISSING"],
  [/o\.subtotal_minor_units/, "DSH_SETTLEMENT_IMMUTABLE_SUBTOTAL_SOURCE_MISSING"],
  [/o\.currency/, "DSH_SETTLEMENT_ORDER_CURRENCY_SOURCE_MISSING"],
  [/o\.pricing_snapshot_hash/, "DSH_SETTLEMENT_PRICING_SNAPSHOT_GATE_MISSING"],
  [/orderSources/, "DSH_SETTLEMENT_SOURCE_PAYLOAD_MISSING"],
  [/FinanceWriteSettlement/, "DSH_SETTLEMENT_WLT_BOUNDARY_MISSING"],
]) {
  if (!pattern.test(dshSource)) {
    violations.push({ file: dshSourceFile, line: 0, message });
  }
}
if (/dsh_order_items|SUM\s*\(\s*oi\.unit_price/i.test(dshSource)) {
  violations.push({ file: dshSourceFile, line: 0, message: "DSH_SETTLEMENT_MUST_NOT_RECOMPUTE_ORDER_PRICING" });
}
const settlementRequestMatch = dshSource.match(/type createGovernedSettlementRequest struct \{([\s\S]*?)\n\}/);
const settlementRequest = settlementRequestMatch?.[1] ?? "";
for (const forbidden of ["Currency", "GrossAmount", "PlatformFee", "NetAmount", "OrderCount", "OrderSources"]) {
  if (settlementRequest.includes(forbidden)) {
    violations.push({ file: dshSourceFile, line: 0, message: `CONTROL_PANEL_SETTLEMENT_INPUT_FORBIDDEN_FIELD ${forbidden}` });
  }
}

const dshClientFile = "services/dsh/backend/internal/wlt/settlement_client.go";
const dshClient = read(dshClientFile);
if (!/method == http\.MethodPost && path == "\/wlt\/settlements"/.test(dshClient)) {
  violations.push({ file: dshClientFile, line: 0, message: "DSH_SETTLEMENT_WRITE_ALLOWLIST_MISSING" });
}

const wltServerFile = "services/wlt/backend/internal/http/server.go";
const wltServer = read(wltServerFile);
if (!/POST \/wlt\/settlements["`],\s*gate\(serviceAuth\(settlement\.HandleCreateSettlementFromDeliveredOrders\(db\)\)\)/.test(wltServer)) {
  violations.push({ file: wltServerFile, line: 0, message: "WLT_GOVERNED_SETTLEMENT_ROUTE_BINDING_DRIFT" });
}
if (!/PUT \/wlt\/settlement-policies\/\{partnerId\}/.test(wltServer)) {
  violations.push({ file: wltServerFile, line: 0, message: "WLT_SETTLEMENT_POLICY_ROUTE_MISSING" });
}

const dshServerFile = "services/dsh/backend/internal/http/server.go";
const dshServer = read(dshServerFile);
for (const marker of [
  "POST /dsh/control-panel/finance/settlements/from-delivered-orders",
  "PUT /dsh/control-panel/finance/settlement-policies/{partnerId}",
]) {
  if (!dshServer.includes(marker)) {
    violations.push({ file: dshServerFile, line: 0, message: `DSH_SETTLEMENT_ROUTE_MISSING ${marker}` });
  }
}

const openApiFile = "services/wlt/contracts/wlt.openapi.yaml";
const openApi = read(openApiFile);
const settlementPathStart = openApi.indexOf("  /wlt/settlements:");
const settlementPathEnd = openApi.indexOf("\n  /wlt/settlements/summary:", settlementPathStart);
const settlementContract = settlementPathStart >= 0
  ? openApi.slice(settlementPathStart, settlementPathEnd > settlementPathStart ? settlementPathEnd : undefined)
  : "";
for (const marker of [
  "operationId: createWltSettlement",
  "x-bthwani-mutation-approved: true",
  "x-bthwani-default-enabled: false",
]) {
  if (!settlementContract.includes(marker)) {
    violations.push({ file: openApiFile, line: 0, message: `SETTLEMENT_OPENAPI_ACTIVE_MARKER_MISSING ${marker}` });
  }
}
const settlementSchemaStart = openApi.indexOf("    WltCreateSettlementRequest:");
const settlementSchemaEnd = openApi.indexOf("\n    WltSettlementResponse:", settlementSchemaStart);
const settlementSchema = settlementSchemaStart >= 0
  ? openApi.slice(settlementSchemaStart, settlementSchemaEnd > settlementSchemaStart ? settlementSchemaEnd : undefined)
  : "";
for (const marker of ["orderSources", "orderId", "grossAmountMinorUnits", "deliveredAt", "operatorId"]) {
  if (!settlementSchema.includes(marker)) {
    violations.push({ file: openApiFile, line: 0, message: `SETTLEMENT_SOURCE_SCHEMA_MISSING ${marker}` });
  }
}
for (const forbidden of ["grossAmount:", "platformFee:", "netAmount:", "orderCount:"]) {
  if (settlementSchema.includes(forbidden)) {
    violations.push({ file: openApiFile, line: 0, message: `CALLER_SUPPLIED_SETTLEMENT_FIELD_FORBIDDEN ${forbidden}` });
  }
}

// 4. Subscription purchases must use the dedicated commercial payment-session
// route. The generic payment-session source must reject subscription fields,
// and DSH must not reintroduce a generic subscription-payment helper.
function requireCommercialText(file, text, message) {
  const source = read(file);
  if (!source.includes(text)) violations.push({ file, line: 0, message });
  return source;
}

const genericHandler = requireCommercialText(
  "services/wlt/backend/internal/reference/trusted_tenant_handler.go",
  "subscription purchases must use /wlt/commercial/payment-sessions",
  "GENERIC_PAYMENT_ROUTE_ACCEPTS_SUBSCRIPTION",
);
if (!genericHandler.includes("input.SubscriptionPurchaseID") || !genericHandler.includes("input.CommercialProductReference")) {
  violations.push({
    file: "services/wlt/backend/internal/reference/trusted_tenant_handler.go",
    line: 0,
    message: "GENERIC_PAYMENT_ROUTE_SOURCE_GUARD_MISSING",
  });
}

const commercialRouter = requireCommercialText(
  "services/wlt/backend/internal/http/server.go",
  "POST /wlt/commercial/payment-sessions",
  "SUBSCRIPTION_PAYMENT_ROUTE_NOT_REGISTERED",
);
if (!commercialRouter.includes("commercial.HandleCreateSubscriptionPaymentSession")) {
  violations.push({
    file: "services/wlt/backend/internal/http/server.go",
    line: 0,
    message: "SUBSCRIPTION_PAYMENT_HANDLER_NOT_BOUND",
  });
}

requireCommercialText(
  "services/wlt/contracts/wlt.commercial.openapi.yaml",
  "/wlt/commercial/payment-sessions:",
  "SUBSCRIPTION_PAYMENT_ROUTE_NOT_CONTRACTED",
);

for (const file of [
  "services/dsh/backend/internal/wlt/subscription_purchase.go",
  "services/dsh/backend/internal/wlt/subscription_payment_bound.go",
]) {
  const source = requireCommercialText(
    file,
    "/wlt/commercial/payment-sessions",
    "DSH_SUBSCRIPTION_CLIENT_NOT_USING_COMMERCIAL_ROUTE",
  );
  if (source.includes('"/wlt/payment-sessions"')) {
    violations.push({ file, line: 0, message: "DSH_SUBSCRIPTION_CLIENT_USES_GENERIC_PAYMENT_ROUTE" });
  }
}

const unsafeCommercialHelper = "services/dsh/backend/internal/wlt/subscription_payment_generic.go";
if (listFiles().includes(unsafeCommercialHelper)) {
  violations.push({
    file: unsafeCommercialHelper,
    line: 0,
    message: "UNSAFE_GENERIC_SUBSCRIPTION_PAYMENT_HELPER_REINTRODUCED",
  });
}

fail(guardId, violations);
