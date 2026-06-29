#!/usr/bin/env node
/**
 * DSH Platform Geo Provider Governance Gate
 *
 * Enforces:
 *   1. No maps/provider API keys inside DSH frontend surfaces or shared registry.
 *   2. No captain coordinates in app-client.
 *   3. No live tracking / heartbeat terminology in app-client.
 *   4. No watchPosition in app-captain or shared/geo.
 *   5. No process.env reads in surface component files.
 *   6. No real key values in shared/platform registry.
 *   7. WLT does not import DSH platform/geo modules.
 *   8. No getCaptainLocation in app-client.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const FRONTEND = join(ROOT, "services/dsh/frontend");
const WLT_DSH = join(ROOT, "services/wlt/frontend/shared/dsh");

const SURFACES = ["control-panel", "app-client", "app-partner", "app-field", "app-captain"];

let errors = 0;

function walkFiles(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkFiles(full, exts));
      else if (exts.some((e) => entry.name.endsWith(e))) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

function read(p) { try { return readFileSync(p, "utf8"); } catch { return ""; } }

function fail(filePath, msg) {
  console.error(`  ✗ ${relative(ROOT, filePath)}: ${msg}`);
  errors++;
}

// ── Rule 1: No real API key literals in any DSH frontend file ─────────────────
const REAL_KEY_PATTERNS = [
  { re: /AIza[A-Za-z0-9_\-]{30,}/, label: "Google API key literal (AIza…)" },
  { re: /sk_live_[A-Za-z0-9]{20,}/, label: "Stripe live key literal (sk_live_…)" },
  { re: /GOOGLE_MAPS_API_KEY\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "GOOGLE_MAPS_API_KEY hardcoded value" },
  { re: /MAPS_API_KEY\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "MAPS_API_KEY hardcoded value" },
  { re: /PAYMENT_SECRET\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "PAYMENT_SECRET hardcoded value" },
  { re: /HOSTING_TOKEN\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "HOSTING_TOKEN hardcoded value" },
  { re: /STORAGE_SECRET\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "STORAGE_SECRET hardcoded value" },
  { re: /SMS_SECRET\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "SMS_SECRET hardcoded value" },
  { re: /EMAIL_PASSWORD\s*=\s*["'][A-Za-z0-9_\-]{10,}["']/, label: "EMAIL_PASSWORD hardcoded value" },
];

for (const file of walkFiles(FRONTEND)) {
  const src = read(file);
  for (const { re, label } of REAL_KEY_PATTERNS) {
    if (re.test(src)) fail(file, `${label} — real credentials must never appear in frontend source`);
  }
}

// ── Rule 2: No captain coordinates in app-client ──────────────────────────────
const CLIENT_DIR = join(FRONTEND, "app-client");
const CAPTAIN_COORD_RES = [
  /captainLatitude/, /captainLongitude/, /getCaptainLocation/,
  /captainLat[^i]/, /captainLng/, /lastKnownCaptainLocation/, /captainMarker/, /routePolyline/,
];
for (const file of walkFiles(CLIENT_DIR)) {
  const src = read(file);
  for (const re of CAPTAIN_COORD_RES) {
    if (re.test(src)) fail(file, `Forbidden captain geo symbol (${re.source}) in app-client`);
  }
}

// ── Rule 3: No live tracking / real-time / heartbeat in app-client ────────────
const LIVE_RES = [
  { re: /live.?tracking/i, label: "live tracking" },
  { re: /real.?time.?tracking/i, label: "real-time tracking" },
  { re: /\bheartbeat\b/i, label: "heartbeat" },
];
for (const file of walkFiles(CLIENT_DIR)) {
  const src = read(file);
  for (const { re, label } of LIVE_RES) {
    if (re.test(src)) fail(file, `Forbidden live-tracking language (${label}) in app-client`);
  }
}

// ── Rule 4: No watchPosition or BackgroundGeolocation in app-captain / geo ────
const CAPTAIN_DIR = join(FRONTEND, "app-captain");
const GEO_DIR = join(FRONTEND, "shared", "geo");
for (const file of [...walkFiles(CAPTAIN_DIR), ...walkFiles(GEO_DIR)]) {
  const src = read(file);
  if (/\bwatchPosition\s*\(/.test(src)) fail(file, "watchPosition() call is forbidden — use server-controlled checkpoint intervals");
  if (/\bBackgroundGeolocation\b/.test(src)) fail(file, "BackgroundGeolocation is forbidden");
}

// ── Rule 5: No process.env in surface component files ─────────────────────────
for (const surface of SURFACES) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    if (/\bprocess\.env\b/.test(read(file))) {
      fail(file, "process.env in surface — env reads must go through shared/_kernel");
    }
  }
}

// ── Rule 6: No real secret values in shared/platform registry ─────────────────
const PLATFORM_DIR = join(FRONTEND, "shared", "platform");
for (const file of walkFiles(PLATFORM_DIR)) {
  const src = read(file);
  if (/AIza[A-Za-z0-9_\-]{30,}/.test(src)) fail(file, "Real Google Maps API key in shared/platform registry");
  if (/sk_live_[A-Za-z0-9]{20,}/.test(src)) fail(file, "Real Stripe live key in shared/platform registry");
}

// ── Rule 7: WLT must not import DSH platform/geo modules ──────────────────────
for (const file of walkFiles(WLT_DSH)) {
  const src = read(file);
  if (/shared\/platform/.test(src)) fail(file, "WLT imports DSH platform/provider config");
  if (/shared\/geo/.test(src)) fail(file, "WLT imports DSH geo module");
}

// ── Rule 8: No getCaptainLocation anywhere in app-client ──────────────────────
for (const file of walkFiles(CLIENT_DIR)) {
  if (/\bgetCaptainLocation\b/.test(read(file))) fail(file, "getCaptainLocation is forbidden in app-client");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n  DSH Platform Geo Provider Governance Gate");
if (errors === 0) {
  console.log("  ✓ PASS — no violations found");
} else {
  console.error(`  ✗ FAIL — ${errors} error(s)`);
  process.exit(1);
}
