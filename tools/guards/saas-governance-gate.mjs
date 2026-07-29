import fs from "node:fs";
import path from "node:path";
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

const statePath = "governance/saas/saas-governance.json";
const schemaPath = "governance/saas/saas-governance.schema.json";
const authorizationPath = "governance/saas/activation-authorization.json";
const annexPath = "governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md";
const decisionsPath = "governance/contracts/decision-vocabulary.json";
const runtimeEnvPath = "infra/docker/env/runtime.env.example";
const composePath = "infra/docker/compose.runtime.yml";
const platformModelPath = "governance/product/platform-model.yaml";
const platformContractPath = "governance/product/contracts/bthwani-platform-model.product-truth.json";
const productSchemaPath = "governance/product/product-truth.schema.json";

const state = readJson(statePath);
const schema = readJson(schemaPath);
const authorization = readJson(authorizationPath);
const decisions = readJson(decisionsPath);
const annex = readText(annexPath);
const runtimeEnv = readText(runtimeEnvPath);
const compose = readText(composePath);
const platformModel = readText(platformModelPath);
const platformContract = readJson(platformContractPath);
const productSchema = readJson(productSchemaPath);

const canonicalPlatformClassification =
  "UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_WALLET_PLATFORM_WITH_B2B_PARTNER_CAPABILITIES_AND_DEFERRED_OPERATOR_SAAS_READINESS";
const retiredPartnerSaasClassification =
  "UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_WALLET_PLATFORM_WITH_PARTNER_SAAS_CAPABILITIES";

if (!platformModel.includes(`classification: ${canonicalPlatformClassification}`)) {
  violations.push({
    file: platformModelPath,
    line: 0,
    message: `PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalPlatformClassification}`,
  });
}
if (platformContract?.platformModel?.classification !== canonicalPlatformClassification) {
  violations.push({
    file: platformContractPath,
    line: 0,
    message: `PRODUCT_PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalPlatformClassification}`,
  });
}
if (
  productSchema?.properties?.platformModel?.properties?.classification?.const !==
  canonicalPlatformClassification
) {
  violations.push({
    file: productSchemaPath,
    line: 0,
    message: `PRODUCT_SCHEMA_PLATFORM_CLASSIFICATION_MISMATCH expected ${canonicalPlatformClassification}`,
  });
}

const partnerContext = platformContract?.platformModel?.contextSemantics;
if (partnerContext?.partnerOrganization !== "NOT_A_TENANT" || partnerContext?.store !== "NOT_A_TENANT") {
  violations.push({
    file: platformContractPath,
    line: 0,
    message: "PARTNER_AND_STORE_MUST_NOT_BE_TENANT_BOUNDARIES",
  });
}

for (const [file, content] of [
  [platformModelPath, platformModel],
  [platformContractPath, JSON.stringify(platformContract ?? {})],
  [productSchemaPath, JSON.stringify(productSchema ?? {})],
]) {
  if (content.includes(retiredPartnerSaasClassification) || /partner SaaS capabilities/i.test(content)) {
    violations.push({
      file,
      line: 0,
      message: "RETIRED_PARTNER_SAAS_CLASSIFICATION_FORBIDDEN",
    });
  }
}

if (state && schema) {
  try {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(state)) {
      for (const error of validate.errors ?? []) {
        violations.push({
          file: statePath,
          line: 0,
          message: `SAAS_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}`,
        });
      }
    }
  } catch (error) {
    violations.push({ file: schemaPath, line: 0, message: `SAAS_SCHEMA_COMPILE_FAILURE ${error.message}` });
  }
}

const canonicalDecisions = new Set((decisions?.canonicalDecisions ?? []).map((entry) => entry.id));
if (state && !canonicalDecisions.has(state.canonicalDecision)) {
  violations.push({ file: statePath, line: 0, message: `NONCANONICAL_SAAS_DECISION ${state.canonicalDecision}` });
}

if (state?.activationAuthorization?.status === "AUTHORIZED") {
  if (state.activationAuthorization.authorizationPath !== authorizationPath) {
    violations.push({ file: statePath, line: 0, message: "AUTHORIZATION_PATH_MISMATCH" });
  }
  if (
    authorization?.status !== "AUTHORIZED" ||
    authorization?.source !== "USER_EXPLICIT_INSTRUCTION" ||
    authorization?.targetRef !== state.activationAuthorization.targetRef
  ) {
    violations.push({ file: authorizationPath, line: 0, message: "MATCHING_EXPLICIT_AUTHORIZATION_MISSING" });
  }
}

if (state?.commercialActivationState === "ACTIVE") {
  const unresolved = Object.entries(state.activationEvidence ?? []).filter(([, value]) => value !== "PROVEN");
  for (const [key, value] of unresolved) {
    violations.push({ file: statePath, line: 0, message: `ACTIVE_SAAS_WITH_UNPROVEN_EVIDENCE ${key}=${value}` });
  }
  if (
    state.activationAuthorization?.status !== "AUTHORIZED" ||
    state.activationAuthorization?.productionDeploymentAuthorized !== true
  ) {
    violations.push({ file: statePath, line: 0, message: "ACTIVE_SAAS_REQUIRES_MATCHING_PRODUCTION_AUTHORIZATION" });
  }
}

const deferred = new Set(state?.deferredCommercialFeatures ?? []);
for (const feature of [
  "commercial subscription billing",
  "self-service tenant signup",
  "white-label customization",
  "custom domains",
  "complex usage metering",
  "database per tenant",
]) {
  if (!deferred.has(feature)) {
    violations.push({ file: statePath, line: 0, message: `DEFERRED_COMMERCIAL_FEATURE_MISSING ${feature}` });
  }
}

const annexMarkers = [
  `saas_readiness_mode: ${state?.saasReadinessMode}`,
  `commercial_activation_state: ${state?.commercialActivationState}`,
  `activation_authorization_status: ${state?.activationAuthorization?.status}`,
  `activation_authorization_target_ref: ${state?.activationAuthorization?.targetRef}`,
  `production_deployment_authorized: ${String(state?.activationAuthorization?.productionDeploymentAuthorized)}`,
  `canonical_decision: ${state?.canonicalDecision}`,
];
for (const marker of annexMarkers) {
  if (!annex.includes(marker)) {
    violations.push({ file: annexPath, line: 0, message: `SAAS_ANNEX_STATE_MISMATCH expected ${marker}` });
  }
}

const runtimeModeByReadiness = {
  NOT_APPLICABLE: "deferred",
  SAAS_READY_DEFERRED: "deferred",
  SAAS_ACTIVE: "active",
};
const runtimeActivationByCommercialState = {
  BLOCKED_BY_POLICY: "blocked",
  ELIGIBLE_FOR_REVIEW: "eligible",
  ACTIVATION_AUTHORIZED: "authorized",
  ACTIVE: "active",
};
const expectedRuntimeMode = runtimeModeByReadiness[state?.saasReadinessMode];
const expectedCommercialActivation = runtimeActivationByCommercialState[state?.commercialActivationState];
const expectedProductionAuthorization = String(
  state?.activationAuthorization?.productionDeploymentAuthorized ?? false,
);

for (const marker of [
  `BTHWANI_SAAS_MODE=${expectedRuntimeMode}`,
  `BTHWANI_COMMERCIAL_ACTIVATION_STATE=${expectedCommercialActivation}`,
  `BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED=${expectedProductionAuthorization}`,
]) {
  if (!runtimeEnv.includes(marker)) {
    violations.push({ file: runtimeEnvPath, line: 0, message: `SAAS_RUNTIME_ENV_DEFAULT_MISMATCH expected ${marker}` });
  }
}

for (const marker of [
  `BTHWANI_SAAS_MODE: "\${BTHWANI_SAAS_MODE:-${expectedRuntimeMode}}"`,
  `BTHWANI_COMMERCIAL_ACTIVATION_STATE: "\${BTHWANI_COMMERCIAL_ACTIVATION_STATE:-${expectedCommercialActivation}}"`,
  `BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED: "\${BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED:-${expectedProductionAuthorization}}"`,
]) {
  if (!compose.includes(marker)) {
    violations.push({ file: composePath, line: 0, message: `SAAS_COMPOSE_DEFAULT_MISMATCH expected ${marker}` });
  }
}

const retiredRuntimeContextVariable = ["BTHWANI", "DEFAULT", "TENANT", "ID"].join("_");
if (runtimeEnv.includes(retiredRuntimeContextVariable) || compose.includes(retiredRuntimeContextVariable)) {
  violations.push({ file: runtimeEnvPath, line: 0, message: "LEGACY_RUNTIME_TENANT_VARIABLE_FORBIDDEN" });
}
if (!runtimeEnv.includes("BTHWANI_OPERATOR_CONTEXT_ID=") || !compose.includes("BTHWANI_OPERATOR_CONTEXT_ID:")) {
  violations.push({ file: runtimeEnvPath, line: 0, message: "OPERATOR_CONTEXT_RUNTIME_BINDING_MISSING" });
}

fail(guardId, violations);
