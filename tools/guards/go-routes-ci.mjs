#!/usr/bin/env node
/**
 * tools/guards/go-routes-ci.mjs
 *
 * Node.js equivalent of check-go-ast-extractor.ps1 — runs on Linux CI (ubuntu-latest)
 * without requiring PowerShell.
 *
 * Builds the Go AST extractor binary and runs it against DSH, WLT, and Identity
 * server files. Validates JSON array output and writes combined result.
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const guardId = "GO_ROUTES_CI";

const TARGETS = [
  { label: "DSH",      file: "services/dsh/backend/internal/http/server.go" },
  { label: "WLT",      file: "services/wlt/backend/internal/http/server.go" },
  { label: "Identity", file: "core/identity/backend/internal/http/server.go" },
];

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, encoding: "utf8", cwd: repoRoot, ...opts });
}

// 1. Verify Go is installed
const goVer = run("go version");
if (goVer.status !== 0) {
  console.error(`${guardId}: FAIL — Go is not installed or not in PATH`);
  process.exit(1);
}
console.log(`  go: ${goVer.stdout.trim()}`);

// 2. Build extractor binary
const tmpDir = path.join(os.tmpdir(), `bthwani-extractor-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
const binaryName = process.platform === "win32" ? "extract_routes.exe" : "extract_routes";
const binaryPath = path.join(tmpDir, binaryName);
const extractorSrc = path.join(repoRoot, "tools/guards/extract_routes.go");

if (!fs.existsSync(extractorSrc)) {
  console.error(`${guardId}: FAIL — extractor not found: tools/guards/extract_routes.go`);
  process.exit(1);
}

console.log("  Building extractor binary...");
const buildResult = run(`go build -o "${binaryPath}" "${extractorSrc}"`);
if (buildResult.status !== 0) {
  console.error(`${guardId}: FAIL — go build failed:\n${buildResult.stderr}`);
  process.exit(1);
}
console.log("  Extractor built OK");

// 3. Run extractor against each target
let fail = false;
const combinedRoutes = [];

for (const target of TARGETS) {
  const filePath = path.join(repoRoot, target.file);
  if (!fs.existsSync(filePath)) {
    console.error(`  [FAIL] GO_AST_ROUTES ${target.label}: router file missing: ${target.file}`);
    fail = true;
    continue;
  }

  const result = run(`"${binaryPath}" "${filePath}"`);
  if (result.status !== 0) {
    console.error(`  [FAIL] GO_AST_ROUTES ${target.label}: extractor error:\n${result.stderr}`);
    fail = true;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch (e) {
    console.error(`  [FAIL] GO_AST_ROUTES ${target.label}: output is not valid JSON — ${e.message}`);
    fail = true;
    continue;
  }

  if (!Array.isArray(parsed)) {
    console.error(`  [FAIL] GO_AST_ROUTES ${target.label}: output is not a JSON array`);
    fail = true;
    continue;
  }

  console.log(`  GO_AST_ROUTES ${target.label}: PASS routes=${parsed.length}`);
  combinedRoutes.push(...parsed);
}

// 4. Write combined output (best-effort — does not fail if .diagnostics is absent)
try {
  const diagDir = path.join(repoRoot, ".diagnostics/tools");
  fs.mkdirSync(diagDir, { recursive: true });
  fs.writeFileSync(
    path.join(diagDir, "go-routes.json"),
    JSON.stringify(combinedRoutes, null, 2),
    "utf8"
  );
  console.log(`  Combined routes written to .diagnostics/tools/go-routes.json (${combinedRoutes.length} total)`);
} catch {
  // Non-fatal — .diagnostics may be excluded in CI
}

if (fail) {
  console.error(`\n${guardId}: FAIL`);
  process.exit(1);
} else {
  console.log(`\n${guardId}: PASS`);
  process.exit(0);
}
