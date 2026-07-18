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

// 3. settlement creation remains fail-closed until a governed DSH source exists.
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
  if (settlementOperation.state !== "BLOCKED_UNTIL_GOVERNED_SOURCE") {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_MUST_REMAIN_BLOCKED" });
  }
  if (settlementOperation.runtimeStatus !== 409 || settlementOperation.runtimeCode !== "SETTLEMENT_SOURCE_REQUIRED") {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_FAIL_CLOSED_RESPONSE_DRIFT" });
  }
  if (!Array.isArray(settlementOperation.requiredBeforeEnablement) || settlementOperation.requiredBeforeEnablement.length < 8) {
    violations.push({ file: operationStateFile, line: 0, message: "CREATE_SETTLEMENT_ENABLEMENT_EVIDENCE_INCOMPLETE" });
  }
}

const settlementFile = "services/wlt/backend/internal/settlement/settlement.go";
const settlementSource = read(settlementFile);
for (const [pattern, message] of [
  [/func CreateSettlement[\s\S]*?return nil, ErrSettlementCalculationSourceRequired/, "CREATE_SETTLEMENT_NOT_FAIL_CLOSED"],
  [/SETTLEMENT_SOURCE_REQUIRED/, "CREATE_SETTLEMENT_RUNTIME_CODE_MISSING"],
  [/WHERE id = \$1 AND status = 'pending'/, "SETTLEMENT_POST_MUST_REQUIRE_PENDING_STATE"],
  [/platform_payable[\s\S]*wallet[\s\S]*platform_revenue/, "SETTLEMENT_BALANCED_ACCOUNTING_LINES_MISSING"],
  [/BeginTx[\s\S]*PostLedgerTransaction[\s\S]*tx\.Commit/, "SETTLEMENT_STATE_AND_JOURNAL_NOT_ATOMIC"],
]) {
  if (!pattern.test(settlementSource)) {
    violations.push({ file: settlementFile, line: 0, message });
  }
}
if (/INSERT INTO wlt_settlements/.test(settlementSource)) {
  violations.push({ file: settlementFile, line: 0, message: "CALLER_SUPPLIED_SETTLEMENT_INSERT_FORBIDDEN" });
}

const allFiles = new Set(listFiles());
for (const duplicatePath of [
  "services/wlt/backend/internal/settlement/sovereign_settlement.go",
  "services/dsh/backend/internal/wlt/settlement_client.go",
]) {
  if (allFiles.has(duplicatePath)) {
    violations.push({
      file: duplicatePath,
      line: 0,
      message: duplicatePath.includes("settlement_client")
        ? "DSH_SETTLEMENT_WRITE_CLIENT_FORBIDDEN_WHILE_SOURCE_BLOCKED"
        : "DUPLICATE_SETTLEMENT_IMPLEMENTATION_FORBIDDEN",
    });
  }
}

for (const file of listCodeFiles()) {
  if (!file.startsWith("services/dsh/backend/")) continue;
  const content = read(file);
  const match = /FinanceWriteSettlement|["`]\/wlt\/settlements["`][\s\S]{0,160}(?:POST|MethodPost)/.exec(content);
  if (match) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "DSH_SETTLEMENT_CREATE_CALL_FORBIDDEN_WHILE_OPERATION_BLOCKED",
    });
  }
}

const wltServerFile = "services/wlt/backend/internal/http/server.go";
const wltServer = read(wltServerFile);
if (!/POST \/wlt\/settlements["`],\s*gate\(serviceAuth\(settlement\.HandleCreateSettlement\(db\)\)\)/.test(wltServer)) {
  violations.push({ file: wltServerFile, line: 0, message: "WLT_SETTLEMENT_ROUTE_BINDING_DRIFT" });
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
  "x-bthwani-mutation-approved: false",
  "x-bthwani-default-enabled: false",
]) {
  if (!settlementContract.includes(marker)) {
    violations.push({ file: openApiFile, line: 0, message: `SETTLEMENT_OPENAPI_FAIL_CLOSED_MARKER_MISSING ${marker}` });
  }
}

const financeProxyFile = "services/dsh/backend/internal/http/financeproxy.go";
const financeProxy = read(financeProxyFile);
if (/FinanceWrite[\s\S]{0,300}["`]\/wlt\/settlements["`]/.test(financeProxy)) {
  violations.push({ file: financeProxyFile, line: 0, message: "DSH_SETTLEMENT_CREATE_PROXY_FORBIDDEN_WHILE_OPERATION_BLOCKED" });
}

fail(guardId, violations);
