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
const PRODUCT_REQUIREMENTS = "governance/product/PRD.md";
const SKILL_REGISTRY = "governance/skills/skills-registry.json";
const OBSOLETE_PLATFORM_AUTHORITY = /\b(?:conditional SaaS authority|SaaS activation|tenant activation|activating or implementing SaaS)\b/i;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function inUserFacingScope(file) {
  if (!/\.(?:tsx?|jsx?)$/i.test(file)) return false;
  if (/(?:^|\/)(?:tests?|__tests__|generated|clients\/generated)(?:\/|$)/i.test(file)) return false;
  return /^apps\/[^/]+\/runtime\/src\//.test(file) || /^services\/[^/]+\/frontend\//.test(file);
}

function getChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMR", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/).map(normalizePath).filter(Boolean);
  } catch (error) {
    console.warn(`Unable to resolve changed files for ${baseSha || "<none>"}..${headSha}. Assuming no files changed. Error: ${error.message}`);
    return [];
  }
}

function getDiffContent(baseSha, headSha, file) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase ? ["diff", "-U0", baseSha, headSha, "--", file] : ["show", "-U0", headSha, "--", file];
  try { return execFileSync("git", args, { encoding: "utf8" }); } catch { return ""; }
}

function exposesInternalJourneyId(line) {
  if (!JOURNEY_ID.test(line)) return false;
  return />[^<\r\n]*\bJRN[-_\s]?\d{3}\b[^<\r\n]*</i.test(line) || USER_VISIBLE_PROP.test(line);
}

function exposesForbiddenPlatformLabel(line) {
  if (!FORBIDDEN_PLATFORM_LABEL.test(line)) return false;
  return />[^<\r\n]*\b(?:SaaS|multi[-\s]?tenant|tenant)\b[^<\r\n]*</i.test(line) || USER_VISIBLE_PROP.test(line);
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
  if (!/^classification:\s*UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_FINANCIAL_PLATFORM\s*$/m.test(model)) {
    violations.push({ file: PLATFORM_MODEL, line: 0, message: "CANONICAL_PLATFORM_CLASSIFICATION_MISSING" });
  }
}

function assertCanonicalProductRequirements() {
  const prd = readRequired(PRODUCT_REQUIREMENTS);
  if (!prd) return;
  if (!/BThwani is one unified multi-surface B2B2C commerce, fulfillment, operations, workforce, and financial platform\./.test(prd)) {
    violations.push({ file: PRODUCT_REQUIREMENTS, line: 0, message: "UNIFIED_PLATFORM_PRODUCT_DEFINITION_MISSING" });
  }
  if (!/Platform Context is the platform isolation boundary\./.test(prd)) {
    violations.push({ file: PRODUCT_REQUIREMENTS, line: 0, message: "PLATFORM_CONTEXT_BOUNDARY_DECLARATION_MISSING" });
  }
}

function assertNoObsoletePlatformAuthorityReferences() {
  const registryText = readRequired(SKILL_REGISTRY);
  if (!registryText) return;
  let registry;
  try { registry = JSON.parse(registryText); }
  catch (error) {
    violations.push({ file: SKILL_REGISTRY, line: 0, message: `INVALID_SKILL_REGISTRY ${error.message}` });
    return;
  }
  for (const entry of registry.entries ?? []) {
    if (!["active", "conditional"].includes(entry.status)) continue;
    const skillPath = `${entry.path}/SKILL.md`;
    const content = readRequired(skillPath);
    if (content && OBSOLETE_PLATFORM_AUTHORITY.test(content)) {
      violations.push({ file: skillPath, line: 0, message: "OBSOLETE_PLATFORM_AUTHORITY_REFERENCE — active skills must follow the canonical platform model" });
    }
  }
}

assertCanonicalPlatformModel();
assertCanonicalProductRequirements();
assertNoObsoletePlatformAuthorityReferences();

const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";
for (const file of getChangedFiles(baseSha, headSha).filter(inUserFacingScope)) {
  for (const line of getDiffContent(baseSha, headSha, file).split(/\r?\n/)) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const added = line.slice(1);
    if (exposesInternalJourneyId(added)) {
      violations.push({ file, line: 0, message: "INTERNAL_JOURNEY_ID_EXPOSED_TO_USER — replace the identifier with an objective product label" });
      break;
    }
    if (exposesForbiddenPlatformLabel(added)) {
      violations.push({ file, line: 0, message: "FORBIDDEN_SAAS_OR_TENANT_LABEL_EXPOSED_TO_USER — use the actual operator, organization, partner, store, or subscription concept" });
      break;
    }
  }
}

fail(guardId, violations);
