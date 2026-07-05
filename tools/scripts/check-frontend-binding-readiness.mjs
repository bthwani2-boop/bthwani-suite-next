#!/usr/bin/env node
/**
 * check-frontend-binding-readiness.mjs
 *
 * Checks that all backend services are reachable before starting frontend surfaces.
 * Reads base URLs from env vars (same as the frontend resolvers).
 *
 * Usage:
 *   node tools/scripts/check-frontend-binding-readiness.mjs
 *
 * Exits 0 if all services are ready.
 * Exits 1 if any service is unreachable (unless BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND=true).
 *
 * Environment overrides:
 *   NEXT_PUBLIC_DSH_API_BASE_URL  or  EXPO_PUBLIC_DSH_API_BASE_URL
 *   NEXT_PUBLIC_WLT_API_BASE_URL  or  EXPO_PUBLIC_WLT_API_BASE_URL
 *   NEXT_PUBLIC_IDENTITY_API_BASE_URL  or  EXPO_PUBLIC_IDENTITY_API_BASE_URL
 *   BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND=true  — skip exit 1 (warn only)
 */

const allowWithoutBackend = process.env.BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND === "true";

function resolveUrl(nextKey, expoKey, legacyKey, defaultUrl) {
  return (
    process.env[nextKey]?.trim() ||
    process.env[expoKey]?.trim() ||
    (legacyKey ? process.env[legacyKey]?.trim() : undefined) ||
    defaultUrl
  );
}

const services = [
  {
    name: "DSH",
    baseUrl: resolveUrl(
      "NEXT_PUBLIC_DSH_API_BASE_URL",
      "EXPO_PUBLIC_DSH_API_BASE_URL",
      null,
      "http://localhost:58080",
    ),
    healthPath: "/dsh/health",
  },
  {
    name: "WLT",
    baseUrl: resolveUrl(
      "NEXT_PUBLIC_WLT_API_BASE_URL",
      "EXPO_PUBLIC_WLT_API_BASE_URL",
      "WLT_API_URL",
      "http://localhost:58083",
    ),
    healthPath: "/wlt/health",
  },
  {
    name: "Identity",
    baseUrl: resolveUrl(
      "NEXT_PUBLIC_IDENTITY_API_BASE_URL",
      "EXPO_PUBLIC_IDENTITY_API_BASE_URL",
      null,
      "http://localhost:58082",
    ),
    healthPath: "/identity/health",
  },
];

const TIMEOUT_MS = 5_000;
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

async function checkHealth(service) {
  const url = `${service.baseUrl.replace(/\/$/, "")}${service.healthPath}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      return { ok: true, url };
    }
    return { ok: false, url, reason: `HTTP ${res.status}` };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return { ok: false, url, reason: `timeout (${TIMEOUT_MS}ms)` };
    }
    return { ok: false, url, reason: e instanceof Error ? e.message : String(e) };
  }
}

console.log(`\n${BOLD}BThwani Frontend Binding Readiness Check${RESET}`);
console.log("─".repeat(50));

const results = await Promise.all(
  services.map(async (svc) => {
    const result = await checkHealth(svc);
    return { ...svc, ...result };
  }),
);

let anyFailed = false;
for (const r of results) {
  if (r.ok) {
    console.log(`${GREEN}✅ READY${RESET}  ${BOLD}${r.name.padEnd(10)}${RESET} → ${r.url}`);
  } else {
    console.log(`${RED}❌ UNREACHABLE${RESET}  ${BOLD}${r.name.padEnd(10)}${RESET} → ${r.url}`);
    console.log(`   Reason: ${r.reason}`);
    anyFailed = true;
  }
}

console.log("─".repeat(50));

if (anyFailed) {
  if (allowWithoutBackend) {
    console.log(
      `${YELLOW}⚠️  WARNING: Some backends are unreachable, but BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND=true is set.${RESET}`,
    );
    console.log("   Frontend will start with reduced functionality.\n");
    process.exit(0);
  } else {
    console.log(
      `${RED}${BOLD}BLOCKED:${RESET} Backend(s) not ready. Cannot start frontend surfaces.`,
    );
    console.log(
      `  Start the runtime: ${BOLD}pnpm runtime:up${RESET} or ${BOLD}pnpm runtime:reset${RESET}`,
    );
    console.log(
      `  To skip this check (dev only): ${BOLD}BTHWANI_ALLOW_FRONTEND_WITHOUT_BACKEND=true${RESET}\n`,
    );
    process.exit(1);
  }
} else {
  console.log(`${GREEN}${BOLD}All services are ready. Frontend may start.${RESET}\n`);
  process.exit(0);
}
