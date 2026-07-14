/**
 * api-binding-gate.mjs
 *
 * Verifies that frontend API adapters respect the OpenAPI-first binding chain:
 *   OpenAPI contract → generated client/types → shared HTTP client → *.api.ts
 *
 * Checks:
 *   1. No raw fetch() calls in *.api.ts outside the approved HTTP clients
 *   2. No mock/fallback success patterns (Promise.resolve with hardcoded data)
 *   3. All /dsh/* and /wlt/* path literals in *.api.ts exist in the OpenAPI contract
 *   4. No hardcoded non-localhost URLs in *.api.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "api-binding-gate";
const violations = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadOpenApiPaths(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return new Set();
  const content = fs.readFileSync(fullPath, "utf8");
  const paths = new Set();
  // Extract path keys: lines starting with "  /dsh/" or "  /wlt/" or "  /identity/"
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^  (\/(?:dsh|wlt|identity|providers)[^\s:]+)\s*:/);
    if (m) paths.add(m[1]);
  }
  return paths;
}

// Load known OpenAPI paths
const dshPaths = loadOpenApiPaths("services/dsh/contracts/dsh.openapi.yaml");
const wltPaths = loadOpenApiPaths("services/wlt/contracts/wlt.openapi.yaml");
const identityPaths = loadOpenApiPaths("core/identity/contracts/auth.openapi.yaml");
const providersPaths = loadOpenApiPaths("core/providers/contracts/providers.openapi.yaml");

function isKnownPath(rawPath) {
  // Strip query string and template params for matching
  const normalized = rawPath.replace(/\?.*$/, "").replace(/\$\{[^}]+\}/g, "{param}").replace(/`/g, "");
  // Try exact match first, then param-normalized match
  for (const known of [...dshPaths, ...wltPaths, ...identityPaths, ...providersPaths]) {
    const knownNorm = known.replace(/\{[^}]+\}/g, "{param}");
    if (knownNorm === normalized || known === rawPath) return true;
    // prefix match for paths with trailing query params still in the literal
    if (normalized.startsWith(knownNorm)) return true;
  }
  return false;
}

// ─── Approved HTTP client factories ─────────────────────────────────────────

// DSH adapters must use createDsh*HttpClient or createDshPublicHttpClient
const DSH_HTTP_CLIENT_PATTERN = /\bcreate(?:Dsh|DshPublic|DshFlexible|DshRaw)HttpClient\b/;
// WLT adapters must use wltFetchJson
const WLT_HTTP_CLIENT_PATTERN = /\bwltFetchJson\b/;

// ─── Forbidden patterns ──────────────────────────────────────────────────────

// Raw fetch in .api.ts that is NOT inside a createDsh* or wltFetchJson wrapper
// We check per-file: if file uses approved client, any remaining fetch() is suspicious
const RAW_FETCH_PATTERN = /\bfetch\s*\(/g;

// Mock/fallback: Promise.resolve with an object literal return (fake success)
// Matches: return Promise.resolve({ ... }) or return Promise.resolve([...])
const MOCK_RESOLVE_PATTERN = /\breturn\s+Promise\.resolve\s*\(\s*[\[{]/;

// Hardcoded non-localhost http(s) URL in adapter
const HARDCODED_URL_PATTERN = /https?:\/\/(?!localhost|127\.0\.0\.1|\.\.\.|example\.com)/;

// ─── Path literal extraction ─────────────────────────────────────────────────

// Extract string literals that look like API paths: `/dsh/...` or `/wlt/...` etc.
const API_PATH_LITERAL = /[`'"](\/(?:dsh|wlt|identity|providers)\/[^`'"?\s]*)/g;

// ─── Main scan ───────────────────────────────────────────────────────────────

const apiFiles = listCodeFiles().filter((f) => {
  // Navigation registries define UI route hrefs (e.g. "/dsh/finance"), not
  // API endpoints — they are not adapters and are excluded from this gate.
  if (f.endsWith("-registry.ts")) return false;
  if (f.endsWith(".api.ts") || f.endsWith(".client.ts") || f.endsWith("api-client.ts") || f.endsWith("runtime-adapter.ts")) {
    return true;
  }
  const isSharedFile = /^services\/[^/]+\/frontend\/shared\//.test(f);
  if (isSharedFile) {
    try {
      const content = fs.readFileSync(path.join(repoRoot, f), "utf8");
      if (content.includes("/dsh/") || content.includes("/wlt/") || content.includes("/identity/")) {
        return true;
      }
    } catch {
      // Ignore if cannot read
    }
  }
  return false;
});

for (const file of apiFiles) {
  const content = read(file);
  const isDshAdapter = file.includes("services/dsh/") || file.includes("finance-wlt-link");
  const isWltAdapter = file.includes("services/wlt/");

  // 1. Mock/fallback success pattern
  if (MOCK_RESOLVE_PATTERN.test(content)) {
    violations.push({
      file,
      message: "FORBIDDEN: Promise.resolve() with hardcoded data in adapter — mock/fallback success path not allowed",
    });
  }

  // 2. Hardcoded runtime URL
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

  // 3. Raw fetch() without approved HTTP client
  const usesApprovedClient =
    DSH_HTTP_CLIENT_PATTERN.test(content) || WLT_HTTP_CLIENT_PATTERN.test(content);

  // Multipart upload adapters (FormData) cannot use the JSON kernel client;
  // their single fetch() call is the approved binary-upload transport.
  const isMultipartUploadAdapter = content.includes("new FormData(");
  if (!usesApprovedClient && !isMultipartUploadAdapter) {
    const fetchMatches = [...content.matchAll(RAW_FETCH_PATTERN)];
    if (fetchMatches.length > 0) {
      violations.push({
        file,
        message: `FORBIDDEN: raw fetch() in adapter without approved HTTP client (createDsh*HttpClient or wltFetchJson)`,
      });
    }
  }

  // 4. Path literals vs OpenAPI contract
  // Only check DSH and WLT adapters for now (identity adapters use generated client directly)
  if (isDshAdapter || isWltAdapter) {
    let match;
    API_PATH_LITERAL.lastIndex = 0;
    while ((match = API_PATH_LITERAL.exec(content)) !== null) {
      const rawPath = match[1];
      // Skip dynamic segments that are template literals with only params
      if (/^\/(?:dsh|wlt|identity|providers)\/\$\{/.test(rawPath)) continue;
      if (!isKnownPath(rawPath)) {
        violations.push({
          file,
          message: `UNREGISTERED PATH: "${rawPath}" not found in OpenAPI contract — ensure endpoint is documented`,
        });
      }
    }
  }
}

fail(guardId, violations);
