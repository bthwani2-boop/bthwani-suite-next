#!/usr/bin/env node
/**
 * Fail-closed frontend binding readiness preflight.
 *
 * Runtime profile endpoints/statuses are owned by
 * infra/docker/runtime-readiness.contract.json. Frontend-specific public URL
 * variables may override the host/base URL only when they are absolute HTTP(S)
 * URLs; relative same-origin BFF paths are ignored by this pre-start Node check.
 * Readiness paths and accepted status values always come from the contract.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractPath = path.join(repoRoot, "infra", "docker", "runtime-readiness.contract.json");
const allowWithoutBackend = process.env.BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND === "true";
const bundleArgIndex = process.argv.indexOf("--bundle");
const bundleArg = bundleArgIndex >= 0 ? process.argv[bundleArgIndex + 1]?.trim() : "";
if (bundleArgIndex >= 0 && !bundleArg) {
  console.error("frontend-binding-readiness: --bundle requires a non-empty value");
  process.exit(1);
}
const bundleName = bundleArg || process.env.BTHWANI_FRONTEND_READINESS_BUNDLE?.trim() || "frontendDefault";
const TIMEOUT_MS = 5_000;

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

function fail(message) {
  console.error(`frontend-binding-readiness: ${message}`);
  process.exit(1);
}

function readContract() {
  if (!fs.existsSync(contractPath)) fail(`missing ${path.relative(repoRoot, contractPath)}`);
  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  } catch (error) {
    fail(`invalid runtime readiness contract: ${error.message}`);
  }
  if (contract.schemaVersion !== 1) fail(`unsupported runtime readiness schemaVersion=${contract.schemaVersion}`);
  const profiles = contract.bundles?.[bundleName];
  if (!Array.isArray(profiles) || profiles.length === 0) {
    fail(`runtime readiness bundle '${bundleName}' is missing or empty`);
  }
  for (const profile of profiles) {
    if (!contract.profiles?.[profile]) fail(`bundle '${bundleName}' references unknown profile '${profile}'`);
  }
  return { contract, profiles };
}

const publicEnvPrefixByProfile = {
  identity: "IDENTITY",
  workforce: "WORKFORCE",
  dsh: "DSH",
  wlt: "WLT",
  providers: "PROVIDERS",
  platform: "PLATFORM_CONTROL",
};

function normalizeAbsoluteHttpUrl(value) {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? clean : "";
  } catch {
    return "";
  }
}

function resolveBaseUrl(profile, definition) {
  const publicPrefix = publicEnvPrefixByProfile[profile];
  const publicCandidates = publicPrefix
    ? [
        process.env[`NEXT_PUBLIC_${publicPrefix}_API_BASE_URL`],
        process.env[`EXPO_PUBLIC_${publicPrefix}_API_BASE_URL`],
      ]
    : [];
  const ownerEnv = definition.baseUrlEnv ? process.env[definition.baseUrlEnv] : undefined;
  return [...publicCandidates, ownerEnv, definition.defaultBaseUrl]
    .map(normalizeAbsoluteHttpUrl)
    .find(Boolean);
}

function resolveService(profile, definition) {
  if (definition.kind === "json-status") {
    const baseUrl = resolveBaseUrl(profile, definition);
    if (!baseUrl) fail(`profile '${profile}' has no resolvable absolute HTTP(S) base URL`);
    if (!definition.path || !Array.isArray(definition.healthyStatuses) || definition.healthyStatuses.length === 0) {
      fail(`profile '${profile}' has an incomplete json-status readiness definition`);
    }
    return {
      profile,
      name: definition.name || profile,
      kind: definition.kind,
      url: `${baseUrl.replace(/\/$/, "")}${definition.path}`,
      healthyStatuses: definition.healthyStatuses.map(String),
    };
  }

  if (definition.kind === "http-ok") {
    const port = String(
      (definition.portEnv ? process.env[definition.portEnv] : undefined) ?? definition.defaultPort ?? "",
    ).trim();
    const host = String(definition.host ?? "").trim();
    if (!host || !port || !definition.path) fail(`profile '${profile}' has an incomplete http-ok readiness definition`);
    return {
      profile,
      name: definition.name || profile,
      kind: definition.kind,
      url: `http://${host}:${port}${definition.path}`,
      healthyStatuses: [],
    };
  }

  fail(`profile '${profile}' uses unsupported readiness kind '${definition.kind}'`);
}

async function checkReadiness(service) {
  try {
    const response = await fetch(service.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    if (service.kind === "http-ok") return { ok: true };

    let body;
    try {
      body = await response.json();
    } catch (error) {
      return { ok: false, reason: `invalid readiness JSON: ${error.message}` };
    }
    const status = String(body?.status ?? "");
    if (!service.healthyStatuses.includes(status)) {
      return { ok: false, reason: `unexpected status '${status || "<missing>"}'` };
    }
    return { ok: true, status };
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, reason: `timeout (${TIMEOUT_MS}ms)` };
    }
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

const { contract, profiles } = readContract();
const services = profiles.map((profile) => resolveService(profile, contract.profiles[profile]));

console.log(`\n${BOLD}BThwani Frontend Binding Readiness Check${RESET}`);
console.log(`bundle: ${bundleName} [${profiles.join(", ")}]`);
console.log("─".repeat(64));

const results = await Promise.all(
  services.map(async (service) => ({ ...service, ...(await checkReadiness(service)) })),
);

let anyFailed = false;
for (const result of results) {
  if (result.ok) {
    const statusSuffix = result.status ? ` status=${result.status}` : "";
    console.log(`${GREEN}READY${RESET}  ${BOLD}${result.name.padEnd(20)}${RESET} → ${result.url}${statusSuffix}`);
  } else {
    console.log(`${RED}UNREADY${RESET}  ${BOLD}${result.name.padEnd(20)}${RESET} → ${result.url}`);
    console.log(`   Reason: ${result.reason}`);
    anyFailed = true;
  }
}
console.log("─".repeat(64));

if (anyFailed && !allowWithoutBackend) {
  console.log(`${RED}${BOLD}BLOCKED:${RESET} One or more required '${bundleName}' runtime profiles are not ready.`);
  console.log("  Start the governed runtime or set a narrower governed bundle only when the surface contract permits it.\n");
  process.exit(1);
}
if (anyFailed) {
  console.log(`${YELLOW}WARNING:${RESET} Required runtime profiles are unready, but BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND=true is set.`);
  console.log("  This is development-only reduced functionality and is not readiness evidence.\n");
  process.exit(0);
}

console.log(`${GREEN}${BOLD}Required runtime profiles are ready. Frontend may start.${RESET}\n`);
