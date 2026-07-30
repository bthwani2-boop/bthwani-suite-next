// Scans every evidence manifest.json under .diagnostics/** (if present) and fails if
// its recorded sourceSha differs from the current HEAD — stale evidence is not
// evidence. This is the exact-SHA gate: no closure may rest on a prior commit's run.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "same-commit-evidence-gate";
const violations = [];
const evidenceRoot = path.join(repoRoot, ".diagnostics");

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function findManifests(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findManifests(full, found);
      continue;
    }
    if (entry.name === "manifest.json") found.push(full);
  }
  return found;
}

const head = headSha();
if (!head) {
  violations.push({ file: ".git", line: 0, message: "HEAD_SHA_UNRESOLVED" });
} else {
  for (const manifestPath of findManifests(evidenceRoot)) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
      violations.push({ file: path.relative(repoRoot, manifestPath), line: 0, message: `INVALID_JSON ${error.message}` });
      continue;
    }
    const relative = path.relative(repoRoot, manifestPath).replaceAll("\\", "/");
    if (!manifest.sourceSha) {
      violations.push({ file: relative, line: 0, message: "MANIFEST_MISSING_SOURCE_SHA" });
    } else if (manifest.sourceSha !== head) {
      violations.push({ file: relative, line: 0, message: `EVIDENCE_NOT_ON_CURRENT_HEAD manifest=${manifest.sourceSha} head=${head}` });
    }
  }
}

fail(guardId, violations);
