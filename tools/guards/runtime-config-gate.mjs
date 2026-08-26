import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";
import { LOCAL_PASSWORD_ENV_VAR, localPasswordDefault } from "../dev/local-actors.mjs";

const guardId = "runtime-config-gate";
const violations = [];

const allowedInLocalhostCheck = (file) =>
  file.includes("/test/") ||
  file.includes("/tests/") ||
  file.includes(".test.") ||
  file.includes(".spec.") ||
  file.startsWith("tools/") ||
  file.includes("/config/") ||
  file.includes("config") ||
  file.startsWith("infra/") ||
  file.includes("/runtime/");

const oldLocalhostRegex = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(8080|8081|8082|8083|8084|3000)\b/g;
for (const file of listCodeFiles()) {
  if (allowedInLocalhostCheck(file)) continue;
  const content = read(file);
  let match;
  while ((match = oldLocalhostRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `forbidden old localhost URL: ${match[0]} (port usage must be through config layers)`,
    });
  }
}

const hardcodedPathRegex = /(?:[c-z]:[\\/]|(?:\r?\n|^|\s)[\\/](?:home|Users)[\\/])[^\r\n]*bthwani-suite-next/i;
for (const file of listCodeFiles()) {
  if (file.startsWith("tools/") || file.startsWith("tools/mobile/") || file.includes("/test/") || file.includes("/tests/")) continue;
  const content = read(file);
  const match = hardcodedPathRegex.exec(content);
  if (match) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `forbidden hardcoded local repository path: "${match[0].trim()}"`,
    });
  }
}

const allowedEnvAccess = (file) =>
  file.startsWith("tools/") ||
  file.includes("/shared/") ||
  file.startsWith("shared/") ||
  file.includes("config") ||
  file.includes("/server/") ||
  file.includes("/test/") ||
  file.includes("/tests/") ||
  file.includes(".test.") ||
  file.includes(".spec.") ||
  file.startsWith(".github/");

for (const file of listCodeFiles()) {
  if (allowedEnvAccess(file)) continue;
  const content = read(file);
  if (/process\.env(?:\.|\[)/.test(content)) {
    violations.push({
      file,
      message: "process.env access is forbidden outside config, shared kernel, server, test, or tooling layers",
    });
  }
}

function parseEnv(relative) {
  const result = new Map();
  const source = read(relative);
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    result.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return result;
}

const envExample = "infra/docker/env/runtime.env.example";
if (!fs.existsSync(path.join(repoRoot, envExample))) {
  violations.push({ file: envExample, message: "RUNTIME_ENV_EXAMPLE_MISSING" });
} else {
  const env = parseEnv(envExample);
  const mode = env.get("BTHWANI_RUNTIME_MODE");
  if (!new Set(["development", "test", "production"]).has(mode)) {
    violations.push({
      file: envExample,
      message: "RUNTIME_MODE_INVALID: BTHWANI_RUNTIME_MODE must be development, test, or production",
    });
  }
  if (mode !== "development") {
    violations.push({
      file: envExample,
      message: "RUNTIME_EXAMPLE_MUST_BE_DEVELOPMENT: committed example may not imply production readiness",
    });
  }

  const activationState = env.get("BTHWANI_COMMERCIAL_ACTIVATION_STATE");
  const productionDeploymentAuthorized = env.get("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED");
  const defaultOperatorContextId = env.get("BTHWANI_OPERATOR_CONTEXT_ID") ?? "";

  if (!new Set(["blocked", "eligible", "authorized", "active"]).has(activationState)) {
    violations.push({ file: envExample, message: "partner_activation_STATE_INVALID" });
  }
  if (!new Set(["true", "false"]).has(productionDeploymentAuthorized)) {
    violations.push({ file: envExample, message: "PRODUCTION_DEPLOYMENT_AUTHORIZATION_FLAG_INVALID" });
  }
  if (activationState === "authorized") {
    if (productionDeploymentAuthorized !== "false") {
      violations.push({ file: envExample, message: "AUTHORIZED_RUNTIME_MUST_NOT_IMPLY_PRODUCTION_DEPLOYMENT" });
    }
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(defaultOperatorContextId)) {
      violations.push({ file: envExample, message: "AUTHORIZED_PLATFORM_RUNTIME_REQUIRES_GOVERNED_DEFAULT_OperatorContext_ID" });
    }
  }
  if (activationState === "active") {
    if (mode !== "production" || productionDeploymentAuthorized !== "true") {
      violations.push({ file: envExample, message: "COMMERCIAL_ACTIVE_REQUIRES_PRODUCTION_MODE_AND_DEPLOYMENT_AUTHORIZATION" });
    }
  }

  const weakDefaults = new Map([
    ["BTHWANI_POSTGRES_PASSWORD", "bthwani_runtime_password"],
    ["BTHWANI_MINIO_ROOT_PASSWORD", "bthwani_minio_password"],
    [LOCAL_PASSWORD_ENV_VAR, localPasswordDefault()],
    ["IDENTITY_ACTIVATION_HMAC_SECRET", "LOCAL_ONLY_replace_with_32_plus_byte_activation_hmac_secret"],
    ["IDENTITY_WORKFORCE_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_workforce_internal_service_token"],
    ["IDENTITY_DSH_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_dsh_identity_internal_service_token"],
    ["WLT_DSH_SERVICE_TOKEN", "dev-only-dsh-wlt-shared-secret"],
    ["DSH_WLT_SERVICE_TOKEN", "dev-only-dsh-wlt-shared-secret"],
    ["WLT_PAYOUT_ENCRYPTION_KEY", "dev-only-payout-destination-encryption-key"],
    ["PLATFORM_CONTROL_DSH_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_platform_control_dsh_service_token"],
    ["WORKFORCE_DSH_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_workforce_dsh_service_token"],
    ["DSH_WORKFORCE_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_dsh_workforce_service_token"],
    ["WORKFORCE_WLT_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_workforce_wlt_service_token"],
    ["BTHWANI_MINIO_DSH_SECRET_KEY", "dsh_media_local_secret"],
  ]);
  if (mode === "production") {
    for (const [key, weak] of weakDefaults) {
      if (env.get(key) === weak) {
        violations.push({ file: envExample, message: `PRODUCTION_WEAK_SECRET_FORBIDDEN:${key}` });
      }
    }
  }

  const mutationsConfig = env.get("WLT_MUTATIONS_ENABLED");
  const financeKillSwitch = env.get("WLT_FINANCE_MUTATION_KILL_SWITCH");
  const providerMode = env.get("WLT_FINANCIAL_PROVIDER_MODE");
  const mockProviderAllowed = env.get("WLT_ALLOW_MOCK_PROVIDER") === "true";
  const productionProviderAllowed = env.get("WLT_ALLOW_PRODUCTION_PROVIDER") === "true";
  if (!new Set(["true", "false"]).has(mutationsConfig)) {
    violations.push({ file: envExample, message: "WLT_MUTATIONS_ENABLED_MUST_BE_EXPLICIT_BOOLEAN" });
  }
  if (!new Set(["true", "false"]).has(financeKillSwitch)) {
    violations.push({ file: envExample, message: "WLT_FINANCE_MUTATION_KILL_SWITCH_MUST_BE_EXPLICIT_BOOLEAN" });
  }
  const mutationsEnabled = mutationsConfig === "true";
  if (providerMode === "mock" && !mockProviderAllowed) {
    violations.push({ file: envExample, message: "MOCK_PROVIDER_REQUIRES_EXPLICIT_LOCAL_OPT_IN" });
  }
  if (mutationsEnabled && mode === "development" && providerMode !== "mock") {
    violations.push({ file: envExample, message: "DEVELOPMENT_MUTATIONS_REQUIRE_MOCK_PROVIDER" });
  }
  if (mutationsEnabled && mode === "development" && providerMode === "mock" && financeKillSwitch !== "false") {
    violations.push({ file: envExample, message: "DEVELOPMENT_MUTATIONS_REQUIRE_OPEN_FINANCE_KILL_SWITCH" });
  }
  if (productionProviderAllowed && providerMode === "mock") {
    violations.push({ file: envExample, message: "MOCK_PROVIDER_CANNOT_BE_MARKED_PRODUCTION_ALLOWED" });
  }
  if (mode === "production" && providerMode === "mock") {
    violations.push({ file: envExample, message: "PRODUCTION_MOCK_PROVIDER_FORBIDDEN" });
  }
  if (mode === "production" && env.get("BTHWANI_REQUIRE_STRONG_SECRETS") !== "true") {
    violations.push({ file: envExample, message: "PRODUCTION_STRONG_SECRET_GATE_REQUIRED" });
  }
}

const localProductionEnvExample = "infra/docker/env/runtime.local-production.env.example";
if (fs.existsSync(path.join(repoRoot, localProductionEnvExample))) {
  const localProductionEnv = parseEnv(localProductionEnvExample);
  if (localProductionEnv.get("BTHWANI_RUNTIME_MODE") !== "production") {
    violations.push({ file: localProductionEnvExample, message: "LOCAL_PRODUCTION_RUNTIME_MODE_REQUIRED" });
  }
  if (localProductionEnv.get("BTHWANI_LOCAL_PRODUCTION_LIKE") !== "true") {
    violations.push({ file: localProductionEnvExample, message: "LOCAL_PRODUCTION_LIKE_AUTHORIZATION_REQUIRED" });
  }
  if (localProductionEnv.get("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED") === "true") {
    violations.push({ file: localProductionEnvExample, message: "LOCAL_PRODUCTION_LIKE_MUST_NOT_AUTHORIZE_REAL_PRODUCTION" });
  }
  if (
    localProductionEnv.get("WLT_FINANCIAL_PROVIDER_MODE") === "mock" &&
    localProductionEnv.get("WLT_ALLOW_MOCK_PROVIDER") !== "true"
  ) {
    violations.push({
      file: localProductionEnvExample,
      message: "LOCAL_PRODUCTION_MOCK_PROVIDER_REQUIRES_EXPLICIT_OPT_IN",
    });
  }
  if (
    localProductionEnv.get("WLT_MUTATIONS_ENABLED") === "true" &&
    localProductionEnv.get("WLT_FINANCE_MUTATION_KILL_SWITCH") !== "false"
  ) {
    violations.push({
      file: localProductionEnvExample,
      message: "LOCAL_PRODUCTION_APPROVED_WLT_MUTATIONS_REQUIRE_OPEN_FINANCE_KILL_SWITCH",
    });
  }
}

const composePath = "infra/docker/compose.runtime.yml";
if (fs.existsSync(path.join(repoRoot, composePath))) {
  const compose = read(composePath);
  if (!compose.includes('"127.0.0.1:${BTHWANI_POSTGRES_PORT:-55432}:5432"')) {
    violations.push({ file: composePath, message: "POSTGRES_MUST_BIND_LOOPBACK_ONLY" });
  }
  if (!compose.includes('WLT_ALLOW_MOCK_PROVIDER: "${WLT_ALLOW_MOCK_PROVIDER:-false}"')) {
    violations.push({ file: composePath, message: "WLT_MOCK_PROVIDER_OPT_IN_MUST_DEFAULT_FAIL_CLOSED_IN_COMPOSE" });
  }
  if (!compose.includes('WLT_FINANCE_MUTATION_KILL_SWITCH: "${WLT_FINANCE_MUTATION_KILL_SWITCH:-true}"')) {
    violations.push({ file: composePath, message: "WLT_FINANCE_KILL_SWITCH_MUST_DEFAULT_FAIL_CLOSED_IN_COMPOSE" });
  }
  const containerNames = compose.match(/container_name:\s*([^\r\n#]+)/g) ?? [];
  for (const line of containerNames) {
    const name = line.replace("container_name:", "").trim();
    if (
      !name.startsWith("bthwani-") &&
      !name.startsWith("$") &&
      !name.includes("redis") &&
      !name.includes("postgres") &&
      !name.includes("minio")
    ) {
      violations.push({
        file: composePath,
        message: `container_name '${name}' violates naming conventions (must start with bthwani- or use variable interpolation)`,
      });
    }
  }
}

fail(guardId, violations);
