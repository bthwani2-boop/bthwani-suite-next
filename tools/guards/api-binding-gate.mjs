/**
 * api-binding-gate.mjs
 *
 * Verifies that frontend API adapters respect the OpenAPI-first binding chain:
 *   OpenAPI contract → generated client/types → shared HTTP client → *.api.ts
 *
 * Checks:
 *   1. No raw fetch() calls in *.api.ts outside the approved HTTP clients
 *   2. No mock/fallback success patterns (Promise.resolve with hardcoded data)
 *   3. All /dsh/* and /wlt/* path literals in *.api.ts exist in the composed OpenAPI contracts
 *   4. No hardcoded non-localhost URLs in *.api.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "api-binding-gate";
const violations = [];

function loadOpenApiPaths(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return new Set();
  const content = fs.readFileSync(fullPath, "utf8");
  const paths = new Set();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^  (\/(?:dsh|wlt|identity|providers)[^\s:]+)\s*:/);
    if (match) paths.add(match[1]);
  }
  return paths;
}

const dshPaths = loadOpenApiPaths("services/dsh/contracts/dsh.openapi.yaml");
const dshCommercialPaths = loadOpenApiPaths("services/dsh/contracts/dsh.marketing-commercial.openapi.yaml");
const wltPaths = loadOpenApiPaths("services/wlt/contracts/wlt.openapi.yaml");
const identityPaths = loadOpenApiPaths("core/identity/contracts/auth.openapi.yaml");
const providersPaths = loadOpenApiPaths("core/providers/contracts/providers.openapi.yaml");

const knownPaths = [
  ...dshPaths,
  ...dshCommercialPaths,
  ...wltPaths,
  ...identityPaths,
  ...providersPaths,
];

function isKnownPath(rawPath) {
  const normalized = rawPath.replace(/\?.*$/, "").replace(/\$\{[^}]+\}/g, "{param}").replace(/`/g, "");
  for (const known of knownPaths) {
    const knownNorm = known.replace(/\{[^}]+\}/g, "{param}");
    if (knownNorm === normalized || known === rawPath) return true;
    if (normalized.startsWith(knownNorm)) return true;
  }
  return false;
}

const DSH_HTTP_CLIENT_PATTERN = /\bcreate(?:Dsh|DshPublic|DshFlexible|DshRaw)HttpClient\b/;
const WLT_HTTP_CLIENT_PATTERN = /\bwltFetchJson\b/;
const RAW_FETCH_PATTERN = /\bfetch\s*\(/g;
const MOCK_RESOLVE_PATTERN = /\breturn\s+Promise\.resolve\s*\(\s*[\[{]/;
const HARDCODED_URL_PATTERN = /https?:\/\/(?!localhost|127\.0\.0\.1|\.\.\.|example\.com)/;
const API_PATH_LITERAL = /[`'"](\/(?:dsh|wlt|identity|providers)\/[^`'"?\s]*)/g;

const apiFiles = listCodeFiles().filter((file) => {
  if (file.endsWith("-registry.ts")) return false;
  if (file.endsWith(".api.ts") || file.endsWith(".client.ts") || file.endsWith("api-client.ts") || file.endsWith("runtime-adapter.ts")) {
    return true;
  }
  const isSharedFile = /^services\/[^/]+\/frontend\/shared\//.test(file);
  if (isSharedFile) {
    try {
      const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
      if (content.includes("/dsh/") || content.includes("/wlt/") || content.includes("/identity/")) {
        return true;
      }
    } catch {
      // Ignore unreadable candidates; other repository gates report missing files.
    }
  }
  return false;
});

for (const file of apiFiles) {
  const content = read(file);
  const isDshAdapter = file.includes("services/dsh/") || file.includes("finance-wlt-link");
  const isWltAdapter = file.includes("services/wlt/");

  if (MOCK_RESOLVE_PATTERN.test(content)) {
    violations.push({
      file,
      message: "FORBIDDEN: Promise.resolve() with hardcoded data in adapter — mock/fallback success path not allowed",
    });
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
    if (HARDCODED_URL_PATTERN.test(line)) {
      violations.push({
        file,
        line: i + 1,
        message: `FORBIDDEN: hardcoded runtime URL in adapter: "${line.trim()}"`,
      });
    }
  }

  const usesApprovedClient =
    DSH_HTTP_CLIENT_PATTERN.test(content) || WLT_HTTP_CLIENT_PATTERN.test(content);
  const isMultipartUploadAdapter = content.includes("new FormData(");
  if (!usesApprovedClient && !isMultipartUploadAdapter) {
    const fetchMatches = [...content.matchAll(RAW_FETCH_PATTERN)];
    if (fetchMatches.length > 0) {
      violations.push({
        file,
        message: "FORBIDDEN: raw fetch() in adapter without approved HTTP client (createDsh*HttpClient or wltFetchJson)",
      });
    }
  }

  if (isDshAdapter || isWltAdapter) {
    let match;
    API_PATH_LITERAL.lastIndex = 0;
    while ((match = API_PATH_LITERAL.exec(content)) !== null) {
      const rawPath = match[1];
      if (/^\/(?:dsh|wlt|identity|providers)\/\$\{/.test(rawPath)) continue;
      if (!isKnownPath(rawPath)) {
        violations.push({
          file,
          message: `UNREGISTERED PATH: "${rawPath}" not found in composed OpenAPI contracts — ensure endpoint is documented`,
        });
      }
    }
  }
}

fail(guardId, violations);
