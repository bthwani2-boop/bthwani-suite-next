import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "nomenclature-guard";
const violations = [];

const ZERO_SHA = /^0+$/;
const JOURNEY_ID = /\bJRN[-_\s]?\d{3}\b/i;
const FORBIDDEN_PLATFORM_LABEL = /\b(?:SaaS|multi[-\s]?tenant|tenant)\b/i;
const USER_VISIBLE_PROP = /\b(?:title|subtitle|label|heading|description|message|placeholder|accessibilityLabel|emptyText|errorText|sectionTitle|tabLabel)\s*[:=]/i;
const PLATFORM_MODEL = "governance/product/platform-model.yaml";
const PRODUCT_POLICY = "governance/policies/product.md";
const SKILL_REGISTRY = "governance/skills/skills-registry.json";
const OBSOLETE_SAAS_AUTHORITY = /\b(?:conditional SaaS authority|SaaS activation|tenant activation|activating or implementing SaaS)\b/i;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function inUserFacingScope(file) {
  if (!/\.(?:tsx?|jsx?)$/i.test(file)) return false;
  if (/(?:^|\/)(?:tests?|__tests__|generated|clients\/generated)(?:\/|$)/i.test(file)) return false;
  return (
    /^apps\/[^/]+\/runtime\/src\//.test(file) ||
    /^services\/[^/]+\/frontend\//.test(file)
  );
}

function getChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMR", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];

  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
  } catch (error) {
    console.warn(`Unable to resolve changed files for ${baseSha || "<none>"}..${headSha}. Assuming no files changed. Error: ${error.message}`);
    return [];
  }
}

function getDiffContent(baseSha, headSha, file) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "-U0", baseSha, headSha, "--", file]
    : ["show", "-U0", headSha, "--", file];
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch {
    return "";
  }
}

function exposesInternalJourneyId(line) {
  if (!JOURNEY_ID.test(line)) return false;

  // Internal route names, imports, identifiers, test references and governed
  // capability IDs are legitimate. Only rendered JSX text and common UI-copy
  // properties are user-facing nomenclature boundaries.
  const jsxText = />[^<\r\n]*\bJRN[-_\s]?\d{3}\b[^<\r\n]*</i.test(line);
  const visibleProperty = USER_VISIBLE_PROP.test(line);
  return jsxText || visibleProperty;
}

function exposesForbiddenPlatformLabel(line) {
  if (!FORBIDDEN_PLATFORM_LABEL.test(line)) return false;
  const jsxText = />[^<\r\n]*\b(?:SaaS|multi[-\s]?tenant|tenant)\b[^<\r\n]*</i.test(line);
  const visibleProperty = USER_VISIBLE_PROP.test(line);
  return jsxText || visibleProperty;
}

function readRequired(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "REQUIRED_CANONICAL_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assertCanonicalPlatformModel() {
  const model = readRequired(PLATFORM_MODEL);
  if (!model) return;

  const requiredPatterns = [
    [/^classification:\s*UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_FINANCIAL_PLATFORM\s*$/m, "CANONICAL_PLATFORM_CLASSIFICATION_MISSING"],
    [/^\s*status:\s*NOT_APPLICABLE\s*$/m, "SAAS_STATUS_MUST_BE_NOT_APPLICABLE"],
    [/^\s*platformIsSaas:\s*false\s*$/m, "PLATFORM_MUST_NOT_BE_CLASSIFIED_AS_SAAS"],
    [/^\s*tenantEntityDefined:\s*false\s*$/m, "TENANT_ENTITY_MUST_REMAIN_UNDEFINED"],
    [/^\s*genericTenantIdAllowed:\s*false\s*$/m, "GENERIC_TENANT_ID_MUST_BE_FORBIDDEN"],
    [/^\s*partnerIsTenant:\s*false\s*$/m, "PARTNER_MUST_NOT_BE_TENANT"],
    [/^\s*storeIsTenant:\s*false\s*$/m, "STORE_MUST_NOT_BE_TENANT"],
    [/^\s*createsTenantBoundary:\s*false\s*$/m, "PARTNER_SUBSCRIPTION_MUST_NOT_CREATE_TENANT_BOUNDARY"],
    [/^\s*createsSaasLifecycle:\s*false\s*$/m, "PARTNER_SUBSCRIPTION_MUST_NOT_CREATE_SAAS_LIFECYCLE"],
  ];

  for (const [pattern, message] of requiredPatterns) {
    if (!pattern.test(model)) violations.push({ file: PLATFORM_MODEL, line: 0, message });
  }
}

function assertNoObsoleteSaasAuthorityReferences() {
  const registryText = readRequired(SKILL_REGISTRY);
  if (!registryText) return;

  let registry;
  try {
    registry = JSON.parse(registryText);
  } catch (error) {
    violations.push({ file: SKILL_REGISTRY, line: 0, message: `INVALID_SKILL_REGISTRY ${error.message}` });
    return;
  }

  for (const entry of registry.entries ?? []) {
    if (!["active", "conditional"].includes(entry.status)) continue;
    const skillPath = `${entry.path}/SKILL.md`;
    const content = readRequired(skillPath);
    if (content && OBSOLETE_SAAS_AUTHORITY.test(content)) {
      violations.push({
        file: skillPath,
        line: 0,
        message: "OBSOLETE_SAAS_AUTHORITY_REFERENCE — active skills must follow the canonical non-SaaS platform model",
      });
    }
  }
}

function assertCanonicalProductPolicy() {
  const policy = readRequired(PRODUCT_POLICY);
  if (!policy) return;
  if (!/BThwani\s+is\s+not\s+a\s+SaaS\s+product\s+and\s+does\s+not\s+define\s+tenants\./.test(policy)) {
    violations.push({ file: PRODUCT_POLICY, line: 0, message: "NON_SAAS_PRODUCT_POLICY_DECLARATION_MISSING" });
  }
  if (!/Partner\s+subscriptions\s+are\s+commercial\s+pricing\s+relationships\s+inside\s+the\s+platform/.test(policy)) {
    violations.push({ file: PRODUCT_POLICY, line: 0, message: "PARTNER_SUBSCRIPTION_BOUNDARY_DECLARATION_MISSING" });
  }
}

assertCanonicalPlatformModel();
assertCanonicalProductPolicy();
assertNoObsoleteSaasAuthorityReferences();

const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";

const files = getChangedFiles(baseSha, headSha).filter(inUserFacingScope);

for (const file of files) {
  const diff = getDiffContent(baseSha, headSha, file);
  const lines = diff.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const added = line.slice(1);

    if (exposesInternalJourneyId(added)) {
      violations.push({
        file,
        line: 0,
        message: "INTERNAL_JOURNEY_ID_EXPOSED_TO_USER — replace the identifier with an objective product label",
      });
      break;
    }

    if (exposesForbiddenPlatformLabel(added)) {
      violations.push({
        file,
        line: 0,
        message: "FORBIDDEN_SAAS_OR_TENANT_LABEL_EXPOSED_TO_USER — use the actual operator, organization, partner, store, or subscription concept",
      });
      break;
    }
  }
}

fail(guardId, violations);
