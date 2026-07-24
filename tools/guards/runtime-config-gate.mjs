import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

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
  if (file.startsWith("tools/") || file.includes("/test/") || file.includes("/tests/")) continue;
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
  file.startsWith("shared/config/") ||
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

  const saasMode = env.get("BTHWANI_SAAS_MODE");
  const activationState = env.get("BTHWANI_COMMERCIAL_ACTIVATION_STATE");
  const productionDeploymentAuthorized = env.get("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED");
  const defaultTenantId = env.get("BTHWANI_DEFAULT_TENANT_ID") ?? "";

  if (!new Set(["deferred", "active"]).has(saasMode)) {
    violations.push({ file: envExample, message: "SAAS_MODE_INVALID: expected deferred or active" });
  }
  if (!new Set(["blocked", "eligible", "authorized", "active"]).has(activationState)) {
    violations.push({ file: envExample, message: "SAAS_ACTIVATION_STATE_INVALID" });
  }
  if (!new Set(["true", "false"]).has(productionDeploymentAuthorized)) {
    violations.push({ file: envExample, message: "PRODUCTION_DEPLOYMENT_AUTHORIZATION_FLAG_INVALID" });
  }
  if (saasMode === "active" && activationState === "blocked") {
    violations.push({ file: envExample, message: "ACTIVE_SAAS_RUNTIME_CANNOT_BE_POLICY_BLOCKED" });
  }
  if (activationState === "authorized") {
    if (saasMode !== "active") {
      violations.push({ file: envExample, message: "AUTHORIZED_ACTIVATION_REQUIRES_ACTIVE_SAAS_MODE" });
    }
    if (productionDeploymentAuthorized !== "false") {
      violations.push({ file: envExample, message: "AUTHORIZED_RUNTIME_MUST_NOT_IMPLY_PRODUCTION_DEPLOYMENT" });
    }
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(defaultTenantId)) {
      violations.push({ file: envExample, message: "AUTHORIZED_SAAS_RUNTIME_REQUIRES_GOVERNED_DEFAULT_TENANT_ID" });
    }
  }
  if (activationState === "active") {
    if (saasMode !== "active") {
      violations.push({ file: envExample, message: "COMMERCIAL_ACTIVE_REQUIRES_ACTIVE_SAAS_MODE" });
    }
    if (mode !== "production" || productionDeploymentAuthorized !== "true") {
      violations.push({ file: envExample, message: "COMMERCIAL_ACTIVE_REQUIRES_PRODUCTION_MODE_AND_DEPLOYMENT_AUTHORIZATION" });
    }
  }

  const weakDefaults = new Map([
    ["BTHWANI_POSTGRES_PASSWORD", "bthwani_runtime_password"],
    ["BTHWANI_MINIO_ROOT_PASSWORD", "bthwani_minio_password"],
    ["IDENTITY_LOCAL_BOOTSTRAP_PASSWORD", "123456"],
    ["IDENTITY_ACTIVATION_HMAC_SECRET", "LOCAL_ONLY_replace_with_32_plus_byte_activation_hmac_secret"],
    ["IDENTITY_WORKFORCE_SERVICE_TOKEN", "LOCAL_ONLY_replace_with_workforce_internal_service_token"],
    ["WLT_DSH_SERVICE_TOKEN", "dev-only-dsh-wlt-shared-secret"],
    ["DSH_WLT_SERVICE_TOKEN", "dev-only-dsh-wlt-shared-secret"],
    ["WLT_PAYOUT_ENCRYPTION_KEY", "dev-only-payout-destination-encryption-key"],
  ]);
  if (mode === "production") {
    for (const [key, weak] of weakDefaults) {
      if (env.get(key) === weak) {
        violations.push({ file: envExample, message: `PRODUCTION_WEAK_SECRET_FORBIDDEN:${key}` });
      }
    }
  }

  const mutationsEnabled = env.get("WLT_MUTATIONS_ENABLED") === "true";
  const providerMode = env.get("WLT_FINANCIAL_PROVIDER_MODE");
  const productionProviderAllowed = env.get("WLT_ALLOW_PRODUCTION_PROVIDER") === "true";
  if (mutationsEnabled && mode === "development" && providerMode !== "mock") {
    violations.push({ file: envExample, message: "DEVELOPMENT_MUTATIONS_REQUIRE_MOCK_PROVIDER" });
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

const composePath = "infra/docker/compose.runtime.yml";
if (fs.existsSync(path.join(repoRoot, composePath))) {
  const compose = read(composePath);
  if (!compose.includes('"127.0.0.1:${BTHWANI_POSTGRES_PORT:-55432}:5432"')) {
    violations.push({ file: composePath, message: "POSTGRES_MUST_BIND_LOOPBACK_ONLY" });
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

const profilesDir = "infra/docker/runtime-profiles";
const profilesPath = path.join(repoRoot, profilesDir);
if (fs.existsSync(profilesPath)) {
  const files = fs.readdirSync(profilesPath).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    const rel = toPosix(path.join(profilesDir, file));
    const full = path.join(profilesPath, file);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (error) {
      violations.push({ file: rel, message: `invalid json: ${error.message}` });
      continue;
    }
    const expectedProfile = path.basename(file, ".runtime-profile.json");
    if (
      file.endsWith(".runtime-profile.json") &&
      json.profile &&
      json.profile !== expectedProfile &&
      !expectedProfile.includes("-")
    ) {
      violations.push({
        file: rel,
        message: `expected profile name to match file name: ${expectedProfile}`,
      });
    }
  }
}

async function publishFirstViolation() {
  const first = violations[0];
  const token = process.env.BTHWANI_STATUS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!first || !token || !repository || !sha) return;

  const file = String(first.file ?? "unknown")
    .replaceAll("\\", "/")
    .split("/")
    .slice(-3)
    .join("/");
  const location = `${file}${first.line ? `:${first.line}` : ""}`;
  const context = `bthwani/guard/runtime-config/${location}`.slice(0, 100);
  const description = String(first.message ?? "runtime configuration violation")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;

  const response = await fetch(`${apiUrl}/repos/${repository}/statuses/${sha}`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "failure",
      context,
      description,
      ...(runUrl ? { target_url: runUrl } : {}),
    }),
  });
  if (!response.ok) {
    console.error(`${guardId}: status publication failed with HTTP ${response.status}`);
  }
}

await publishFirstViolation();
fail(guardId, violations);
