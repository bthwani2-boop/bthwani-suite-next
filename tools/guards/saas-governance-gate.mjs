import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "saas-governance-gate";
const violations = [];

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function trackedTextFiles() {
  const extensions = new Set([
    ".cjs",
    ".go",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ps1",
    ".sh",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
  ]);
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
      .split("\0")
      .filter(Boolean)
      .filter((file) => extensions.has(path.extname(file).toLowerCase()));
  } catch (error) {
    violations.push({ file: ".", line: 0, message: `TRACKED_FILE_SCAN_FAILED ${error.message}` });
    return [];
  }
}

const statePath = "governance/saas/saas-governance.json";
const schemaPath = "governance/saas/saas-governance.schema.json";
const annexPath = "governance/operational_journey_protocol_package/annexes/PARTNER_SAAS_CAPABILITY_AND_ISOLATION_GATES.md";
const decisionsPath = "governance/contracts/decision-vocabulary.json";
const runtimeEnvPath = "infra/docker/env/runtime.env.example";
const composePath = "infra/docker/compose.runtime.yml";
const platformModelPath = "governance/product/platform-model.yaml";
const platformContractPath = "governance/product/contracts/bthwani-platform-model.product-truth.json";
const productSchemaPath = "governance/product/product-truth.schema.json";

const state = readJson(statePath);
const schema = readJson(schemaPath);
const decisions = readJson(decisionsPath);
const annex = readText(annexPath);
const runtimeEnv = readText(runtimeEnvPath);
const compose = readText(composePath);
const platformModel = readText(platformModelPath);
const platformContract = readJson(platformContractPath);
const productSchema = readJson(productSchemaPath);

const canonicalClassification =
  "UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_FINANCIAL_PLATFORM_WITH_PARTNER_SAAS_CAPABILITIES";
const canonicalPartnerModel = {
  partnerAccessModel: "MANAGED_PARTNER_SAAS_CAPABILITY",
  partnerSaasModel: "EMBEDDED_PLATFORM_CAPABILITY",
};

if (state && schema) {
  try {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(state)) {
      for (const error of validate.errors ?? []) {
        violations.push({
          file: statePath,
          line: 0,
          message: `PARTNER_SAAS_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}`,
        });
      }
    }
  } catch (error) {
    violations.push({ file: schemaPath, line: 0, message: `PARTNER_SAAS_SCHEMA_COMPILE_FAILURE ${error.message}` });
  }
}

const canonicalDecisions = new Set((decisions?.canonicalDecisions ?? []).map((entry) => entry.id));
if (state && !canonicalDecisions.has(state.canonicalDecision)) {
  violations.push({ file: statePath, line: 0, message: `NONCANONICAL_PARTNER_SAAS_DECISION ${state.canonicalDecision}` });
}

for (const [field, expected] of Object.entries({
  platformMode: "BTHWANI_NATIVE_PLATFORM",
  partnerSaasModel: "EMBEDDED_PLATFORM_CAPABILITY",
  partnerAccessModel: "MANAGED_B2B_PLATFORM_ACCESS",
  partnerOrganizationBoundary: "BUSINESS_SCOPE_NOT_TENANT",
  storeBoundary: "BUSINESS_SCOPE_NOT_TENANT",
  operatorContextPurpose: "TRUST_AND_DATA_ISOLATION",
  trustedOperatorContextRequired: true,
  clientSuppliedOperatorContextTrusted: false,
})) {
  if (state?.[field] !== expected) {
    violations.push({ file: statePath, line: 0, message: `PARTNER_SAAS_STATE_MISMATCH ${field}=${String(expected)}` });
  }
}

if (!platformModel.includes(`classification: ${canonicalClassification}`)) {
  violations.push({ file: platformModelPath, line: 0, message: `PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalClassification}` });
}
for (const [field, value] of Object.entries(canonicalPartnerModel)) {
  if (!platformModel.includes(`${field}: ${value}`)) {
    violations.push({ file: platformModelPath, line: 0, message: `PLATFORM_PARTNER_MODEL_MISMATCH ${field}=${value}` });
  }
  if (platformContract?.platformModel?.[field] !== value) {
    violations.push({ file: platformContractPath, line: 0, message: `PRODUCT_PARTNER_MODEL_MISMATCH ${field}=${value}` });
  }
  if (productSchema?.properties?.platformModel?.properties?.[field]?.const !== value) {
    violations.push({ file: productSchemaPath, line: 0, message: `PRODUCT_SCHEMA_PARTNER_MODEL_MISMATCH ${field}=${value}` });
  }
}
if (platformContract?.platformModel?.classification !== canonicalClassification) {
  violations.push({ file: platformContractPath, line: 0, message: `PRODUCT_PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalClassification}` });
}
if (productSchema?.properties?.platformModel?.properties?.classification?.const !== canonicalClassification) {
  violations.push({ file: productSchemaPath, line: 0, message: `PRODUCT_SCHEMA_PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalClassification}` });
}

const context = platformContract?.platformModel?.contextSemantics;
if (
  context?.operatorContext !== "PLATFORM_ISOLATION_CONTEXT" ||
  context?.operatorContextPurpose !== "TRUST_AND_DATA_ISOLATION" ||
  context?.partnerOrganization !== "BUSINESS_SCOPE_NOT_TENANT" ||
  context?.store !== "BUSINESS_SCOPE_NOT_TENANT"
) {
  violations.push({ file: platformContractPath, line: 0, message: "PARTNER_AND_STORE_BOUNDARY_MODEL_INVALID" });
}

for (const marker of [
  "partner_saas_model: EMBEDDED_PLATFORM_CAPABILITY",
  "partner_access_model: MANAGED_B2B_PLATFORM_ACCESS",
  "partner_organization_boundary: BUSINESS_SCOPE_NOT_TENANT",
  "store_boundary: BUSINESS_SCOPE_NOT_TENANT",
  "operator_context_purpose: TRUST_AND_DATA_ISOLATION",
]) {
  if (!annex.includes(marker)) {
    violations.push({ file: annexPath, line: 0, message: `PARTNER_SAAS_ANNEX_MISMATCH expected ${marker}` });
  }
}

if (!runtimeEnv.includes("BTHWANI_OPERATOR_CONTEXT_ID=")) {
  violations.push({ file: runtimeEnvPath, line: 0, message: "OPERATOR_CONTEXT_RUNTIME_BINDING_MISSING" });
}
if (!compose.includes("BTHWANI_OPERATOR_CONTEXT_ID:")) {
  violations.push({ file: composePath, line: 0, message: "OPERATOR_CONTEXT_COMPOSE_BINDING_MISSING" });
}

const forbiddenTokenParts = [
  ["BTHWANI", "SAAS", "MODE"],
  ["BTHWANI", "COMMERCIAL", "ACTIVATION", "STATE"],
  ["BTHWANI", "PRODUCTION", "DEPLOYMENT", "AUTHORIZED"],
  ["commercial", "Activation", "State"],
  ["production", "Deployment", "Authorized"],
  ["SAAS", "READY", "DEFERRED"],
  ["SAAS", "ACTIVE"],
  ["ACTIVATION", "AUTHORIZED"],
  ["activation", "authorization.json"],
  ["SAAS", "READINESS", "AND", "TENANCY", "GATES.md"],
  ["operator", "Saas", "Readiness"],
  ["operator", "Saas", "Tenant", "Candidate"],
  ["Platform", "Saas", "Runtime", "Status"],
  ["deferred", "operator", "SaaS", "readiness"],
];
const forbiddenTokens = forbiddenTokenParts.map((parts) => parts.join(parts[0] === "commercial" || parts[0] === "production" || parts[0] === "operator" || parts[0] === "Platform" ? "" : "_"));
const scanExclusions = new Set(["tools/guards/saas-governance-gate.mjs"]);

for (const file of trackedTextFiles()) {
  if (scanExclusions.has(file)) continue;
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const token of forbiddenTokens) {
    if (content.includes(token)) {
      violations.push({ file, line: 0, message: `RETIRED_MULTI_TENANT_ACTIVATION_TOKEN ${token}` });
    }
  }
}

fail(guardId, violations);
