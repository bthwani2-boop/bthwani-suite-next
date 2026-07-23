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
const authorityPath = "governance/authority/authority-precedence.json";
const decisionsPath = "governance/contracts/decision-vocabulary.json";
const artifactSchemaPath = "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json";
const impactSchemaPath = "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json";
const finalJudgePath = ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md";
const runtimeEnvPath = "infra/docker/env/runtime.env.example";
const composePath = "infra/docker/compose.runtime.yml";
const activationVerifierPath = "tools/scripts/verify-saas-activation.mjs";

const state = readJson(statePath);
const schema = readJson(schemaPath);
const authorization = readJson(authorizationPath);
const authority = readJson(authorityPath);
const decisions = readJson(decisionsPath);
const artifactSchema = readJson(artifactSchemaPath);
const impactSchema = readJson(impactSchemaPath);
const annex = readText(annexPath);
const finalJudge = readText(finalJudgePath);
const runtimeEnv = readText(runtimeEnvPath);
const compose = readText(composePath);
readText(activationVerifierPath);

if (state && schema) {
  try {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(state)) {
      for (const error of validate.errors ?? []) {
        violations.push({ file: statePath, line: 0, message: `SAAS_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}` });
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

if (state?.commercialActivationState === "BLOCKED_BY_POLICY") {
  if (state.saasReadinessMode === "SAAS_ACTIVE") {
    violations.push({ file: statePath, line: 0, message: "SAAS_ACTIVE_WHILE_COMMERCIAL_ACTIVATION_BLOCKED" });
  }
  if (["PASS", "CLOSED_WITH_EVIDENCE"].includes(state.canonicalDecision)) {
    violations.push({ file: statePath, line: 0, message: "SAAS_ACTIVATION_CLAIM_WITHOUT_ACTIVATION_PERMISSION" });
  }
}

if (state?.commercialActivationState === "ACTIVATION_AUTHORIZED") {
  if (state.saasReadinessMode !== "SAAS_ACTIVE") {
    violations.push({ file: statePath, line: 0, message: "AUTHORIZED_SAAS_RUNTIME_MUST_BE_ACTIVE" });
  }
  if (state.activationAuthorization?.status !== "AUTHORIZED") {
    violations.push({ file: statePath, line: 0, message: "AUTHORIZED_STATE_REQUIRES_AUTHORIZATION_STATUS" });
  }
  if (state.activationAuthorization?.authorizationPath !== authorizationPath) {
    violations.push({ file: statePath, line: 0, message: "AUTHORIZED_STATE_REQUIRES_CANONICAL_AUTHORIZATION_PATH" });
  }
  if (state.activationAuthorization?.productionDeploymentAuthorized !== false) {
    violations.push({ file: statePath, line: 0, message: "PRODUCTION_DEPLOYMENT_MUST_REMAIN_SEPARATELY_AUTHORIZED" });
  }
  if (authorization?.status !== "AUTHORIZED" || authorization?.source !== "USER_EXPLICIT_INSTRUCTION") {
    violations.push({ file: authorizationPath, line: 0, message: "EXPLICIT_SAAS_ACTIVATION_AUTHORIZATION_MISSING" });
  }
  if (authorization?.targetRef !== state.activationAuthorization?.targetRef) {
    violations.push({ file: authorizationPath, line: 0, message: "ACTIVATION_AUTHORIZATION_TARGET_REF_MISMATCH" });
  }
  if (authorization?.productionDeploymentAuthorized !== false) {
    violations.push({ file: authorizationPath, line: 0, message: "PRODUCTION_DEPLOYMENT_AUTHORIZATION_MUST_BE_SEPARATE" });
  }
  if (["PASS", "CLOSED_WITH_EVIDENCE"].includes(state.canonicalDecision)) {
    violations.push({ file: statePath, line: 0, message: "AUTHORIZED_RUNTIME_CANNOT_CLAIM_FINAL_COMMERCIAL_CLOSURE" });
  }
}

if (state?.commercialActivationState === "ACTIVE") {
  const unresolved = Object.entries(state.activationEvidence ?? {}).filter(([, value]) => value !== "PROVEN");
  for (const [key, value] of unresolved) {
    violations.push({ file: statePath, line: 0, message: `ACTIVE_SAAS_WITH_UNPROVEN_EVIDENCE ${key}=${value}` });
  }
  if (authorization?.status !== "AUTHORIZED" || authorization?.productionDeploymentAuthorized !== true) {
    violations.push({ file: authorizationPath, line: 0, message: "ACTIVE_COMMERCIAL_SAAS_REQUIRES_PRODUCTION_DEPLOYMENT_AUTHORIZATION" });
  }
}

const registered = (authority?.documents ?? []).some((entry) =>
  entry.path === "governance/saas" &&
  entry.classification === "ACTIVE_CANONICAL" &&
  entry.precedenceId === "MACHINE_READABLE_CONTRACT"
);
if (!registered) violations.push({ file: authorityPath, line: 0, message: "SAAS_MACHINE_GOVERNANCE_NOT_REGISTERED" });

for (const marker of [statePath, schemaPath, authorizationPath, decisionsPath]) {
  if (!annex.includes(marker)) violations.push({ file: annexPath, line: 0, message: `SAAS_ANNEX_MISSING_REFERENCE ${marker}` });
}

for (const forbiddenDecision of ["SAAS_ACTIVATION_APPROVED", "HARD_BLOCKED_EXTERNAL_ONLY"]) {
  if (annex.includes(forbiddenDecision)) violations.push({ file: annexPath, line: 0, message: `NONCANONICAL_SAAS_DECISION_TOKEN ${forbiddenDecision}` });
}

const requiredClosureScopes = ["product", "runtime", "visual", "qa", "security", "finance", "isolation", "governance", "ci", "release", "production"];
const conditionalScopes = new Set(decisions?.closureRules?.conditionalRequiredScopes ?? []);
for (const requiredScope of requiredClosureScopes) {
  if (!conditionalScopes.has(requiredScope)) violations.push({ file: decisionsPath, line: 0, message: `CLOSURE_SCOPE_MISSING ${requiredScope}` });
  if (!finalJudge.includes(`\`${requiredScope}\``)) violations.push({ file: finalJudgePath, line: 0, message: `FINAL_JUDGE_MISSING_SCOPE ${requiredScope}` });
}

const artifactEvidenceScopes = new Set(artifactSchema?.definitions?.evidenceScope?.enum ?? []);
for (const requiredScope of ["finance", "isolation", "governance", "ci", "release", "production"]) {
  if (!artifactEvidenceScopes.has(requiredScope)) violations.push({ file: artifactSchemaPath, line: 0, message: `ARTIFACT_EVIDENCE_SCOPE_MISSING ${requiredScope}` });
}

const impactProperties = impactSchema?.properties?.impacts?.properties ?? {};
for (const requiredImpact of ["wltFinance", "tenant", "governance", "ci", "release", "production"]) {
  if (!Object.hasOwn(impactProperties, requiredImpact)) violations.push({ file: impactSchemaPath, line: 0, message: `CHANGE_IMPACT_FLAG_MISSING ${requiredImpact}` });
}

const deferred = new Set(state?.deferredCommercialFeatures ?? []);
for (const requiredFeature of [
  "commercial subscription billing",
  "self-service tenant signup",
  "white-label customization",
  "custom domains",
  "complex usage metering",
  "database per tenant",
]) {
  if (!deferred.has(requiredFeature)) violations.push({ file: statePath, line: 0, message: `DEFERRED_COMMERCIAL_FEATURE_MISSING ${requiredFeature}` });
}

if (state?.commercialActivationState === "ACTIVATION_AUTHORIZED" || state?.commercialActivationState === "ACTIVE") {
  const expectedRuntimeMarkers = state.commercialActivationState === "ACTIVE"
    ? [
        "BTHWANI_SAAS_MODE=active",
        "BTHWANI_COMMERCIAL_ACTIVATION_STATE=active",
        "BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED=true",
        "BTHWANI_DEFAULT_TENANT_ID=",
      ]
    : [
        "BTHWANI_SAAS_MODE=active",
        "BTHWANI_COMMERCIAL_ACTIVATION_STATE=authorized",
        "BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED=false",
        "BTHWANI_DEFAULT_TENANT_ID=",
      ];
  for (const marker of expectedRuntimeMarkers) {
    if (!runtimeEnv.includes(marker)) {
      violations.push({ file: runtimeEnvPath, line: 0, message: `SAAS_RUNTIME_ENV_MARKER_MISSING ${marker}` });
    }
  }

  for (const marker of [
    "x-bthwani-saas-environment: &bthwani-saas-environment",
    "BTHWANI_SAAS_MODE:",
    "BTHWANI_COMMERCIAL_ACTIVATION_STATE:",
    "BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED:",
    "BTHWANI_DEFAULT_TENANT_ID:",
  ]) {
    if (!compose.includes(marker)) {
      violations.push({ file: composePath, line: 0, message: `SAAS_COMPOSE_BINDING_MISSING ${marker}` });
    }
  }

  const saasMergeCount = (compose.match(/<<:\s*\*bthwani-saas-environment/g) ?? []).length;
  if (saasMergeCount < 6) {
    violations.push({ file: composePath, line: 0, message: `SAAS_CONTEXT_NOT_PROPAGATED_TO_ALL_APIS expected>=6 actual=${saasMergeCount}` });
  }

  for (const service of ["identity-api", "workforce-api", "providers-api", "platform-control-api", "wlt-api", "dsh-api"]) {
    const header = new RegExp(`^  ${service}:\\s*$`, "m").exec(compose);
    if (!header) {
      violations.push({ file: composePath, line: 0, message: `SAAS_REQUIRED_API_SERVICE_MISSING ${service}` });
      continue;
    }
    const serviceStart = header.index;
    const afterHeader = serviceStart + header[0].length;
    const tail = compose.slice(afterHeader);
    const nextHeader = /^  [A-Za-z0-9-]+:\s*$/m.exec(tail);
    const serviceEnd = nextHeader ? afterHeader + nextHeader.index : compose.length;
    const serviceBlock = compose.slice(serviceStart, serviceEnd);
    if (!serviceBlock.includes("<<: *bthwani-saas-environment")) {
      violations.push({ file: composePath, line: 0, message: `SAAS_CONTEXT_MISSING_FROM_SERVICE ${service}` });
    }
  }
}

fail(guardId, violations);
