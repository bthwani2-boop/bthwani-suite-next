#!/usr/bin/env node
/**
 * Fail-closed frontend binding readiness preflight.
 *
 * Runtime profile endpoints/statuses are owned by
 * infra/docker/runtime-readiness.contract.json. Frontend-specific public URL
 * variables may override the host/base URL only when they are absolute HTTP(S)
 * URLs; relative same-origin BFF paths are ignored by this pre-start Node check.
 * Readiness paths and accepted status values always come from the contract.
 * Contract-owned network defaults are restricted to loopback destinations so a
 * repository-file change cannot redirect the preflight to an external host.
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

const httpOkPortEnvByProfile = {
  media: "BTHWANI_MINIO_API_PORT",
};

function isLoopbackHostname(hostname) {
  const normalized = String(hostname ?? "").trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "[::1]" || normalized === "::1";
}

function parseAbsoluteHttpUrl(value, label, { loopbackOnly = false } = {}) {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  let url;
  try {
    url = new URL(clean);
  } catch {
    fail(`${label} must be an absolute HTTP(S) URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(`${label} must use http or https`);
  }
  if (url.username || url.password) {
    fail(`${label} must not contain URL credentials`);
  }
  if (loopbackOnly && !isLoopbackHostname(url.hostname)) {
    fail(`${label} must remain on a loopback host; received '${url.hostname}'`);
  }
  return url.href.replace(/\/$/, "");
}

function isSameOriginPath(value) {
  const clean = String(value ?? "").trim();
  return (
    clean.startsWith("/") &&
    !clean.startsWith("//") &&
    !clean.includes("\\") &&
    !clean.includes("?") &&
    !clean.includes("#") &&
    !clean.includes("\0")
  );
}

function normalizeReadinessPath(profile, value) {
  const routePath = String(value ?? "").trim();
  if (
    !routePath.startsWith("/") ||
    routePath.startsWith("//") ||
    routePath.includes("\\") ||
    routePath.includes("?") ||
    routePath.includes("#") ||
    routePath.includes("\0")
  ) {
    fail(`profile '${profile}' has an unsafe readiness path '${routePath}'`);
  }
  return routePath;
}

function joinBaseAndPath(baseUrl, routePath) {
  const target = new URL(baseUrl);
  const basePath = target.pathname.replace(/\/+$/, "");
  target.pathname = `${basePath}${routePath}`;
  target.search = "";
  target.hash = "";
  return target.href;
}

function resolveBaseUrl(profile, definition) {
  const publicPrefix = publicEnvPrefixByProfile[profile];
  if (!publicPrefix) fail(`profile '${profile}' has no governed frontend URL prefix`);

  const expectedOwnerEnv = `${publicPrefix}_API_BASE_URL`;
  if (definition.baseUrlEnv !== expectedOwnerEnv) {
    fail(`profile '${profile}' must use governed baseUrlEnv '${expectedOwnerEnv}'`);
  }

  const candidates = [
    [`NEXT_PUBLIC_${publicPrefix}_API_BASE_URL`, process.env[`NEXT_PUBLIC_${publicPrefix}_API_BASE_URL`]],
    [`EXPO_PUBLIC_${publicPrefix}_API_BASE_URL`, process.env[`EXPO_PUBLIC_${publicPrefix}_API_BASE_URL`]],
    [expectedOwnerEnv, process.env[expectedOwnerEnv]],
  ];
  for (const [name, value] of candidates) {
    if (!String(value ?? "").trim()) continue;
    if ((name.startsWith("NEXT_PUBLIC_") || name.startsWith("EXPO_PUBLIC_")) && isSameOriginPath(value)) {
      continue;
    }
    return parseAbsoluteHttpUrl(value, name);
  }

  const governedDefault = parseAbsoluteHttpUrl(
    definition.defaultBaseUrl,
    `profile '${profile}' defaultBaseUrl`,
    { loopbackOnly: true },
  );
  if (!governedDefault) fail(`profile '${profile}' has no resolvable absolute HTTP(S) base URL`);
  return governedDefault;
}

function normalizePort(profile, definition) {
  const expectedPortEnv = httpOkPortEnvByProfile[profile];
  if (!expectedPortEnv) fail(`profile '${profile}' has no governed http-ok port environment variable`);
  if (definition.portEnv !== expectedPortEnv) {
    fail(`profile '${profile}' must use governed portEnv '${expectedPortEnv}'`);
  }
  const configured = process.env[expectedPortEnv];
  const rawPort = String(configured ?? definition.defaultPort ?? "").trim();
  if (!/^\d{1,5}$/.test(rawPort)) fail(`profile '${profile}' has an invalid http-ok port '${rawPort}'`);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`profile '${profile}' has an out-of-range http-ok port '${rawPort}'`);
  }
  return String(port);
}

function normalizeLoopbackHost(profile, value) {
  const host = String(value ?? "").trim().toLowerCase();
  if (host === "127.0.0.1") return "127.0.0.1";
  if (host === "localhost") return "localhost";
  if (host === "::1" || host === "[::1]") return "[::1]";
  fail(`profile '${profile}' http-ok host must remain loopback; received '${host || "<empty>"}'`);
}

function resolveService(profile, definition) {
  if (definition.kind === "json-status") {
    const baseUrl = resolveBaseUrl(profile, definition);
    const readinessPath = normalizeReadinessPath(profile, definition.path);
    if (!Array.isArray(definition.healthyStatuses) || definition.healthyStatuses.length === 0) {
      fail(`profile '${profile}' has an incomplete json-status readiness definition`);
    }
    return {
      profile,
      name: definition.name || profile,
      kind: definition.kind,
      url: joinBaseAndPath(baseUrl, readinessPath),
      healthyStatuses: definition.healthyStatuses.map(String),
    };
  }

  if (definition.kind === "http-ok") {
    const host = normalizeLoopbackHost(profile, definition.host);
    const port = normalizePort(profile, definition);
    const readinessPath = normalizeReadinessPath(profile, definition.path);
    return {
      profile,
      name: definition.name || profile,
      kind: definition.kind,
      url: `http://${host}:${port}${readinessPath}`,
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
