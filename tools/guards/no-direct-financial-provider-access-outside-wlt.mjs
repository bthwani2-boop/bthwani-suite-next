import { fail, lineNumber, listFiles, read } from "./_guard-utils.mjs";

const guardId = "no-direct-financial-provider-access-outside-wlt";
const violations = [];

const allowedPrefixes = [
  "services/wlt/",
  "infra/docker/",
  "docs/runtime/",
  "machine-readable/",
  ".devcontainer/",
  "package.json",
  "tools/guards/no-direct-financial-provider-access-outside-wlt.mjs",
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
