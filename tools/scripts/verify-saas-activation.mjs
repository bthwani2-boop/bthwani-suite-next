import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readEnv(relativePath) {
  const values = new Map();
  for (const raw of fs.readFileSync(path.join(repoRoot, relativePath), "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator > 0) values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return values;
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

const state = readJson("governance/saas/saas-governance.json");
const authorization = readJson("governance/saas/activation-authorization.json");
const env = readEnv("infra/docker/env/runtime.env.example");

assert(state.saasReadinessMode === "SAAS_ACTIVE", "SAAS_RUNTIME_NOT_ACTIVE");
assert(state.commercialActivationState === "ACTIVATION_AUTHORIZED", "SAAS_ACTIVATION_NOT_AUTHORIZED");
assert(state.activationAuthorization?.status === "AUTHORIZED", "SAAS_STATE_AUTHORIZATION_MISSING");
assert(state.activationAuthorization?.targetRef === "lianbassam", "SAAS_TARGET_REF_MISMATCH");
assert(state.activationAuthorization?.productionDeploymentAuthorized === false, "PRODUCTION_DEPLOYMENT_MUST_REMAIN_SEPARATE");
assert(authorization.status === "AUTHORIZED", "ACTIVATION_AUTHORIZATION_RECORD_INVALID");
assert(authorization.source === "USER_EXPLICIT_INSTRUCTION", "ACTIVATION_AUTHORIZATION_SOURCE_INVALID");
assert(authorization.productionDeploymentAuthorized === false, "PRODUCTION_DEPLOYMENT_NOT_SEPARATELY_AUTHORIZED");
assert(env.get("BTHWANI_SAAS_MODE") === "active", "RUNTIME_SAAS_MODE_NOT_ACTIVE");
assert(env.get("BTHWANI_COMMERCIAL_ACTIVATION_STATE") === "authorized", "RUNTIME_ACTIVATION_STATE_NOT_AUTHORIZED");
assert(env.get("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED") === "false", "RUNTIME_PRODUCTION_DEPLOYMENT_FLAG_INVALID");
assert(/^[a-z0-9][a-z0-9-]{2,62}$/.test(env.get("BTHWANI_DEFAULT_TENANT_ID") ?? ""), "DEFAULT_TENANT_ID_INVALID");

const unresolvedEvidence = Object.entries(state.activationEvidence ?? {})
  .filter(([, value]) => value !== "PROVEN")
  .map(([key, value]) => ({ key, value }));

process.stdout.write(`${JSON.stringify({
  result: "SAAS_ACTIVATION_RUNTIME_ENABLED",
  targetRef: authorization.targetRef,
  saasReadinessMode: state.saasReadinessMode,
  commercialActivationState: state.commercialActivationState,
  productionDeploymentAuthorized: false,
  defaultTenantId: env.get("BTHWANI_DEFAULT_TENANT_ID"),
  unresolvedEvidence,
}, null, 2)}\n`);
