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
      message: `financial mutation belongs to WLT only. Policy source: governance/02_SERVICES_AND_SURFACES.md`
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
  ".github/workflows/"
];

const forbiddenPatterns = [
  /\bWLT_FINANCIAL_PROVIDER_MODE\s*=\s*production\b/i,
  /\bWLT_FINANCIAL_PROVIDER_BASE_URL\b/i,
  /\bwiremock-financial-provider\b/i,
  /\bfinancial\/(?:electricity|telecom|card|common)\b/i,
  /\b(?:card|payment|financial|electricity|telecom)[-_]?(?:gateway|provider)[-_]?(?:base[-_]?url|url|endpoint)\b/i
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
        message: "direct financial provider access belongs to services/wlt only"
      });
    }
  }
}

fail(guardId, violations);
